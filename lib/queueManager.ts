import { MatchQueue, QueueEntry, Room, Player, GameState } from '@/types';
import { readQueue, writeQueue, updateQueue, readConfig, addRoom, addGame, readRooms, updateRoom } from './database';
import { generateCardHand } from './gameLogic';

// Get or create queue
// NOTE: This function reads without a lock, so it may return slightly stale data.
// For critical operations, use updateQueue() instead.
export async function getQueue(): Promise<MatchQueue> {
  const queue = await readQueue();
  
  if (!queue) {
    const newQueue: MatchQueue = {
      id: 'queue-main',
      entries: [],
      maxPlayers: 28,
      status: 'waiting',
      createdAt: Date.now(),
    };
    await writeQueue(newQueue);
    return newQueue;
  }
  
  // Clean up old entries that don't have ipAddress (migration)
  // Use updateQueue to ensure atomic operation
  const hasOldEntries = queue.entries.some(e => !('ipAddress' in e));
  if (hasOldEntries) {
    const result = await updateQueue(async (q) => {
      if (!q) return null;
      q.entries = q.entries.filter(e => 'ipAddress' in e && e.ipAddress);
      return q;
    });
    if (result && 'entries' in result) {
      return result;
    }
  }
  
  return queue;
}

// Clean up stale queue entries (entries with disconnected sockets)
export async function cleanupStaleQueueEntries(
  isSocketConnected?: (socketId: string) => boolean
): Promise<{ removed: number }> {
  if (!isSocketConnected) {
    // Can't clean up without socket checker
    return { removed: 0 };
  }

  let removedCount = 0;
  const result = await updateQueue(async (queue) => {
    if (!queue) return null;
    
    const initialCount = queue.entries.length;
    // Remove entries where socket is no longer connected
    queue.entries = queue.entries.filter(entry => {
      if (!entry.socketId) {
        // Remove entries without socket ID (old/stale)
        return false;
      }
      // Keep entry if socket is still connected
      return isSocketConnected(entry.socketId);
    });
    
    removedCount = initialCount - queue.entries.length;
    if (removedCount > 0) {
      console.log(`[cleanupStaleQueueEntries] Removed ${removedCount} stale entries`);
    }
    
    return queue;
  });

  if (result && 'entries' in result) {
    return { removed: removedCount };
  }
  
  return { removed: 0 };
}

// Join queue
export async function joinQueue(
  playerName: string,
  socketId: string,
  ipAddress: string,
  isSocketConnected?: (socketId: string) => boolean // Function to check if socket is still connected
): Promise<{ success: boolean; entry?: QueueEntry; queue?: MatchQueue; room?: Room; player?: Player; error?: string }> {
  // Validate input
  if (!playerName || typeof playerName !== 'string') {
    return { success: false, error: 'Invalid player name' };
  }
  
  if (!ipAddress || typeof ipAddress !== 'string') {
    return { success: false, error: 'Invalid IP address' };
  }
  
  const trimmedName = playerName.trim();
  if (trimmedName.length === 0 || trimmedName.length > 50) {
    return { success: false, error: 'Player name must be between 1 and 50 characters' };
  }

  // First, check if player is already in an active room (by IP)
  const rooms = await readRooms();
  const activeRoom = rooms.find(room => {
    if (room.status === 'finished' || !room.gameState) return false;
    // Check if any player in the room matches this IP
    // Note: We can't directly check IP from room, so we check by playerId from queue
    return false; // Will handle this differently
  });

  // Clean up stale entries before joining (but only if we have socket checker)
  if (isSocketConnected) {
    await cleanupStaleQueueEntries(isSocketConnected);
  }

  const result = await updateQueue(async (queue) => {
    if (!queue) {
      queue = {
        id: 'queue-main',
        entries: [],
        maxPlayers: 28,
        status: 'waiting',
        createdAt: Date.now(),
      };
    }
    
    // Clean up entries with disconnected sockets (double-check within lock)
    if (isSocketConnected) {
      const initialCount = queue.entries.length;
      queue.entries = queue.entries.filter(entry => {
        if (!entry.socketId) {
          return false; // Remove entries without socket ID
        }
        return isSocketConnected(entry.socketId); // Keep only connected sockets
      });
      const removed = initialCount - queue.entries.length;
      if (removed > 0) {
        console.log(`[joinQueue] Cleaned up ${removed} stale entries during join`);
      }
    }
    
    // Check if queue is full
    if (queue.entries.length >= queue.maxPlayers) {
      throw new Error('Queue is full');
    }
    
    // Check if this socket ID is already in queue (reconnection case)
    const existingEntryBySocket = queue.entries.find(
      e => e.socketId === socketId
    );
    
    if (existingEntryBySocket) {
      // Same socket reconnecting - update name and IP
      existingEntryBySocket.playerName = trimmedName;
      existingEntryBySocket.ipAddress = ipAddress;
      return queue;
    }
    
    // IMPORTANT: With ngrok/proxy, all players have the same IP, so we CANNOT use IP
    // to prevent duplicates. We only check by socket ID.
    // The disconnect handler will clean up entries when sockets disconnect.
    // We don't do cleanup here to avoid race conditions and accidentally removing valid entries.
    
    // Check if this socket ID is assigned to an active room (shouldn't happen, but safety check)
    const entryInActiveRoom = queue.entries.find(
      e => e.socketId === socketId && e.assignedRoomId
    );
    
    if (entryInActiveRoom && entryInActiveRoom.assignedRoomId) {
      const room = rooms.find(r => r.id === entryInActiveRoom.assignedRoomId);
      if (room && room.status !== 'finished' && room.gameState) {
        const player = room.gameState.players.find(p => p.id === entryInActiveRoom.playerId);
        if (player) {
          // Update entry with new socket and name
          entryInActiveRoom.socketId = socketId;
          entryInActiveRoom.playerName = trimmedName;
          entryInActiveRoom.ipAddress = ipAddress;
          throw new Error('PLAYER_IN_ACTIVE_ROOM'); // Special error to signal active room
        }
      }
    }
    
    // Check if queue is in matching/matched state
    if (queue.status !== 'waiting') {
      throw new Error('Matching in progress. Please wait for current match to complete.');
    }
    
    // Add new entry
    const newEntry: QueueEntry = {
      playerId: `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      playerName: trimmedName,
      ipAddress,
      joinedAt: Date.now(),
      socketId,
    };
    
    const joinId = `JOIN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[${joinId}] [joinQueue] BEFORE adding entry. Current entries: ${queue.entries.length}`);
    console.log(`[${joinId}] [joinQueue] Existing entries:`, queue.entries.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
    console.log(`[${joinId}] [joinQueue] Adding new entry:`, { name: trimmedName, socket: socketId, ip: ipAddress, playerId: newEntry.playerId });
    queue.entries.push(newEntry);
    console.log(`[${joinId}] [joinQueue] AFTER adding entry. Total entries: ${queue.entries.length}`);
    console.log(`[${joinId}] [joinQueue] All entries now:`, queue.entries.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    const errorMessage = result && 'error' in result && result.error ? result.error : 'Failed to join queue';
    
    // Handle special case: player is in active room
    if (errorMessage === 'PLAYER_IN_ACTIVE_ROOM') {
      const queue = await getQueue();
      const entry = queue.entries.find(e => e.ipAddress === ipAddress && e.assignedRoomId);
      if (entry && entry.assignedRoomId) {
        const rooms = await readRooms();
        const room = rooms.find(r => r.id === entry.assignedRoomId);
        if (room && room.gameState) {
          const player = room.gameState.players.find(p => p.id === entry.playerId);
          if (player) {
            return { 
              success: false, 
              error: 'Bạn đang trong một trận đấu đang diễn ra. Vui lòng sử dụng nút "Kết Nối Lại" để vào lại phòng.',
              room,
              player
            };
          }
        }
      }
    }
    
    return { success: false, error: errorMessage };
  }
  
  // Type guard: result is MatchQueue
  if ('entries' in result) {
    const entry = result.entries.find(e => e.socketId === socketId);
    if (!entry) {
      // Entry not found - this shouldn't happen, but log for debugging
      console.error('Entry not found after join. Queue entries:', result.entries.map(e => ({ name: e.playerName, socket: e.socketId })));
      return { success: false, error: 'Entry not found after joining queue' };
    }
    // Return the full queue so server can broadcast it directly
    return { success: true, entry, queue: result };
  }
  
  return { success: false, error: 'Invalid queue state' };
}

// Leave queue by player ID
export async function leaveQueue(playerId: string): Promise<{ success: boolean; error?: string }> {
  const result = await updateQueue(async (queue) => {
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    // Allow leaving queue regardless of status - players should always be able to leave
    // Only check if player is actually in the queue
    const playerIndex = queue.entries.findIndex(e => e.playerId === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found in queue');
    }
    
    queue.entries = queue.entries.filter(e => e.playerId !== playerId);
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    return { success: false, error: result && 'error' in result ? result.error : 'Failed to leave queue' };
  }
  
  return { success: true };
}

// Leave queue by player name (fallback) - WARNING: This removes ALL entries with that name
// Should only be used as last resort. Prefer using playerId or socketId.
export async function leaveQueueByName(playerName: string, socketId?: string): Promise<{ success: boolean; error?: string }> {
  const trimmedName = playerName.trim();
  const result = await updateQueue(async (queue) => {
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    // If socketId is provided, try to match by socketId first (more precise)
    if (socketId) {
      const entryBySocket = queue.entries.find(e => e.socketId === socketId);
      if (entryBySocket) {
        // Remove only this specific entry
        queue.entries = queue.entries.filter(e => e.socketId !== socketId);
        return queue;
      }
    }
    
    // Fallback: match by name (removes ALL entries with that name - use with caution!)
    const playerIndex = queue.entries.findIndex(
      e => e.playerName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (playerIndex === -1) {
      throw new Error('Player not found in queue');
    }
    
    // WARNING: This removes ALL players with the same name
    // In production, you might want to only remove the first one or require socketId
    queue.entries = queue.entries.filter(
      e => e.playerName.toLowerCase() !== trimmedName.toLowerCase()
    );
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    return { success: false, error: result && 'error' in result ? result.error : 'Failed to leave queue' };
  }
  
  return { success: true };
}

// Leave queue by IP address
export async function leaveQueueByIP(ipAddress: string): Promise<{ success: boolean; error?: string }> {
  const result = await updateQueue(async (queue) => {
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    // Allow leaving queue regardless of status
    const playerIndex = queue.entries.findIndex(e => e.ipAddress === ipAddress);
    if (playerIndex === -1) {
      throw new Error('Player not found in queue');
    }
    
    queue.entries = queue.entries.filter(e => e.ipAddress !== ipAddress);
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    return { success: false, error: result && 'error' in result && result.error ? result.error : 'Failed to leave queue' };
  }
  
  return { success: true };
}

// Leave queue by socket ID (for disconnect handling)
export async function leaveQueueBySocketId(socketId: string): Promise<{ success: boolean; error?: string }> {
  const result = await updateQueue(async (queue) => {
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    // Allow leaving queue regardless of status
    const playerIndex = queue.entries.findIndex(e => e.socketId === socketId);
    if (playerIndex === -1) {
      throw new Error('Player not found in queue');
    }
    
    queue.entries = queue.entries.filter(e => e.socketId !== socketId);
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    return { success: false, error: result && 'error' in result ? result.error : 'Failed to leave queue' };
  }
  
  return { success: true };
}

// Reconnect player - find their assigned room or rejoin queue by IP or socket ID
export async function reconnectPlayer(
  ipAddress: string,
  socketId: string,
  newPlayerName?: string
): Promise<{ success: boolean; room?: Room; player?: Player; error?: string }> {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return { success: false, error: 'Invalid IP address' };
  }
  
  const queue = await getQueue();
  const rooms = await readRooms();
  
  // First try to find by IP (in case socket ID changed)
  // But prioritize entries that are assigned to rooms
  let queueEntry = queue.entries.find(e => e.ipAddress === ipAddress && e.assignedRoomId);
  
  // If not found by IP with room, try any entry with this IP
  if (!queueEntry) {
    queueEntry = queue.entries.find(e => e.ipAddress === ipAddress);
  }
  
  if (queueEntry) {
    // Update socket ID, IP, and optionally name
    await updateQueue(async (q) => {
      if (q) {
        const entry = q.entries.find(e => e.playerId === queueEntry!.playerId);
        if (entry) {
          entry.socketId = socketId;
          entry.ipAddress = ipAddress; // Update IP in case it changed
          if (newPlayerName) {
            entry.playerName = newPlayerName.trim();
          }
        }
      }
      return q;
    });
    
    // If player is assigned to a room, check if room is still active
    if (queueEntry.assignedRoomId) {
      const room = rooms.find(r => r.id === queueEntry!.assignedRoomId);
      if (room && room.status !== 'finished' && room.gameState) {
        const player = room.gameState.players.find(p => p.id === queueEntry!.playerId);
        if (player) {
          // Update player name in room if changed
          if (newPlayerName && newPlayerName.trim() !== player.name) {
            player.name = newPlayerName.trim();
            await updateRoom(room.id, { gameState: room.gameState });
          }
          return { success: true, room, player };
        }
      }
    }
    
    // Player is in queue but not assigned to room yet
    return { success: true };
  }
  
  return { success: false, error: 'No active game or queue entry found for this IP address' };
}

// Start matching - randomly pair players
export async function startMatching(): Promise<{ success: boolean; roomsCreated: number; queueEntries?: QueueEntry[]; error?: string }> {
  const result = await updateQueue(async (queue) => {
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    if (queue.status !== 'waiting') {
      throw new Error('Matching already in progress or completed');
    }
    
    const playerCount = queue.entries.length;
    
    if (playerCount < 2) {
      throw new Error('Need at least 2 players to start matching');
    }
    
    if (playerCount % 2 !== 0) {
      throw new Error('Need an even number of players to start matching');
    }
    
    // Set status to matching
    queue.status = 'matching';
    queue.matchedAt = Date.now();
    
    return queue;
  });
  
  if (!result || ('error' in result && result.error)) {
    return { success: false, roomsCreated: 0, error: result && 'error' in result && result.error ? result.error : 'Invalid queue state' };
  }
  
  if (!('entries' in result)) {
    return { success: false, roomsCreated: 0, error: 'Invalid queue state' };
  }
  
  // Randomly shuffle and pair players
  const entries = [...result.entries];
  
  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  
  const config = await readConfig();
  const roomsCreated: Room[] = [];
  
  // Pair players (2 per room)
  for (let i = 0; i < entries.length; i += 2) {
    const player1Entry = entries[i];
    const player2Entry = entries[i + 1];
    
    // Create players
    const player1: Player = {
      id: player1Entry.playerId,
      name: player1Entry.playerName,
      team: 'red',
      health: config.defaultPlayerHealth,
      maxHealth: config.defaultPlayerHealth,
      cards: generateCardHand(config.cardsPerPlayer),
      score: 0,
      ready: false,
    };
    
    const player2: Player = {
      id: player2Entry.playerId,
      name: player2Entry.playerName,
      team: 'blue',
      health: config.defaultPlayerHealth,
      maxHealth: config.defaultPlayerHealth,
      cards: generateCardHand(config.cardsPerPlayer),
      score: 0,
      ready: false,
    };
    
    // Create game state
    const gameState: GameState = {
      id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      roomId: `room-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      players: [player1, player2],
      currentTurn: 'red',
      turnNumber: 1,
      status: 'waiting',
      winner: null,
      startTime: null,
      endTime: null,
      history: [],
      passiveEffects: [],
    };
    
    // Create room
    const room: Room = {
      id: gameState.roomId,
      name: `${player1.name} vs ${player2.name}`,
      players: [player1, player2],
      maxPlayers: 2,
      status: 'waiting',
      gameState,
      createdAt: Date.now(),
    };
    
    await addRoom(room);
    await addGame(gameState);
    
    // Update queue entries with assigned room
    player1Entry.assignedRoomId = room.id;
    player2Entry.assignedRoomId = room.id;
    
    roomsCreated.push(room);
  }
  
  // Mark queue as matched (but keep entries for notification)
  await updateQueue(async (queue) => {
    if (queue) {
      queue.status = 'matched';
      // Don't clear entries yet - server needs them for notification
    }
    return queue;
  });
  
  return { success: true, roomsCreated: roomsCreated.length, queueEntries: entries };
}

