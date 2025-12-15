# Vietnamese Card Battle Game

A real-time multiplayer card battle game built with Next.js, WebSocket (Socket.IO), and JSON file-based database.

## Features

✨ **Real-time Multiplayer** - 1v1 battles using WebSocket
🏠 **Room System** - Admin-controlled room creation and management  
🎮 **Turn-based Combat** - Strategic card play system
🏆 **Leaderboard** - Track wins, scores, and player stats
⚙️ **Admin Panel** - Configure max rooms and manage game settings
💾 **JSON Database** - Local file-based data persistence

## Game Mechanics

### Card Types
- 🛡️ **Phòng Thủ (Defense)**: +10 HP
- 💚 **Hồi Máu (Heal)**: +15 HP  
- 🔥 **Chém Mạnh (Strong Attack)**: -20 HP
- ⚡ **Siêu Phép (Thunder)**: -25 HP
- 💧 **Giải Độc (Detox)**: +18 HP

### Teams
- 🔴 **Đội Đỏ (Red Team)**
- 🔵 **Đội Xanh (Blue Team)**

### Scoring
- Base win score: 100 points
- Bonus for remaining health
- Bonus for card efficiency
- Time bonus for faster wins

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── page.tsx              # Home menu
│   ├── multiplayer/          # Room selection lobby
│   ├── game/[roomId]/        # Game board
│   ├── admin/                # Admin panel
│   ├── leaderboard/          # Leaderboard display
│   └── api/
│       ├── socket/           # WebSocket server
│       ├── admin/            # Admin API endpoints
│       └── leaderboard/      # Leaderboard API
├── components/
│   ├── GameBoard.tsx         # Main game interface
│   ├── PlayerZone.tsx        # Player info & cards
│   ├── CardHand.tsx          # Card display
│   ├── HealthBar.tsx         # HP bar
│   ├── RoomList.tsx          # Room selection
│   └── Leaderboard.tsx       # Rankings table
├── lib/
│   ├── database.ts           # JSON file operations
│   ├── gameLogic.ts          # Game rules & mechanics
│   ├── roomManager.ts        # Room creation/joining
│   └── leaderboard.ts        # Score tracking
├── types/
│   └── index.ts              # TypeScript definitions
└── data/                     # JSON database files
    ├── config.json
    ├── rooms.json
    ├── games.json
    └── leaderboard.json
```

## How to Play

1. **Admin Setup**: Go to `/admin` to create rooms (default max: 5 rooms)
2. **Join Lobby**: Navigate to `/multiplayer` to see available rooms
3. **Select Room**: Click on a room with open slots
4. **Enter Name**: Type your player name
5. **Ready Up**: Click ready button when both players are in
6. **Play Cards**: Use cards on your turn to attack or heal
7. **Win Condition**: Reduce opponent's HP to 0
8. **View Stats**: Check leaderboard for rankings

## Admin Features

- Configure maximum number of rooms
- Create new game rooms
- Delete existing rooms
- Monitor active games and players

## API Endpoints

### Admin
- `GET /api/admin/config` - Get configuration
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/rooms` - List all rooms
- `POST /api/admin/rooms` - Create room
- `DELETE /api/admin/rooms/:id` - Delete room

### Leaderboard
- `GET /api/leaderboard` - Get top 50 players

### WebSocket Events
- `join-room` - Join a game room
- `leave-room` - Leave current room
- `player-ready` - Mark player as ready
- `play-card` - Play a card
- `game-update` - Receive game state updates
- `rooms-update` - Receive room list updates

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO
- **Database**: JSON files (file system)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
