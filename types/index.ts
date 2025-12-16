// Card types based on religion themes
export type CardType = 
  // Phật giáo
  | 'tu-bi' | 'bat-dong-tam' | 'nhan-qua'
  // Công giáo
  | 'loi-cau-nguyen' | 'phep-la' | 'thap-tu-giao'
  // Cao Đài
  | 'tam-giao-hop-nhat' | 'thien-nhan'
  // Hòa Hảo
  | 'tu-tai-gia' | 'tinh-than-dan-toc'
  // Tin Lành
  | 'an-dien' | 'truyen-giao'
  // Đạo Mẫu
  | 'bon-cung-thanh-mau' | 'hau-dong';

export type PassiveEffectType = 
  | 'counter' | 'shield' | 'regen' | 'dodge' | 'weaken' | 'stun' 
  | 'compassion-heal' | 'immunity-and-reduction' | 'counter-2.5x' 
  | 'low-hp-bonus' | 'revive-once' | 'combo-damage'
  | 'choice-3-paths' | 'preview-cards' | 'draw-card'
  | 'execute-bonus' | 'perfect-answer-bonus' | 'weaken-debuff'
  | 'choice-4-elements' | 'copy-card';

export interface PassiveEffect {
  id: string;
  playerId: string;
  effect: PassiveEffectType;
  duration: number; // Số round còn lại
  value?: number; // Giá trị (damage, heal, defense boost, etc.)
  metadata?: any; // Dữ liệu bổ sung (used cards for copy-card, etc.)
}

export interface Card {
  id: string;
  type: CardType;
  name: string;
  value: number; // Positive for heal/defense, negative for attack
  description: string;
  color: string; // For UI styling
  icon: string; // Icon identifier
  image?: string; // Optional image path for card visual
  passive?: string; // Passive effect identifier
  question: string; // Câu hỏi người chơi phải trả lời
  correctAnswer: string; // Đáp án đúng (case-insensitive)
  options?: string[]; // Các lựa chọn (optional, có thể dùng multiple choice hoặc text input)
  attemptCount?: number; // Số lần trả lời (mặc định 0)
  questionStartTime?: number; // Timestamp khi bắt đầu trả lời câu hỏi
  questionPoints?: number; // Points for this question (persisted even after cancel)
  answerTime?: number; // Time taken to answer (ms)
}

// Player in a game
export interface Player {
  id: string;
  name: string;
  team: 'red' | 'blue'; // Đội Đỏ or Đội Xanh
  health: number;
  maxHealth: number;
  cards: Card[];
  score: number;
  ready: boolean;
  hasDrawnCardThisTurn?: boolean; // Track if player has drawn a card this turn
}

// Game state
export interface GameState {
  id: string;
  roomId: string;
  players: Player[];
  currentTurn: 'red' | 'blue';
  turnNumber: number;
  status: 'waiting' | 'active' | 'finished' | 'paused';
  winner: 'red' | 'blue' | null;
  startTime: number | null;
  endTime: number | null;
  history: GameAction[];
  passiveEffects: PassiveEffect[];
  currentTurnStartTime?: number; // When current turn started
  turnTimerSeconds?: number; // Turn timer duration (from env)
  questionTimerSeconds?: number; // Question timer duration (from env)
  pausedAt?: number; // When game was paused (timestamp)
  pausedByPlayerId?: string; // Which player disconnected (caused pause)
  pausedTurnStartTime?: number; // Store turn start time when paused (to resume timer correctly)
}

// Game action for history tracking
export interface GameAction {
  playerId: string;
  playerName: string;
  team: 'red' | 'blue';
  action: 'play-card' | 'skip-turn' | 'draw-card';
  card?: Card;
  timestamp: number;
  effect: string; // Description of what happened
  questionPoints?: number; // Điểm từ trả lời câu hỏi (10 = đúng lần 1, 5 = sai rồi đúng)
  answerTime?: number; // Thời gian trả lời (ms)
}

// Room for multiplayer
export interface Room {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: 2;
  status: 'waiting' | 'in-progress' | 'finished';
  gameState: GameState | null;
  createdAt: number;
}

// Queue entry for matchmaking
export interface QueueEntry {
  playerId: string;
  playerName: string;
  ipAddress: string; // IP address to uniquely identify players
  joinedAt: number;
  socketId?: string; // For reconnection tracking
  assignedRoomId?: string; // Room they were assigned to (for reconnection)
}

// Matchmaking queue
export interface MatchQueue {
  id: string;
  entries: QueueEntry[];
  maxPlayers: number; // 28
  status: 'waiting' | 'matching' | 'matched'; // waiting = collecting, matching = admin started, matched = games created
  createdAt: number;
  matchedAt?: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  playerName: string;
  wins: number;
  score: number;
  timeFinished: number; // Timestamp of last win
  gamesPlayed: number;
  totalDamageDealt: number;
  totalQuestionPoints?: number; // Tổng điểm từ trả lời câu hỏi
  correctAnswers?: number; // Số câu trả lời đúng lần 1
  partialAnswers?: number; // Số câu trả lời sai rồi đúng
}

// Admin configuration
export interface AdminConfig {
  maxRooms: number;
  defaultPlayerHealth: number;
  cardsPerPlayer: number;
  enableLeaderboard: boolean;
  maxQueueSize: number; // 28
}

// WebSocket event types
export interface SocketEvents {
  // Client to Server
  'join-room': (data: { roomId: string; playerName: string }) => void;
  'leave-room': (data: { roomId: string; playerId: string }) => void;
  'join-queue': (data: { playerName: string }) => void;
  'leave-queue': (data: { playerId: string }) => void;
  'reconnect-player': (data: { playerId?: string; playerName?: string }) => void;
  'play-card': (data: { roomId: string; playerId: string; cardId: string; answer: string }) => void;
  'draw-card': (data: { roomId: string; playerId: string }) => void;
  'player-ready': (data: { roomId: string; playerId: string }) => void;
  'request-rooms': () => void;
  'request-queue': () => void;
  'admin-start-matching': () => void;
  'admin-end-all-games': () => void;
  'skip-turn': (data: { roomId: string; playerId: string }) => void;
  
  // Server to Client
  'rooms-update': (rooms: Room[]) => void;
  'queue-update': (queue: MatchQueue) => void;
  'game-update': (gameState: GameState) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'game-started': (gameState: GameState) => void;
  'game-ended': (result: { winner: 'red' | 'blue'; gameState: GameState }) => void;
  'game-paused': (data: { gameState: GameState; disconnectedPlayerName: string }) => void;
  'game-resumed': (gameState: GameState) => void;
  'matched': (data: { roomId: string; playerId: string }) => void;
  'error': (message: string) => void;
  'turn-changed': (turn: 'red' | 'blue') => void;
  'card-played': (action: GameAction) => void;
  'preview-opponent-cards': (data: { cards: Partial<Card>[] }) => void;
  'admin-end-all-games-complete': (data: { gamesEnded: number }) => void;
}

// Database structure
export interface Database {
  rooms: Room[];
  games: GameState[];
  leaderboard: LeaderboardEntry[];
  config: AdminConfig;
  queue: MatchQueue | null;
}
