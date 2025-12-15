import { Player } from '@/types';

interface HealthBarProps {
  health: number;
  maxHealth: number;
  team: 'red' | 'blue';
}

export default function HealthBar({ health, maxHealth, team }: HealthBarProps) {
  const percentage = (health / maxHealth) * 100;
  const isLowHealth = percentage < 30;
  const isCritical = percentage < 15;
  
  return (
    <div className="relative bg-linear-to-br from-slate-800 to-slate-900 rounded-xl p-3 border-2 border-amber-600/30 shadow-lg">
      <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent rounded-xl" />
      
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl drop-shadow-lg">❤️</span>
          <span className="text-amber-200 text-xs font-black uppercase tracking-wider"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            Sinh lực
          </span>
        </div>
        <div className={`px-3 py-1 rounded-lg font-black text-base border-2 ${
          isCritical 
            ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/50' 
            : isLowHealth
            ? 'bg-orange-600 border-orange-400 text-white shadow-md'
            : 'bg-green-600 border-green-400 text-white shadow-md'
        }`}
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {health}/{maxHealth}
        </div>
      </div>
      
      {/* Health Bar Container */}
      <div className="relative w-full h-6 bg-linear-to-br from-slate-900 to-black rounded-lg overflow-hidden border-2 border-amber-800/40 shadow-inner">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)' }} />
        
        {/* Health Fill */}
        <div
          className={`relative h-full transition-all duration-500 ease-out ${
            isCritical
              ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 shadow-lg shadow-red-500/50'
              : isLowHealth 
              ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600'
              : team === 'red'
              ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'
              : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          {/* Top highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
        
        {/* HP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
