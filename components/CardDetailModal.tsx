'use client';

import { Card } from '@/types';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const getCategoryBadge = (value: number) => {
    if (value > 0) {
      return {
        icon: '💚',
        label: 'HỒI',
        bgColor: 'from-green-500 to-emerald-600',
        borderColor: 'border-green-300'
      };
    } else if (value < 0) {
      return {
        icon: '⚔️',
        label: 'TẤN',
        bgColor: 'from-red-500 to-rose-600',
        borderColor: 'border-red-300'
      };
    } else {
      return {
        icon: '/buff.png',
        label: 'Buff',
        bgColor: 'from-purple-500 to-violet-600',
        borderColor: 'border-purple-300'
      };
    }
  };

  const badge = getCategoryBadge(card.value);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}>
        {/* Outer glow */}
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/30 via-yellow-600/20 to-orange-700/30 rounded-2xl blur-2xl" />
        
        {/* Main card */}
        <div className="relative bg-linear-to-br from-amber-900 via-yellow-800 to-amber-950 rounded-2xl p-1 shadow-2xl">
          {/* Inner border */}
          <div className="bg-linear-to-br from-slate-800 via-slate-900 to-black rounded-xl p-6 border-2 border-amber-200/20">
            {/* Decorative corners */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-amber-400/50 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-amber-400/50 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-amber-400/50 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-amber-400/50 rounded-br-lg" />
            
            {/* Card Info Header */}
            <div className="text-center mb-6 relative z-10">
              <div className="inline-flex items-center gap-3 bg-linear-to-r from-transparent via-amber-900/40 to-transparent px-8 py-3 mb-3">
                <div className="text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{card.icon}</div>
                <div className="text-left">
                  <div className="text-amber-200 text-2xl font-black tracking-wide"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(251, 191, 36, 0.3)' }}>
                    {card.name}
                  </div>
                  <p className="text-amber-400/70 text-sm font-semibold">{card.description}</p>
                </div>
              </div>
            </div>

            {/* Card Stats */}
            <div className="relative bg-linear-to-br from-slate-700 to-slate-900 rounded-xl p-5 mb-5 border-2 border-amber-600/30 shadow-lg">
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent rounded-xl" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold text-sm">Giá trị:</span>
                  <div className={`px-3 py-1.5 rounded-lg font-black text-base ${
                    card.value > 0 ? 'bg-green-600 text-white' : card.value < 0 ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    {card.value > 0 ? `+${card.value}` : card.value} HP
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold text-sm">Loại:</span>
                  <div className={`bg-gradient-to-br ${badge.bgColor} rounded-lg border-2 ${badge.borderColor} shadow-md px-3 py-1.5`}>
                    <div className="flex items-center gap-1.5">
                      {badge.icon.startsWith('/') ? (
                        <img src={badge.icon} alt={badge.label} className="w-4 h-4" />
                      ) : (
                        <span className="text-sm">{badge.icon}</span>
                      )}
                      <span className="text-white font-black text-sm">{badge.label}</span>
                    </div>
                  </div>
                </div>
                {card.passive && (
                  <div className="pt-2 border-t border-amber-600/30">
                    <span className="text-amber-300 font-bold text-sm block mb-1">Hiệu ứng thụ động:</span>
                    <span className="text-white text-sm">{card.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="relative w-full bg-linear-to-br from-amber-600 via-yellow-700 to-amber-800 hover:from-amber-500 hover:via-yellow-600 hover:to-amber-700 text-white font-black py-3 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 border-2 border-amber-400/30 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                Đóng
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



