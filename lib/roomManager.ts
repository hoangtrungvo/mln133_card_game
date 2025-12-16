import { Room, Player, GameState, Card, PassiveEffect } from '@/types';
import { readRooms, writeRooms, readConfig, addRoom, updateRoom, deleteRoom, addGame } from './database';
import { generateCardHand } from './gameLogic';

export async function createRoom(name: string): Promise<Room | { error: string }> {
  const config = await readConfig();
  const rooms = await readRooms();
  
  // Check if max rooms limit reached
  const activeRooms = rooms.filter(r => r.status !== 'finished');
  if (activeRooms.length >= config.maxRooms) {
    return { error: `Maximum room limit (${config.maxRooms}) reached` };
  }
  
  const newRoom: Room = {
    id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: name || `Room ${rooms.length + 1}`,
    players: [],
    maxPlayers: 2,
    status: 'waiting',
    gameState: null,
    createdAt: Date.now(),
  };
  
  await addRoom(newRoom);
  return newRoom;
}

export async function joinRoom(
  roomId: string,
  playerName: string
): Promise<{ success: boolean; player?: Player; room?: Room; error?: string }> {
  // Validate input
  if (!roomId || !playerName || typeof playerName !== 'string') {
    return { success: false, error: 'Invalid room ID or player name' };
  }
  
  const trimmedName = playerName.trim();
  if (trimmedName.length === 0 || trimmedName.length > 50) {
    return { success: false, error: 'Player name must be between 1 and 50 characters' };
  }

  // Use updateRoom with atomic read-modify-write pattern
  const result = await updateRoom(roomId, async (room: Room | null) => {
    // Re-read within lock to ensure consistency
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Check room status (re-validate after lock)
    if (room.status !== 'waiting') {
      throw new Error(`Room is ${room.status === 'in-progress' ? 'already in progress' : 'finished'}`);
    }
    
    // Check if room is full (re-validate after lock)
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }
    
    // Check for duplicate player name in room
    const duplicatePlayer = room.players.find((p: Player) => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicatePlayer) {
      throw new Error('A player with this name is already in the room');
    }
    
    const config = await readConfig();
    
    // Assign team based on current players
    const team = room.players.length === 0 ? 'red' : 'blue';
    
    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: trimmedName,
      team,
      health: config.defaultPlayerHealth,
      maxHealth: config.defaultPlayerHealth,
      cards: generateCardHand(config.cardsPerPlayer),
      score: 0,
      ready: false,
      hasDrawnCardThisTurn: false,
    };
    
    const updatedPlayers = [...room.players, newPlayer];
    let updatedGameState = room.gameState;
    
    // If room is full, create game state and start immediately
    if (updatedPlayers.length === room.maxPlayers) {
      const startTime = Date.now();
      const gameState: GameState = {
        id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        roomId: room.id,
        players: updatedPlayers,
        currentTurn: 'red', // Red team starts
        turnNumber: 1,
        status: 'active', // Start immediately, no waiting
        winner: null,
        startTime: startTime,
        endTime: null,
        history: [],
        passiveEffects: [], // Init empty passive effects
        turnTimerSeconds: parseInt(process.env.TURN_TIMER_SECONDS || '30', 10),
        questionTimerSeconds: parseInt(process.env.QUESTION_TIMER_SECONDS || '15', 10),
        currentTurnStartTime: Date.now(), // Start turn timer immediately
      };
      
      // Initialize hasDrawnCardThisTurn for all players
      for (const p of gameState.players) {
        p.hasDrawnCardThisTurn = false;
      }
      // The first player (red team) hasn't drawn a card yet
      const firstPlayer = gameState.players.find(p => p.team === gameState.currentTurn);
      if (firstPlayer) {
        firstPlayer.hasDrawnCardThisTurn = false;
      }
    
      updatedGameState = gameState;
      await addGame(gameState);
    }
    
    return {
      ...room,
      players: updatedPlayers,
      gameState: updatedGameState,
    };
  });
  
  // Check if result is an error object or null
  if (!result) {
    return { success: false, error: 'Failed to join room' };
  }
  
  if ('error' in result && result.error) {
    return { success: false, error: result.error };
  }
  
  // Type guard: result is Room
  if ('id' in result && 'players' in result) {
    // Find the player we just added
    const player = result.players.find((p: Player) => p.name === trimmedName);
    
    if (!player) {
      return { success: false, error: 'Failed to create player' };
    }
    
    return { success: true, player, room: result };
  }
  
  return { success: false, error: 'Unexpected error: invalid room data' };
}

export async function leaveRoom(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  if (!roomId || !playerId) {
    return { success: false, error: 'Invalid room ID or player ID' };
  }

  // Use atomic update pattern
  const result = await updateRoom(roomId, async (room: Room | null) => {
    // Re-validate after lock
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Check if player exists in room
    const playerExists = room.players.some((p: Player) => p.id === playerId);
    if (!playerExists) {
      throw new Error('Player not found in room');
    }
    
    const updatedPlayers = room.players.filter((p: Player) => p.id !== playerId);
    
    // Don't delete room if there's an active or paused game (players can reconnect)
    const hasActiveGame = room.gameState && 
      (room.gameState.status === 'active' || room.gameState.status === 'paused');
    
    // If room becomes empty and no active game, mark for deletion
    if (updatedPlayers.length === 0 && !hasActiveGame) {
      // Return null to signal deletion
      return null;
    }
    
    // Reset game state if player leaves before game starts
    let updatedGameState = room.gameState;
    if (room.status === 'waiting' && updatedGameState) {
      updatedGameState = null;
    }
    
    return {
      ...room,
      players: updatedPlayers,
      gameState: updatedGameState,
    };
  });
  
  // Handle deletion case
  if (result === null) {
    await deleteRoom(roomId);
    return { success: true };
  }
  
  // Check if result is an error object
  if ('error' in result && result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true };
}

export async function getAllRooms(): Promise<Room[]> {
  return await readRooms();
}

export async function getAvailableRooms(): Promise<Room[]> {
  const rooms = await readRooms();
  return rooms.filter(r => r.status === 'waiting' && r.players.length < r.maxPlayers);
}
