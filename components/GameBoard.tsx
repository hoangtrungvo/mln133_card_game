import { GameState, GameAction } from '@/types';
import PlayerZone from './PlayerZone';
import { Sword, Lightbulb, ScrollText, Clock, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId: string;
  onCardClick: (cardId: string) => void;
  onDrawCard: () => void;
  onSkipTurn?: () => void;
  isAnsweringQuestion?: boolean; // Whether player is currently answering a question
}

export default function GameBoard({ gameState, currentPlayerId, onCardClick, onDrawCard, onSkipTurn, isAnsweringQuestion = false }: GameBoardProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const opponent = gameState.players.find(p => p.id !== currentPlayerId);
  
  const [gameElapsedTime, setGameElapsedTime] = useState(0);
  const [turnRemainingTime, setTurnRemainingTime] = useState<number | null>(null);
  const [pauseElapsedTime, setPauseElapsedTime] = useState(0);
  const [turnTimerPausedValue, setTurnTimerPausedValue] = useState<number | null>(null); // Store the remaining time when paused
  
  if (!currentPlayer || !opponent) {
    return <div className="text-white">Loading...</div>;
  }
  
  const isMyTurn = currentPlayer.team === gameState.currentTurn;
  const turnTimerSeconds = gameState.turnTimerSeconds || 30;
  const isPaused = gameState.status === 'paused';
  const disconnectedPlayer = isPaused && gameState.pausedByPlayerId 
    ? gameState.players.find(p => p.id === gameState.pausedByPlayerId)
    : null;
  
  // Game timer (overall elapsed time) - only when active
  useEffect(() => {
    if (gameState.status === 'active' && gameState.startTime) {
      const updateGameTimer = () => {
        const elapsed = Math.floor((Date.now() - gameState.startTime!) / 1000);
        setGameElapsedTime(elapsed);
      };
      updateGameTimer();
      const interval = setInterval(updateGameTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.status, gameState.startTime]);
  
  // Pause timer (elapsed time since pause)
  useEffect(() => {
    if (isPaused && gameState.pausedAt) {
      const updatePauseTimer = () => {
        const elapsed = Math.floor((Date.now() - gameState.pausedAt!) / 1000);
        setPauseElapsedTime(elapsed);
      };
      updatePauseTimer();
      const interval = setInterval(updatePauseTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setPauseElapsedTime(0);
    }
  }, [isPaused, gameState.pausedAt]);
  
  // Capture the current remaining time when question modal opens
  useEffect(() => {
    if (isAnsweringQuestion && isMyTurn && turnTimerPausedValue === null && turnRemainingTime !== null) {
      setTurnTimerPausedValue(turnRemainingTime);
      console.log(`[GameBoard] Turn timer paused at ${turnRemainingTime}s remaining`);
    } else if (!isAnsweringQuestion && turnTimerPausedValue !== null) {
      console.log(`[GameBoard] Turn timer resumed from ${turnTimerPausedValue}s remaining`);
      setTurnTimerPausedValue(null);
    }
  }, [isAnsweringQuestion, isMyTurn, turnRemainingTime, turnTimerPausedValue]);

  // Turn timer (countdown for current turn) - pause when answering question
  useEffect(() => {
    // If answering question, pause the timer (show last known value, don't update)
    if (isAnsweringQuestion && isMyTurn && turnTimerPausedValue !== null) {
      // Keep showing the paused value, don't update
      setTurnRemainingTime(turnTimerPausedValue);
      return;
    }
    
    // Only run timer when active, not paused, and not answering question
    if (gameState.status === 'active' && gameState.currentTurnStartTime && turnTimerSeconds && isMyTurn && !isAnsweringQuestion) {
      const updateTurnTimer = () => {
        const elapsed = Math.floor((Date.now() - gameState.currentTurnStartTime!) / 1000);
        const remaining = Math.max(0, turnTimerSeconds - elapsed);
        setTurnRemainingTime(remaining);
        
        // Auto-skip turn if timer expires
        if (remaining === 0 && onSkipTurn) {
          onSkipTurn();
        }
      };
      updateTurnTimer();
      const interval = setInterval(updateTurnTimer, 1000);
      return () => clearInterval(interval);
    } else {
      // Reset when not active or not my turn
      if (!isAnsweringQuestion) {
        setTurnTimerPausedValue(null);
      }
      setTurnRemainingTime(null);
    }
  }, [gameState.status, gameState.currentTurnStartTime, isMyTurn, turnTimerSeconds, onSkipTurn, isAnsweringQuestion, turnTimerPausedValue]);
  
  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div 
      className="w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
      style={{ 
        width: '100%',
        height: '100%',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(120, 53, 15, 0.15), transparent 70%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.1), transparent 50%)',
      }}>
      <div className="h-full w-full flex gap-3 p-3">
        {/* Left Sidebar - Turn Indicator & Game History */}
        <div className="flex-shrink-0 w-56 flex flex-col gap-3">
          {/* Turn Indicator */}
          <div className="flex-shrink-0">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent blur-xl" />
            
            <div className="relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-xl p-1 shadow-2xl">
              <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-lg px-3 py-3 border-2 border-amber-200/20">
                <div className="flex flex-col items-center gap-2">
                  {/* Pause Indicator */}
                  {isPaused && (
                    <div className="bg-linear-to-br from-orange-700 to-orange-800 px-3 py-2 rounded-lg border-2 border-orange-500/50 shadow-md w-full text-center animate-pulse">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Pause className="w-4 h-4 text-orange-200" />
                        <span className="text-orange-200 text-xs font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          TẠM DỪNG
                        </span>
                      </div>
                      <div className="text-orange-300 text-xs font-semibold">
                        {disconnectedPlayer ? `${disconnectedPlayer.name} đã ngắt kết nối` : 'Đang chờ người chơi...'}
                      </div>
                      <div className="text-orange-200 text-xs font-bold mt-1">
                        ⏱️ {formatTime(pauseElapsedTime)}
                      </div>
                    </div>
                  )}
                  
                  {/* Game Timer */}
                  {gameState.status === 'active' && gameState.startTime && (
                    <div className="bg-linear-to-br from-blue-700 to-blue-800 px-3 py-1.5 rounded-lg border-2 border-blue-500/50 shadow-md w-full text-center flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 text-blue-200" />
                      <span className="text-blue-200 text-xs font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {formatTime(gameElapsedTime)}
                      </span>
                    </div>
                  )}
                  
                  {/* Turn number */}
                  <div className="bg-linear-to-br from-slate-700 to-slate-800 px-3 py-1.5 rounded-lg border-2 border-slate-600 shadow-md w-full text-center flex items-center justify-center gap-1.5">
                    <Sword className="w-3 h-3 text-amber-300" />
                    <span className="text-amber-300 text-xs font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      Hiệp {gameState.turnNumber}
                    </span>
                  </div>
                  
                  {/* VS Icon */}
                  <div className="flex items-center justify-center drop-shadow-[0_4px_12px_rgba(251,191,36,0.5)]">
                    <Sword className="w-8 h-8 text-amber-400" />
                  </div>
                  
                  {/* Current turn indicator */}
                  <div className="px-3 py-1.5 rounded-xl font-black text-xs shadow-xl border-2 w-full text-center bg-linear-to-br from-amber-600 to-amber-800 text-white border-amber-400/40 shadow-amber-500/40"
                    style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                    <span>Lượt: {gameState.players.find(p => p.team === gameState.currentTurn)?.name || 'Đang chờ'}</span>
                  </div>
                  
                  {/* Your turn indicator with timer */}
                  {isMyTurn && gameState.status === 'active' && (
                    <>
                      <div className="bg-linear-to-br from-yellow-500 to-amber-600 px-3 py-1.5 rounded-xl border-2 border-yellow-300/50 shadow-lg shadow-yellow-500/50 animate-pulse w-full text-center flex items-center justify-center gap-1.5">
                        <Lightbulb className="w-3 h-3 text-black" />
                        <span className="text-black text-xs font-black" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                          Lượt bạn!
                        </span>
                      </div>
                      {turnRemainingTime !== null && (
                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs shadow-xl border-2 w-full text-center flex items-center justify-center gap-1.5 ${
                          turnRemainingTime > 10
                            ? 'bg-linear-to-br from-green-600 to-green-800 text-white border-green-400/40 shadow-green-500/40'
                            : turnRemainingTime > 5
                            ? 'bg-linear-to-br from-yellow-600 to-yellow-800 text-white border-yellow-400/40 shadow-yellow-500/40'
                            : 'bg-linear-to-br from-red-600 to-red-800 text-white border-red-400/40 shadow-red-500/40 animate-pulse'
                        }`}
                          style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                          <Clock className="w-3 h-3" />
                          <span>⏱️ {turnRemainingTime}s</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Game History - Always Visible */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div className="absolute inset-0 bg-linear-to-br from-amber-900/20 via-yellow-800/10 to-amber-950/20 rounded-xl blur-lg" />
            
            <div className="relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-xl p-1 shadow-xl flex-1 min-h-0 flex flex-col">
              <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-lg p-2 border-2 border-amber-200/20 flex-1 min-h-0 flex flex-col">
                <h3 className="text-amber-300 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 flex-shrink-0"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Lịch sử</span>
                </h3>
                <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                  {gameState.history.length > 0 ? (
                    gameState.history.slice().reverse().map((action, index) => (
                      <div key={index} className="bg-slate-800/50 rounded px-2 py-1 border border-slate-700/50 backdrop-blur-sm">
                        <span className={`font-bold text-xs ${action.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {action.playerName}
                        </span>
                        <span className="text-gray-400 text-xs">: {action.effect}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-xs text-center py-4 italic">
                      Chưa có lịch sử
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Game Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Opponent Zone */}
          <div className="mb-2 flex-shrink-0" style={{ flex: '0 0 auto', height: 'auto' }}>
            <PlayerZone
              player={opponent}
              isCurrentTurn={!isMyTurn}
              onCardClick={() => {}}
              cardsCount={opponent.cards.length}
              isOpponent={true}
              passiveEffects={gameState.passiveEffects.filter(e => e.playerId === opponent.id)}
            />
          </div>
          
          {/* Current Player Zone */}
          <div className="mb-2 flex-1 min-h-0 flex flex-col" style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PlayerZone
              player={currentPlayer}
              isCurrentTurn={isMyTurn}
              onCardClick={onCardClick}
              onDrawCard={onDrawCard}
              cardsCount={currentPlayer.cards.length}
              passiveEffects={gameState.passiveEffects.filter(e => e.playerId === currentPlayer.id)}
            />
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d97706, #92400e);
          border-radius: 4px;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f59e0b, #b45309);
        }
      `}</style>
    </div>
  );
}
