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
  const rooms = await readRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  if (room.status !== 'waiting') {
    return { success: false, error: 'Room is not available' };
  }
  
  if (room.players.length >= room.maxPlayers) {
    return { success: false, error: 'Room is full' };
  }
  
  const config = await readConfig();
  
  // Assign team based on current players
  const team = room.players.length === 0 ? 'red' : 'blue';
  
  const newPlayer: Player = {
    id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: playerName,
    team,
    health: config.defaultPlayerHealth,
    maxHealth: config.defaultPlayerHealth,
    cards: generateCardHand(config.cardsPerPlayer),
    score: 0,
    ready: false,
  };
  
  room.players.push(newPlayer);
  
  // If room is full, create game state
  if (room.players.length === room.maxPlayers) {
    const gameState: GameState = {
      id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      roomId: room.id,
      players: room.players,
      currentTurn: 'red', // Red team starts
      turnNumber: 1,
      status: 'waiting',
      winner: null,
      startTime: null,
      endTime: null,
      history: [],
      passiveEffects: [], // Init empty passive effects
    };
    
    room.gameState = gameState;
    await addGame(gameState);
  }
  
  await updateRoom(roomId, { players: room.players, gameState: room.gameState });
  
  return { success: true, player: newPlayer, room };
}

export async function leaveRoom(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const rooms = await readRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  room.players = room.players.filter(p => p.id !== playerId);
  
  // If room becomes empty, delete it
  if (room.players.length === 0) {
    await deleteRoom(roomId);
  } else {
    // Reset game state if player leaves before game starts
    if (room.status === 'waiting') {
      room.gameState = null;
    }
    await updateRoom(roomId, { players: room.players, gameState: room.gameState });
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
