import { GameState, GameAction } from '@/types';
import PlayerZone from './PlayerZone';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId: string;
  onCardClick: (cardId: string) => void;
  onDrawCard: () => void;
}

export default function GameBoard({ gameState, currentPlayerId, onCardClick, onDrawCard }: GameBoardProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const opponent = gameState.players.find(p => p.id !== currentPlayerId);
  
  if (!currentPlayer || !opponent) {
    return <div className="text-white">Loading...</div>;
  }
  
  const isMyTurn = currentPlayer.team === gameState.currentTurn;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6"
      style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(120, 53, 15, 0.15), transparent 70%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.1), transparent 50%)',
      }}>
      <div className="max-w-7xl mx-auto">
        {/* Opponent Zone */}
        <div className="mb-6">
          <PlayerZone
            player={opponent}
            isCurrentTurn={!isMyTurn}
            onCardClick={() => {}}
            cardsCount={opponent.cards.length}
            isOpponent={true}
            passiveEffects={gameState.passiveEffects.filter(e => e.playerId === opponent.id)}
          />
        </div>
        
        {/* VS Section - Hearthstone Style */}
        <div className="relative my-8">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent blur-xl" />
          
          <div className="relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-2xl p-1 shadow-2xl">
            <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-xl px-6 py-4 border-2 border-amber-200/20">
              <div className="flex items-center justify-center gap-6">
                {/* Turn number */}
                <div className="bg-linear-to-br from-slate-700 to-slate-800 px-4 py-2 rounded-lg border-2 border-slate-600 shadow-md">
                  <span className="text-amber-300 text-sm font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    ⚔️ Hiệp {gameState.turnNumber}
                  </span>
                </div>
                
                {/* VS Icon */}
                <div className="text-5xl drop-shadow-[0_4px_12px_rgba(251,191,36,0.5)]">
                  ⚔️
                </div>
                
                {/* Current turn indicator */}
                <div className={`px-5 py-2.5 rounded-xl font-black text-base shadow-xl border-2 ${
                  gameState.currentTurn === 'red' 
                    ? 'bg-linear-to-br from-red-600 to-red-800 text-white border-red-400/40 shadow-red-500/40' 
                    : 'bg-linear-to-br from-blue-600 to-blue-800 text-white border-blue-400/40 shadow-blue-500/40'
                }`}
                  style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Lượt: {gameState.currentTurn === 'red' ? '🔴 Đỏ' : '🔵 Xanh'}
                </div>
                
                {/* Your turn indicator */}
                {isMyTurn && gameState.status === 'active' && (
                  <div className="bg-linear-to-br from-yellow-500 to-amber-600 px-4 py-2 rounded-xl border-2 border-yellow-300/50 shadow-lg shadow-yellow-500/50 animate-pulse">
                    <span className="text-black text-sm font-black" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                      💡 Lượt bạn!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Player Zone */}
        <div className="mb-6">
          <PlayerZone
            player={currentPlayer}
            isCurrentTurn={isMyTurn}
            onCardClick={onCardClick}
            onDrawCard={onDrawCard}
            cardsCount={currentPlayer.cards.length}
            passiveEffects={gameState.passiveEffects.filter(e => e.playerId === currentPlayer.id)}
          />
        </div>
        
        {/* Game History - Scroll Style */}
        {gameState.history.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-br from-amber-900/20 via-yellow-800/10 to-amber-950/20 rounded-2xl blur-lg" />
            
            <div className="relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-2xl p-1 shadow-xl">
              <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-xl p-4 border-2 border-amber-200/20">
                <h3 className="text-amber-300 text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  <span className="text-xl">📜</span> Lịch sử trận đấu
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {gameState.history.slice(-5).reverse().map((action, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 backdrop-blur-sm">
                      <span className={`font-bold ${action.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {action.playerName}
                      </span>
                      <span className="text-gray-400 text-sm">: {action.effect}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
