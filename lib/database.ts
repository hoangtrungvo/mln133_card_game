import fs from 'fs/promises';
import path from 'path';
import { Room, GameState, LeaderboardEntry, AdminConfig, Database, MatchQueue } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// File paths
const FILES = {
  rooms: path.join(DATA_DIR, 'rooms.json'),
  games: path.join(DATA_DIR, 'games.json'),
  leaderboard: path.join(DATA_DIR, 'leaderboard.json'),
  config: path.join(DATA_DIR, 'config.json'),
  queue: path.join(DATA_DIR, 'queue.json'),
};

// Lock mechanism to prevent concurrent writes
const locks: { [key: string]: boolean } = {};

async function acquireLock(key: string): Promise<void> {
  while (locks[key]) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  locks[key] = true;
}

function releaseLock(key: string): void {
  locks[key] = false;
}

// Read operations
export async function readRooms(): Promise<Room[]> {
  try {
    const data = await fs.readFile(FILES.rooms, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function readGames(): Promise<GameState[]> {
  try {
    const data = await fs.readFile(FILES.games, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const data = await fs.readFile(FILES.leaderboard, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function readConfig(): Promise<AdminConfig> {
  try {
    const data = await fs.readFile(FILES.config, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      maxRooms: 5,
      defaultPlayerHealth: 100,
      cardsPerPlayer: 5,
      enableLeaderboard: true,
      maxQueueSize: 28,
    };
  }
}

// Queue operations
export async function readQueue(): Promise<MatchQueue | null> {
  try {
    const data = await fs.readFile(FILES.queue, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function writeQueue(queue: MatchQueue | null): Promise<void> {
  await acquireLock('queue');
  try {
    await fs.writeFile(FILES.queue, JSON.stringify(queue, null, 2));
  } finally {
    releaseLock('queue');
  }
}

export async function updateQueue(
  callback: (queue: MatchQueue | null) => Promise<MatchQueue | null> | MatchQueue | null
): Promise<MatchQueue | null | { error: string }> {
  const updateId = `UPDATE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[${updateId}] [updateQueue] ACQUIRING LOCK...`);
  await acquireLock('queue');
  console.log(`[${updateId}] [updateQueue] LOCK ACQUIRED`);
  try {
    const currentQueue = await readQueue();
    console.log(`[${updateId}] [updateQueue] Read queue with ${currentQueue?.entries?.length || 0} entries:`, currentQueue?.entries?.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
    const updatedQueue = await callback(currentQueue);
    if (!updatedQueue) {
      throw new Error('Callback returned null queue');
    }
    console.log(`[${updateId}] [updateQueue] Updated queue has ${updatedQueue.entries?.length || 0} entries:`, updatedQueue.entries?.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
    // Ensure we write the complete queue
    const queueJson = JSON.stringify(updatedQueue, null, 2);
    console.log(`[${updateId}] [updateQueue] Writing queue to file. JSON length: ${queueJson.length} bytes`);
    await fs.writeFile(FILES.queue, queueJson, 'utf-8');
    // Small delay to ensure file system has written the data
    await new Promise(resolve => setTimeout(resolve, 10));
    // Verify the write by reading it back (within the lock)
    const verifyQueue = await readQueue();
    console.log(`[${updateId}] [updateQueue] Verified write - file has ${verifyQueue?.entries?.length || 0} entries:`, verifyQueue?.entries?.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
    
    // CRITICAL CHECK: Ensure all entries are preserved
    if (verifyQueue && verifyQueue.entries.length !== updatedQueue.entries.length) {
      console.error(`[${updateId}] [updateQueue] CRITICAL: Entry count mismatch! Expected ${updatedQueue.entries.length}, got ${verifyQueue.entries.length}`);
      console.error(`[${updateId}] [updateQueue] Expected entries:`, updatedQueue.entries.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
      console.error(`[${updateId}] [updateQueue] Actual entries:`, verifyQueue.entries.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
      // Return the updated queue we intended to write, not the corrupted one
      return updatedQueue;
    }
    
    console.log(`[${updateId}] [updateQueue] RELEASING LOCK`);
    return updatedQueue;
  } catch (error: any) {
    console.error(`[${updateId}] [updateQueue] Error:`, error);
    return { error: error.message || 'Failed to update queue' };
  } finally {
    releaseLock('queue');
    console.log(`[${updateId}] [updateQueue] LOCK RELEASED`);
  }
}

// Write operations with locking
export async function writeRooms(rooms: Room[]): Promise<void> {
  await acquireLock('rooms');
  try {
    await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
  } finally {
    releaseLock('rooms');
  }
}

export async function writeGames(games: GameState[]): Promise<void> {
  await acquireLock('games');
  try {
    await fs.writeFile(FILES.games, JSON.stringify(games, null, 2));
  } finally {
    releaseLock('games');
  }
}

export async function writeLeaderboard(leaderboard: LeaderboardEntry[]): Promise<void> {
  await acquireLock('leaderboard');
  try {
    await fs.writeFile(FILES.leaderboard, JSON.stringify(leaderboard, null, 2));
  } finally {
    releaseLock('leaderboard');
  }
}

export async function writeConfig(config: AdminConfig): Promise<void> {
  await acquireLock('config');
  try {
    await fs.writeFile(FILES.config, JSON.stringify(config, null, 2));
  } finally {
    releaseLock('config');
  }
}

// Utility operations
type RoomUpdateCallback = (room: Room | null) => Promise<Room | null> | Room | null;

export async function updateRoom(
  roomId: string, 
  updatesOrCallback: Partial<Room> | RoomUpdateCallback
): Promise<Room | null | { error: string }> {
  await acquireLock('rooms');
  try {
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    
    if (roomIndex === -1) {
      // If callback, call it with null to handle room not found
      if (typeof updatesOrCallback === 'function') {
        try {
          const result = await updatesOrCallback(null);
          return result;
        } catch (error: any) {
          return { error: error.message || 'Room not found' };
        }
      }
      return null;
    }
    
    const currentRoom = rooms[roomIndex];
    
    // Handle callback function for atomic updates
    if (typeof updatesOrCallback === 'function') {
      try {
        const updatedRoom = await updatesOrCallback(currentRoom);
        
        // If callback returns null, delete the room
        if (updatedRoom === null) {
          rooms.splice(roomIndex, 1);
          await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
          return null;
        }
        
        // Update the room
        rooms[roomIndex] = updatedRoom;
        await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
        return updatedRoom;
      } catch (error: any) {
        return { error: error.message || 'Failed to update room' };
      }
    }
    
    // Handle simple partial update (backward compatibility)
    rooms[roomIndex] = { ...rooms[roomIndex], ...updatesOrCallback };
    await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
    
    return rooms[roomIndex];
  } catch (error: any) {
    console.error('Error updating room:', error);
    return { error: error.message || 'Database error' };
  } finally {
    releaseLock('rooms');
  }
}

export async function updateGame(gameId: string, updates: Partial<GameState>): Promise<GameState | null> {
  await acquireLock('games');
  try {
    const games = await readGames();
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) {
      return null;
    }
    
    games[gameIndex] = { ...games[gameIndex], ...updates };
    await fs.writeFile(FILES.games, JSON.stringify(games, null, 2));
    
    return games[gameIndex];
  } finally {
    releaseLock('games');
  }
}

export async function addRoom(room: Room): Promise<void> {
  await acquireLock('rooms');
  try {
    const rooms = await readRooms();
    rooms.push(room);
    await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
  } finally {
    releaseLock('rooms');
  }
}

export async function addGame(game: GameState): Promise<void> {
  await acquireLock('games');
  try {
    const games = await readGames();
    games.push(game);
    await fs.writeFile(FILES.games, JSON.stringify(games, null, 2));
  } finally {
    releaseLock('games');
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  await acquireLock('rooms');
  try {
    const rooms = await readRooms();
    const filtered = rooms.filter(r => r.id !== roomId);
    await fs.writeFile(FILES.rooms, JSON.stringify(filtered, null, 2));
  } finally {
    releaseLock('rooms');
  }
}
