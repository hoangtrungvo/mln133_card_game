import { Card } from '@/types';
import { useState } from 'react';

interface CardHandProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
  disabled?: boolean;
  faceDown?: boolean; // Hiển thị mặt sau cho bài của đối thủ
}

export default function CardHand({ cards, onCardClick, disabled, faceDown = false }: CardHandProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const handleClick = (cardId: string) => {
    console.log('Card clicked:', cardId, 'Disabled:', disabled);
    if (!disabled) {
      onCardClick(cardId);
    }
  };

  const handleInfoClick = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    // alert("clcikc");
    setSelectedCard(card);
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

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {cards.map((card, index) => (
        <button
          key={card.id}
          onClick={() => handleClick(card.id)}
          disabled={disabled}
          className={`relative w-[140px] h-[260px] rounded-xl overflow-hidden
            transition-all duration-200
            ${!disabled && !faceDown ? 'hover:scale-110 hover:-translate-y-2 cursor-pointer active:scale-105' : 'opacity-80'}
            ${!disabled && !faceDown ? `hover:shadow-2xl hover:${getCardBorderGlow(card.type)}` : ''}
            group`}
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1000px',
            animationDelay: `${index * 50}ms`,
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
          <div className="absolute -top-1 -left-1 w-12 h-12 bg-linear-to-br from-blue-400 to-blue-700 
            rounded-full border-3 border-white/80 shadow-lg flex items-center justify-center z-20">
            <span className="text-white font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {Math.abs(card.value)}
            </span>
          </div>

          {/* Category Badge - Top Right */}
          {(() => {
            const badge = getCategoryBadge(card.value);
            return (
              <div className={`absolute -top-1 -right-1 bg-gradient-to-br ${badge.bgColor} 
                rounded-lg border-2 ${badge.borderColor} shadow-lg px-2 py-1 z-20`}>
                <div className="flex items-center gap-0.5">
                  {badge.icon.startsWith('/') ? (
                    <img src={badge.icon} alt={badge.label} className="w-3 h-3" />
                  ) : (
                    <span className="text-xs">{badge.icon}</span>
                  )}
                  <span className="text-white font-black text-[10px] drop-shadow-md">
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Card Content */}
          <div className="relative h-full flex flex-col items-center justify-between p-3 pt-8 pb-4">
            {/* Icon/Artwork Area */}
            <div className="relative w-full flex-1 flex items-center justify-center px-2 pt-2">
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
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 bg-linear-to-br from-amber-200/20 to-amber-900/40 rounded-full blur-sm" />
                  <div className="relative text-6xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] z-10
                    group-hover:scale-110 transition-transform duration-200">
                    {card.icon}
                  </div>
                </div>
              )}
            </div>

            {/* Card Name Banner */}
            <div className="w-full bg-gradient-to-r from-transparent via-black/70 to-transparent py-1.5 px-2">
              <div className="text-center font-bold text-white text-sm drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]
                tracking-wide uppercase"
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

          {/* Lock Icon */}
          {disabled && (
            <div className="absolute top-2 right-2 text-2xl opacity-80 drop-shadow-lg z-20">
              🔒
            </div>
          )}

          {/* Info Icon - Bottom Right */}
          {!faceDown && (
            <div
              onClick={(e) => handleInfoClick(e, card)}
              className="absolute bottom-2 right-2 w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full border-2 border-white/80 flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20 hover:from-amber-300 hover:to-yellow-400 cursor-pointer"
              title="Xem chi tiết thẻ"
            >
              <span className="text-white font-black text-sm">!</span>
            </div>
          )}

          {/* Rarity Gem - Bottom Center */}
          {/* <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-linear-to-br from-amber-300 to-amber-600 
            rounded-full border-2 border-amber-200 shadow-md opacity-80" /> */}
            </>
          )}
        </button>
      ))}
      
      {cards.length === 0 && (
        <div className="text-gray-400 text-center py-8 text-sm font-medium">
          <div className="text-4xl mb-2 opacity-50">🃏</div>
          Không có thẻ. Hãy rút thẻ mới!
        </div>
      )}

      {/* Card Details Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-8 max-w-md w-full border-2 border-amber-400/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-amber-300 mb-2">{selectedCard.name}</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto rounded-full"></div>
            </div>

            {/* Card Image/Icon */}
            <div className="mb-6 flex justify-center">
              {selectedCard.image ? (
                <img 
                  src={selectedCard.image} 
                  alt={selectedCard.name}
                  className="w-32 h-48 object-contain rounded-lg border-2 border-amber-400/30"
                  onError={(e) => {
                    e.currentTarget.src = '/card-cover.png';
                  }}
                />
              ) : (
                <div className="text-8xl">{selectedCard.icon}</div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-2">Mô Tả</h3>
              <p className="text-slate-200 text-sm leading-relaxed">
                {selectedCard.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-600">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Giá Trị</div>
                <div className={`text-xl font-black ${selectedCard.value > 0 ? 'text-green-400' : selectedCard.value < 0 ? 'text-red-400' : 'text-purple-400'}`}>
                  {selectedCard.value > 0 ? '+' : ''}{selectedCard.value}
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-600">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Loại Hiệu Ứng</div>
                <div className="text-xs text-slate-300 font-semibold break-words">
                  {selectedCard.passive ? selectedCard.passive.replace(/-/g, ' ') : 'Không'}
                </div>
              </div>
            </div>

            {/* Passive Effect Detail */}
            {selectedCard.passive && (
              <div className="mb-6 bg-purple-900/40 rounded-lg p-4 border border-purple-500/30">
                <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest mb-2">⚡ Hiệu Ứng Bị Động</h3>
                <p className="text-sm text-slate-200">
                  {getPassiveEffectDescription(selectedCard.passive)}
                </p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
            >
              ✓ Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function getPassiveEffectDescription(passive: string): string {
    const descriptions: { [key: string]: string } = {
      'compassion-heal': 'Hồi 20 HP + Hồi thêm 5 HP cho đồng minh mỗi turn',
      'immunity-and-reduction': 'Miễn nhiễm damage lần đầu (2 turn) + Giảm 30% damage',
      'counter-2.5x': 'Phản lại tất cả damage với hệ số 2.5x (2 turn)',
      'low-hp-bonus': 'Hồi 25 HP + Nếu HP < 30%, hồi thêm 15 HP',
      'revive-once': 'Hồi sinh với 50 HP khi chết (1 lần/game)',
      'combo-damage': 'Gây 18 damage + Nếu đối thủ đã nhận damage, gây thêm 12 damage',
      'choice-3-paths': 'Chọn: Phật (Hồi 15) / Đạo (DEF+10) / Nho (DMG+10)',
      'preview-cards': 'Xem 3 thẻ tiếp của đối thủ + Counter miễn phí nếu có thẻ ATK',
      'draw-card': 'Hồi 15 HP + Rút 1 thẻ (không cần trả lời câu hỏi)',
      'execute-bonus': 'Gây 15 damage + Nếu HP đối thủ > 70%, gây thêm 15 damage',
      'perfect-answer-bonus': 'Hồi 18 HP + Hồi thêm 12 HP nếu trả lời đúng lần 1',
      'weaken-debuff': 'Gây 12 damage + Làm yếu: Đối thủ nhận +5 damage (2 turn)',
      'choice-4-elements': 'Chọn: Thiên (20 DMG) / Địa (DEF+20) / Thủy (Hồi 20) / Sơn lâm (Độc 5 HP)',
      'copy-card': 'Copy 1 thẻ đã dùng trong game (random)',
    };
    return descriptions[passive] || 'Hiệu ứng không xác định';
  }
}
