import { Player, PassiveEffect } from '@/types';
import CardHand from './CardHand';
import { Heart, Star, CreditCard, Shuffle, Sparkles, RefreshCw, Shield, Skull, Zap } from 'lucide-react';
import Lottie from 'lottie-react';
import tarotCardsAnimation from '@/app/Tarot cards.json';

interface PlayerZoneProps {
  player: Player;
  isCurrentTurn: boolean;
  onCardClick: (cardId: string) => void;
  onDrawCard?: () => void;
  cardsCount: number;
  isOpponent?: boolean; // Để biết có phải đối thủ không
  passiveEffects?: PassiveEffect[]; // Passive effects của player này
}

export default function PlayerZone({ player, isCurrentTurn, onCardClick, onDrawCard, cardsCount, isOpponent = false, passiveEffects = [] }: PlayerZoneProps) {
  
  const handleDrawCard = () => {
    if (onDrawCard) {
      onDrawCard(); // Always randomize - no cardType parameter
    }
  };
  
  return (
    <div className="relative h-full flex flex-col">
      {/* Glow effect when it's player's turn */}
      {isCurrentTurn && (
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/30 via-yellow-600/20 to-orange-700/30 rounded-2xl blur-xl animate-pulse" />
      )}
      
      <div className={`relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-xl p-1 shadow-xl flex-1 min-h-0 flex flex-col
        ${isCurrentTurn ? 'ring-2 ring-yellow-400/60 shadow-yellow-400/40' : ''}`}>
        <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-lg p-2 border-2 border-amber-200/20 flex flex-col flex-1 min-h-0 h-full">
          {/* Decorative corners */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/40 rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/40 rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/40 rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/40 rounded-br-lg" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-2 relative z-10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center border-2 border-amber-400/50 shadow-md bg-slate-900/50">
                {isCurrentTurn && (
                  <Lottie 
                    animationData={tarotCardsAnimation} 
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-amber-100 font-black text-sm tracking-wide"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(251, 191, 36, 0.3)' }}>
                    {player.name}
                  </h2>
                  {/* Compact Health Indicator */}
                  <div className={`px-1.5 py-0.5 rounded text-xs font-black border flex items-center gap-1 ${
                    (player.health / player.maxHealth) < 0.15
                      ? 'bg-red-600 border-red-400 text-white'
                      : (player.health / player.maxHealth) < 0.3
                      ? 'bg-orange-600 border-orange-400 text-white'
                      : 'bg-green-600 border-green-400 text-white'
                  }`}
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    <Heart className="w-3 h-3 fill-current" />
                    <span>{player.health}/{player.maxHealth}</span>
                  </div>
                </div>
                {isCurrentTurn && !isOpponent && (
                  <p className="text-amber-400/80 text-xs font-semibold mt-0.5 animate-pulse">
                    Lượt của bạn...
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-linear-to-br from-amber-600 to-amber-800 px-2 py-1 rounded border border-amber-400/30 shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-200 fill-yellow-200" />
                <span className="text-yellow-200 font-black text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  {player.score}
                </span>
              </div>
              <div className="bg-linear-to-br from-slate-700 to-slate-800 px-2 py-1 rounded border border-slate-600 shadow-md flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-purple-300" />
                <span className="text-purple-300 font-black text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  {cardsCount}/6
                </span>
              </div>
            </div>
          </div>
      
      {/* Passive Effects */}
      {passiveEffects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 flex-shrink-0">
          {passiveEffects.map((effect) => {
            let IconComponent = Sparkles;
            let name = 'Hiệu ứng';
            let bgColor = 'from-purple-600 to-purple-800';
            let borderColor = 'border-purple-400/30';
            
            switch (effect.effect) {
              case 'counter-2.5x':
                IconComponent = RefreshCw;
                name = 'Phản Công';
                bgColor = 'from-red-600 to-red-800';
                borderColor = 'border-red-400/30';
                break;
              case 'immunity-and-reduction':
                IconComponent = Shield;
                name = 'Miễn Nhiễm';
                bgColor = 'from-blue-600 to-blue-800';
                borderColor = 'border-blue-400/30';
                break;
              case 'compassion-heal':
                IconComponent = Heart;
                name = 'Từ Bi';
                bgColor = 'from-green-600 to-green-800';
                borderColor = 'border-green-400/30';
                break;
              case 'weaken-debuff':
                IconComponent = Skull;
                name = 'Suy Yếu';
                bgColor = 'from-gray-600 to-gray-800';
                borderColor = 'border-gray-400/30';
                break;
              case 'revive-once':
                IconComponent = Zap;
                name = 'Phục Sinh';
                bgColor = 'from-yellow-600 to-yellow-800';
                borderColor = 'border-yellow-400/30';
                break;
            }
            
            return (
              <div key={effect.id} className={`bg-gradient-to-br ${bgColor} px-2 py-0.5 rounded border ${borderColor} shadow-md`}>
                <span className="text-white font-black text-xs flex items-center gap-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  <IconComponent className="w-3 h-3" />
                  <span>{name} ({effect.duration >= 999 ? '∞' : `${effect.duration}`})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      
          {/* Cards Section */}
          <div className="mt-2 relative z-10 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-end mb-1.5 flex-shrink-0">
              {onDrawCard && (
                <button
                  onClick={handleDrawCard}
                  disabled={!isCurrentTurn || cardsCount >= 6}
                  className={`relative px-4 py-2 rounded-xl font-bold text-sm transition-all overflow-hidden group ${
                    isCurrentTurn && cardsCount < 6
                      ? 'bg-linear-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 border-2 border-purple-400/30'
                      : 'bg-linear-to-br from-gray-700 to-gray-800 text-gray-500 cursor-not-allowed border-2 border-gray-600'
                  }`}
                  style={{ textShadow: isCurrentTurn && cardsCount < 6 ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none' }}
                  title={cardsCount >= 6 ? 'Tay bài đã đầy (Tối đa 6 thẻ)' : ''}
                >
                  {isCurrentTurn && cardsCount < 6 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4" />
                    <span>Rút thẻ</span>
                  </span>
                </button>
              )}
            </div>
            <CardHand 
              cards={player.cards} 
              onCardClick={onCardClick}
              disabled={!isCurrentTurn}
              faceDown={isOpponent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
