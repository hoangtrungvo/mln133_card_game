import { Card } from '@/types';
import { useState, useRef, useEffect } from 'react';

interface CardHandProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
  disabled?: boolean;
  faceDown?: boolean; // Hiển thị mặt sau cho bài của đối thủ
}

export default function CardHand({ cards, onCardClick, disabled, faceDown = false }: CardHandProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleClick = (cardId: string) => {
    console.log('Card clicked:', cardId, 'Disabled:', disabled);
    // Always allow clicking to view card details, even when disabled
    // The parent component will decide whether to show question modal or detail modal
    onCardClick(cardId);
  };

  const handleMouseEnter = (cardId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (faceDown) return; // Don't show tooltip for face-down cards (opponent's cards)
    const div = e.currentTarget;
    const rect = div.getBoundingClientRect();
    setHoveredCard(cardId);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
    setTooltipPosition(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoveredCard) return;
    const div = e.currentTarget;
    const rect = div.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  // Màu gradient cho từng loại thẻ theo style Hearthstone
  const getCardGradient = (type: string) => {
    switch(type) {
      // Phật Giáo - Buddhism (Vàng cam)
      case 'tu-bi': return 'from-amber-600 via-yellow-500 to-orange-600';
      case 'bat-dong-tam': return 'from-yellow-600 via-amber-500 to-yellow-700';
      case 'nhan-qua': return 'from-orange-600 via-amber-500 to-orange-700';
      // Công Giáo - Catholicism (Trắng bạc)
      case 'loi-cau-nguyen': return 'from-slate-400 via-gray-300 to-slate-500';
      case 'phep-la': return 'from-blue-300 via-slate-200 to-blue-400';
      case 'thap-tu-giao': return 'from-gray-300 via-slate-300 to-gray-400';
      // Đạo Cao Đài - Caodaism (Xanh dương)
      case 'tam-giao-hop-nhat': return 'from-blue-600 via-cyan-500 to-blue-700';
      case 'thien-nhan': return 'from-cyan-600 via-blue-500 to-cyan-700';
      // Đạo Phật Hòa Hảo - Hoa Hao Buddhism (Xanh lá)
      case 'tu-tai-gia': return 'from-green-600 via-emerald-500 to-green-700';
      case 'tinh-than-dan-toc': return 'from-emerald-600 via-green-500 to-emerald-700';
      // Tin Lành - Protestantism (Đỏ)
      case 'an-dien': return 'from-red-600 via-rose-500 to-red-700';
      case 'truyen-giao': return 'from-rose-600 via-red-500 to-rose-700';
      // Đạo Mẫu - Mother Goddess Worship (Tím)
      case 'bon-cung-thanh-mau': return 'from-purple-600 via-violet-500 to-purple-700';
      case 'hau-dong': return 'from-violet-600 via-purple-500 to-violet-700';
      default: return 'from-gray-600 via-gray-500 to-gray-700';
    }
  };

  // Màu viền sáng cho từng loại
  const getCardBorderGlow = (type: string) => {
    switch(type) {
      // Phật Giáo - Buddhism
      case 'tu-bi': return 'shadow-amber-400/50';
      case 'bat-dong-tam': return 'shadow-yellow-400/50';
      case 'nhan-qua': return 'shadow-orange-400/50';
      // Công Giáo - Catholicism
      case 'loi-cau-nguyen': return 'shadow-slate-400/50';
      case 'phep-la': return 'shadow-blue-300/50';
      case 'thap-tu-giao': return 'shadow-gray-400/50';
      // Đạo Cao Đài - Caodaism
      case 'tam-giao-hop-nhat': return 'shadow-blue-400/50';
      case 'thien-nhan': return 'shadow-cyan-400/50';
      // Đạo Phật Hòa Hảo - Hoa Hao Buddhism
      case 'tu-tai-gia': return 'shadow-green-400/50';
      case 'tinh-than-dan-toc': return 'shadow-emerald-400/50';
      // Tin Lành - Protestantism
      case 'an-dien': return 'shadow-red-400/50';
      case 'truyen-giao': return 'shadow-rose-400/50';
      // Đạo Mẫu - Mother Goddess Worship
      case 'bon-cung-thanh-mau': return 'shadow-purple-400/50';
      case 'hau-dong': return 'shadow-violet-400/50';
      default: return 'shadow-gray-400/50';
    }
  };

  // Phân loại thẻ dựa vào value
  const getCardCategory = (value: number) => {
    if (value > 0) return 'heal'; // Hồi máu
    if (value < 0) return 'attack'; // Tấn công
    return 'buff'; // Buff/Utility
  };

  const getCategoryBadge = (value: number) => {
    const category = getCardCategory(value);
    switch(category) {
      case 'heal':
        return {
          icon: '💚',
          label: 'HỒI',
          bgColor: 'from-green-500 to-emerald-600',
          borderColor: 'border-green-300'
        };
      case 'attack':
        return {
          icon: '⚔️',
          label: 'TẤN',
          bgColor: 'from-red-500 to-rose-600',
          borderColor: 'border-red-300'
        };
      case 'buff':
        return {
          icon: '/buff.png',
          label: 'Buff',
          bgColor: 'from-purple-500 to-violet-600',
          borderColor: 'border-purple-300'
        };
    }
  };

  const hoveredCardData = hoveredCard ? cards.find(c => c.id === hoveredCard) : null;

  return (
    <>
      <div className="flex gap-4 flex-wrap justify-center items-center content-center overflow-y-auto overflow-x-hidden flex-1 min-h-0 p-2">
        {cards.map((card, index) => (
          <div
            key={card.id}
            ref={(el) => { cardRefs.current[card.id] = el as any; }}
            onMouseEnter={(e) => handleMouseEnter(card.id, e as any)}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove as any}
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px',
              animationDelay: `${index * 50}ms`,
              transformOrigin: 'center center',
            }}
          >
            <button
              onClick={() => handleClick(card.id)}
              disabled={disabled}
              className={`relative w-[140px] h-[200px] rounded-lg overflow-visible flex-shrink-0
                transition-all duration-200
                ${!faceDown ? 'hover:scale-105 hover:-translate-y-1 cursor-pointer active:scale-102' : 'opacity-80 cursor-default'}
                ${!faceDown ? `hover:shadow-2xl hover:${getCardBorderGlow(card.type)}` : ''}
                ${disabled && !faceDown ? 'opacity-90' : ''}
                group`}
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
                transformOrigin: 'center center',
              }}
            >
          {faceDown ? (
            // Mặt sau của thẻ - Card Back
            <>
              {/* Background - Purple/Blue mystical */}
              <div className="absolute inset-0 bg-linear-to-br from-indigo-900 via-purple-800 to-violet-900" />
              
              {/* Texture pattern */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px),
                                   repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              
              {/* Border Frame */}
              <div className="absolute inset-0 border-4 border-amber-400/60 rounded-xl" />
              <div className="absolute inset-1 border-2 border-purple-300/40 rounded-lg" />
              
              {/* Center ornament */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Outer glow */}
                  <div className="absolute inset-0 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl" />
                  
                  {/* Main symbol */}
                  <div className="relative w-20 h-20 rounded-full bg-linear-to-br from-amber-400 to-amber-700 border-4 border-amber-200/50 shadow-2xl flex items-center justify-center">
                    <div className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                      🃏
                    </div>
                  </div>
                  
                  {/* Decorative corners */}
                  <div className="absolute -top-8 -left-8 text-amber-400/60 text-2xl">✦</div>
                  <div className="absolute -top-8 -right-8 text-amber-400/60 text-2xl">✦</div>
                  <div className="absolute -bottom-8 -left-8 text-amber-400/60 text-2xl">✦</div>
                  <div className="absolute -bottom-8 -right-8 text-amber-400/60 text-2xl">✦</div>
                </div>
              </div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
              
              {/* Card count badge */}
              <div className="absolute top-2 right-2 w-8 h-8 bg-purple-900/80 rounded-full border-2 border-amber-400/60 flex items-center justify-center">
                <span className="text-amber-200 text-xs font-black">{index + 1}</span>
              </div>
            </>
          ) : (
            // Mặt trước của thẻ - Original card design
            <>
          {/* Card Background - Gradient */}
          <div className={`absolute inset-0 bg-linear-to-br ${getCardGradient(card.type)}`} />
          
          {/* Texture Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30" />
          
          {/* Border Frame - Hearthstone style */}
          <div className="absolute inset-0 border-4 border-amber-200/40 rounded-xl" />
          <div className="absolute inset-1 border-2 border-amber-900/60 rounded-lg" />
          
          {/* Cost Crystal - Top Left */}
          <div className="absolute -top-1 -left-1 w-10 h-10 bg-linear-to-br from-blue-400 to-blue-700 
            rounded-full border-2 border-white/80 shadow-md flex items-center justify-center z-20">
            <span className="text-white font-black text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {Math.abs(card.value)}
            </span>
          </div>

          {/* Category Badge - Top Right */}
          {(() => {
            const badge = getCategoryBadge(card.value);
            return (
              <div className={`absolute -top-1 -right-1 bg-gradient-to-br ${badge.bgColor} 
                rounded-lg border-2 ${badge.borderColor} shadow-md px-1.5 py-0.5 z-20`}>
                <div className="flex items-center gap-0.5">
                  {badge.icon.startsWith('/') ? (
                    <img src={badge.icon} alt={badge.label} className="w-2.5 h-2.5" />
                  ) : (
                    <span className="text-[10px]">{badge.icon}</span>
                  )}
                  <span className="text-white font-black text-[9px] drop-shadow-md leading-tight">
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Card Content */}
          <div className="relative h-full flex flex-col items-center justify-between p-2 pt-10 pb-2">
            {/* Icon/Artwork Area */}
            <div className="relative w-full flex-1 flex items-center justify-center px-2 pt-1 min-h-0">
              {card.image ? (
                // Display card image if available
                <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-amber-200/40">
                  <img 
                    src={card.image} 
                    alt={card.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                // Fallback to icon if no image
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-linear-to-br from-amber-200/20 to-amber-900/40 rounded-full blur-sm" />
                  <div className="relative text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] z-10
                    group-hover:scale-110 transition-transform duration-200">
                    {card.icon}
                  </div>
                </div>
              )}
            </div>

            {/* Card Name Banner */}
            <div className="w-full bg-gradient-to-r from-transparent via-black/70 to-transparent py-1.5 px-2 flex-shrink-0">
              <div className="text-center font-bold text-white text-xs drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]
                tracking-wide uppercase leading-tight"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)' }}>
                {card.name}
              </div>
            </div>

            {/* Description Box */}
            {/* <div className="w-full bg-black/50 backdrop-blur-sm rounded border border-amber-200/30 p-2">
              <div className="text-center text-white text-xs font-semibold drop-shadow-md">
                {card.description}
              </div>
              <div className={`text-center font-black text-sm mt-1 ${card.value > 0 ? 'text-green-300' : 'text-red-300'}`}
                style={{ textShadow: '0 0 8px rgba(0,0,0,0.9), 1px 1px 2px rgba(0,0,0,0.9)' }}>
                {card.value > 0 ? `+${card.value}` : card.value} HP
              </div>
            </div> */}
          </div>

          {/* Shine Effect on Hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/0
            group-hover:via-white/20 transition-all duration-300 pointer-events-none" />
          
          {/* Golden Glow on Hover */}
          {!disabled && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
              shadow-[0_0_30px_10px_rgba(255,215,0,0.4)] rounded-xl pointer-events-none" />
          )}

          {/* Rarity Gem - Bottom Center */}
          {/* <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-linear-to-br from-amber-300 to-amber-600 
            rounded-full border-2 border-amber-200 shadow-md opacity-80" /> */}
            </>
          )}
            </button>
          </div>
        ))}
      
        {cards.length === 0 && (
          <div className="text-gray-400 text-center py-8 text-sm font-medium">
            <div className="text-4xl mb-2 opacity-50">🃏</div>
            Không có thẻ. Hãy rút thẻ mới!
          </div>
        )}
      </div>
      
      {/* Hover Tooltip - Fixed position to escape overflow */}
      {!faceDown && hoveredCardData && tooltipPosition && (
        <div 
          className="fixed w-64 p-3 bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-lg border-2 border-amber-400/50 shadow-2xl z-[9999] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="text-amber-200 font-black text-sm mb-1.5 flex items-center gap-2"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            <span className="text-lg">{hoveredCardData.icon}</span>
            <span>{hoveredCardData.name}</span>
          </div>
          <div className="text-white text-xs font-semibold leading-relaxed"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            {hoveredCardData.description}
          </div>
          {hoveredCardData.value !== 0 && (
            <div className={`mt-2 text-center text-xs font-black px-2 py-1 rounded ${
              hoveredCardData.value > 0 ? 'bg-green-600/80 text-white' : 'bg-red-600/80 text-white'
            }`}>
              {hoveredCardData.value > 0 ? `+${hoveredCardData.value}` : hoveredCardData.value} HP
            </div>
          )}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-400/50"></div>
        </div>
      )}
    </>
  );
}
