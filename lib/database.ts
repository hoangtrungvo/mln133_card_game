import fs from 'fs/promises';
import path from 'path';
import { Room, GameState, LeaderboardEntry, AdminConfig, Database } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// File paths
const FILES = {
  rooms: path.join(DATA_DIR, 'rooms.json'),
  games: path.join(DATA_DIR, 'games.json'),
  leaderboard: path.join(DATA_DIR, 'leaderboard.json'),
  config: path.join(DATA_DIR, 'config.json'),
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
    };
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
export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | null> {
  await acquireLock('rooms');
  try {
    const rooms = await readRooms();
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    
    if (roomIndex === -1) {
      return null;
    }
    
    rooms[roomIndex] = { ...rooms[roomIndex], ...updates };
    await fs.writeFile(FILES.rooms, JSON.stringify(rooms, null, 2));
    
    return rooms[roomIndex];
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
