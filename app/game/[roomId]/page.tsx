'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { GameState, Card, GameAction } from '@/types';
import GameBoard from '@/components/GameBoard';
import QuestionModal from '@/components/QuestionModal';
import CardPlayAnimation from '@/components/CardPlayAnimation';
import CardDetailModal from '@/components/CardDetailModal';

let socket: Socket;

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params.roomId as string;
  const [playerId, setPlayerId] = useState('');
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [winner, setWinner] = useState<'red' | 'blue' | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [playingCard, setPlayingCard] = useState<GameAction | null>(null);
  const [previewCards, setPreviewCards] = useState<Partial<Card>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateReceivedRef = useRef(false);

  // Get playerId safely on client side only
  useEffect(() => {
    const id = searchParams.get('playerId') || localStorage.getItem('playerId') || '';
    console.log('Setting playerId:', id);
    setPlayerId(id);
  }, [searchParams]);

  useEffect(() => {
    // Wait for playerId to be set
    if (!playerId) {
      console.log('Waiting for playerId...');
      return;
    }

    console.log('Initializing game with playerId:', playerId);

    // Initialize socket connection
    const initSocket = async () => {
      socket = io({
        path: '/api/socket',
      });

      socket.on('connect', () => {
        console.log('Connected to game server');
        gameStateReceivedRef.current = false;
        // Request current game state immediately after connecting, include playerId for reconnection
        socket.emit('request-game-state', { roomId, playerId });
        
        // Set timeout - if no game state received within 5 seconds, redirect
        connectionTimeoutRef.current = setTimeout(() => {
          if (!gameStateReceivedRef.current) {
            console.log('Timeout: No game state received, redirecting to main page');
            alert('Không thể kết nối đến phòng. Đang quay về trang chủ...');
            router.push('/multiplayer');
          }
        }, 5000);
      });

      socket.on('game-update', (updatedGameState: GameState) => {
        console.log('Game state updated:', updatedGameState);
        console.log('Game status:', updatedGameState.status);
        console.log('Current turn:', updatedGameState.currentTurn);
        console.log('Turn timer seconds:', updatedGameState.turnTimerSeconds);
        console.log('Current turn start time:', updatedGameState.currentTurnStartTime);
        gameStateReceivedRef.current = true;
        setGameState(updatedGameState);
        
        // If game is paused and we're the one who paused it, try to reconnect
        if (updatedGameState.status === 'paused' && updatedGameState.pausedByPlayerId === playerId) {
          console.log('Game is paused by this player, attempting to reconnect...');
          // The server should automatically resume when we request game state with playerId
          // But we can also explicitly try to reconnect
          socket.emit('request-game-state', { roomId, playerId });
        }
        
        // Clear timeout if game state is received
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      socket.on('game-started', (startedGameState: GameState) => {
        gameStateReceivedRef.current = true;
        setGameState(startedGameState);
        setIsReady(true);
        // Clear timeout if game started
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      socket.on('turn-changed', () => {
        // Game state will be updated via game-update event
      });

      socket.on('card-played', (action: GameAction) => {
        console.log('Card played action:', action);
        setPlayingCard(action);
      });

      socket.on('game-ended', (result: { winner: 'red' | 'blue'; gameState: GameState }) => {
        setWinner(result.winner);
        setGameState(result.gameState);
      });

      socket.on('player-left', () => {
        // Only redirect if game is not paused (paused games wait for reconnection)
        if (gameState?.status !== 'paused') {
          alert('Người chơi khác đã rời phòng. Trận đấu kết thúc.');
          router.push('/multiplayer');
        }
      });

      socket.on('game-paused', (data: { gameState: GameState; disconnectedPlayerName: string }) => {
        console.log('Game paused:', data);
        setGameState(data.gameState);
      });

      socket.on('game-resumed', (resumedGameState: GameState) => {
        console.log('Game resumed:', resumedGameState);
        setGameState(resumedGameState);
      });

      socket.on('error', (message: string) => {
        // If room not found, redirect to main page
        if (message.includes('Room or game not found') || message.includes('Game not found')) {
          alert('Phòng không tồn tại hoặc đã bị xóa. Đang quay về trang chủ...');
          router.push('/multiplayer');
          return;
        }
        alert(message);
      });

      socket.on('preview-opponent-cards', (data: { cards: Partial<Card>[] }) => {
        console.log('Preview opponent cards:', data.cards);
        setPreviewCards(data.cards);
        setShowPreview(true);
        // Auto hide after 5 seconds
        setTimeout(() => {
          setShowPreview(false);
          setPreviewCards([]);
        }, 5000);
      });
    };

    initSocket();

    return () => {
      // Clear timeout on cleanup
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (socket) {
        socket.emit('leave-room', { roomId, playerId });
        socket.disconnect();
      }
    };
  }, [playerId, roomId, router]);

  // No longer needed - game starts automatically when both players join

  const handleCardClick = (cardId: string) => {
    console.log('handleCardClick called:', { 
      cardId, 
      hasSocket: !!socket, 
      gameStatus: gameState?.status,
      playerId,
      currentTurn: gameState?.currentTurn,
      myTeam: gameState?.players.find(p => p.id === playerId)?.team
    });
    
    if (!gameState) {
      console.log('No game state');
      return;
    }
    
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (!currentPlayer) {
      console.log('Current player not found');
      return;
    }
    
    const card = currentPlayer.cards.find(c => c.id === cardId);
    if (!card) {
      console.log('Card not found');
      return;
    }
    
    // Check if it's the player's turn and game is active
    const isMyTurn = currentPlayer.team === gameState.currentTurn;
    console.log('Is my turn?', isMyTurn, 'My team:', currentPlayer.team, 'Current turn:', gameState.currentTurn);
    
    if (socket && gameState.status === 'active' && isMyTurn) {
      // It's your turn - show question modal to play the card
      console.log('Setting selected card and showing question modal');
      setSelectedCard(card);
      setShowQuestionModal(true);
    } else {
      // Not your turn or game not active - show card details only
      console.log('Showing card details (not your turn or game not active)', {
        hasSocket: !!socket,
        status: gameState.status,
        isMyTurn
      });
      setViewingCard(card);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (socket && selectedCard) {
      socket.emit('play-card', { 
        roomId, 
        playerId, 
        cardId: selectedCard.id,
        answer: answer.trim()
      });
      setShowQuestionModal(false);
      setSelectedCard(null);
    }
  };

  const handleCancelQuestion = () => {
    setShowQuestionModal(false);
    setSelectedCard(null);
  };

  const handleDrawCard = () => {
    if (socket) {
      socket.emit('draw-card', { roomId, playerId }); // No cardType - always randomize
    }
  };

  const handleSkipTurn = () => {
    if (socket && gameState) {
      const currentPlayer = gameState.players.find(p => p.id === playerId);
      if (currentPlayer && currentPlayer.team === gameState.currentTurn) {
        socket.emit('skip-turn', { roomId, playerId });
      }
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Đang tải trò chơi...</div>
          <div className="animate-spin text-6xl">⏳</div>
        </div>
      </div>
    );
  }

  // Game now starts automatically when both players join - no waiting screen needed

  // Game ended - show results
  if (winner) {
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    const didWin = currentPlayer?.team === winner;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full border-2 border-gray-600">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{didWin ? '🏆' : '💔'}</div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {didWin ? 'Chiến thắng!' : 'Thất bại!'}
            </h1>
            <div className="text-2xl text-yellow-400">
              {winner === 'red' ? 'Đội Đỏ' : 'Đội Xanh'} thắng!
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg ${player.team === 'red' ? 'bg-red-900/30' : 'bg-blue-900/30'} border-2 ${player.team === winner ? 'border-yellow-400' : 'border-gray-600'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">
                      {player.team === 'red' ? '🔴' : '🔵'} {player.name} {player.id === playerId && '(Bạn)'}
                    </div>
                    <div className="text-sm text-gray-300">
                      HP còn lại: {player.health}/{player.maxHealth}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-xl">⭐ {player.score}</div>
                    <div className="text-xs text-gray-400">điểm</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/leaderboard')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              🏆 Xem bảng xếp hạng
            </button>
            <button
              onClick={() => router.push('/multiplayer')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              🔄 Chơi lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active game
  return (
    <>
      <GameBoard 
        gameState={gameState} 
        currentPlayerId={playerId} 
        onCardClick={handleCardClick}
        onDrawCard={handleDrawCard}
        onSkipTurn={handleSkipTurn}
        isAnsweringQuestion={showQuestionModal}
      />
      
      {/* Preview Opponent Cards Modal */}
      {showPreview && previewCards.length > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 rounded-2xl p-6 max-w-4xl w-full border-4 border-purple-400 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-purple-200 mb-2" style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.8)' }}>
                👁️ THIÊN NHÃN - XEM THẺ ĐỐI THỦ
              </h2>
              <p className="text-purple-300 text-sm">Bạn đang xem 3 thẻ tiếp theo của đối thủ...</p>
            </div>
            
            <div className="flex gap-4 justify-center mb-4">
              {previewCards.map((card, index) => (
                <div key={index} className="relative w-[140px] h-[200px] rounded-xl overflow-hidden border-4 border-purple-400 shadow-xl">
                  {/* Card Background */}
                  <div className={`absolute inset-0 ${card.color || 'bg-gradient-to-br from-gray-600 to-gray-800'}`} />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-between p-3 pt-8 pb-4">
                    {/* Icon */}
                    {card.image ? (
                      <div className="relative w-full flex-1 flex items-center justify-center px-2 pt-2">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className="text-6xl drop-shadow-lg">{card.icon}</div>
                    )}
                    
                    {/* Name */}
                    <div className="w-full bg-black/70 py-1.5 px-2 rounded">
                      <div className="text-center font-bold text-white text-xs">{card.name}</div>
                    </div>
                    
                    {/* Value */}
                    <div className="absolute -top-1 -left-1 w-10 h-10 bg-blue-600 rounded-full border-3 border-white flex items-center justify-center">
                      <span className="text-white font-black text-sm">{Math.abs(card.value || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewCards([]);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                ✓ Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Question Modal */}
      {showQuestionModal && selectedCard && (
        <QuestionModal
          card={selectedCard}
          onSubmit={handleAnswerSubmit}
          onCancel={handleCancelQuestion}
          questionTimerSeconds={gameState?.questionTimerSeconds || 15}
        />
      )}
      
      {/* Card Play Animation */}
      {playingCard && playingCard.card && (
        <CardPlayAnimation
          card={playingCard.card}
          playerName={playingCard.playerName}
          team={playingCard.team}
          effect={playingCard.effect}
          onComplete={() => setPlayingCard(null)}
        />
      )}
      
      {/* Card Detail Modal - For viewing cards when not your turn */}
      {viewingCard && (
        <CardDetailModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </>
  );
}
