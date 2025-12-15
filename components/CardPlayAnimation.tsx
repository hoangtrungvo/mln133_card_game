'use client';

import { Card } from '@/types';
import { useEffect, useState } from 'react';

interface CardPlayAnimationProps {
  card: Card | null;
  playerName: string;
  team: 'red' | 'blue';
  effect: string;
  onComplete: () => void;
}

export default function CardPlayAnimation({ card, playerName, team, effect, onComplete }: CardPlayAnimationProps) {
  const [stage, setStage] = useState<'enter' | 'reveal' | 'effect' | 'exit'>('enter');

  useEffect(() => {
    if (!card) return;

    const timers = [
      setTimeout(() => setStage('reveal'), 300),
      setTimeout(() => setStage('effect'), 1200),
      setTimeout(() => setStage('exit'), 2500),
      setTimeout(() => onComplete(), 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [card, onComplete]);

  if (!card) return null;

  const getCardGradient = (type: string) => {
    switch(type) {
      case 'defense': return 'from-blue-600 via-blue-500 to-blue-700';
      case 'heal': return 'from-green-600 via-green-500 to-green-700';
      case 'attack': return 'from-orange-600 via-orange-500 to-orange-700';
      case 'thunder': return 'from-purple-600 via-purple-500 to-purple-700';
      case 'detox': return 'from-cyan-600 via-cyan-500 to-cyan-700';
      default: return 'from-gray-600 via-gray-500 to-gray-700';
    }
  };

  const isAttack = card.value < 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Background overlay */}
      <div className={`absolute inset-0 transition-all duration-500 ${
        stage === 'enter' ? 'bg-black/0' : stage === 'exit' ? 'bg-black/0' : 'bg-black/60'
      }`} />

      {/* Particle effects */}
      {stage === 'effect' && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: `${50 + (Math.random() - 0.5) * 40}%`,
                top: `${50 + (Math.random() - 0.5) * 40}%`,
                animationDelay: `${i * 50}ms`,
                animationDuration: `${1000 + Math.random() * 1000}ms`,
                background: isAttack 
                  ? `radial-gradient(circle, rgba(239, 68, 68, 0.8), transparent)`
                  : `radial-gradient(circle, rgba(34, 197, 94, 0.8), transparent)`
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className={`relative transition-all duration-700 ${
          stage === 'enter' 
            ? 'scale-0 rotate-180 opacity-0' 
            : stage === 'exit'
            ? 'scale-150 opacity-0'
            : 'scale-125 rotate-0 opacity-100'
        }`}
        style={{
          transform: stage === 'reveal' || stage === 'effect' 
            ? 'scale(1.25) rotateY(0deg)' 
            : stage === 'enter'
            ? 'scale(0) rotateY(180deg)'
            : 'scale(1.5) rotateY(0deg)',
        }}
      >
        {/* Glow ring */}
        <div className={`absolute -inset-8 rounded-full blur-3xl transition-all duration-500 ${
          stage === 'effect' 
            ? isAttack
              ? 'bg-red-500/60 animate-pulse'
              : 'bg-green-500/60 animate-pulse'
            : 'bg-amber-500/30'
        }`} />

        {/* Card */}
        <div className="relative w-[180px] h-[260px] rounded-2xl overflow-hidden shadow-2xl">
          {/* Card Background - Gradient */}
          <div className={`absolute inset-0 bg-linear-to-br ${getCardGradient(card.type)}`} />
          
          {/* Texture Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30" />
          
          {/* Border Frame */}
          <div className="absolute inset-0 border-4 border-amber-200/40 rounded-2xl" />
          <div className="absolute inset-1 border-2 border-amber-900/60 rounded-xl" />
          
          {/* Cost Crystal */}
          <div className="absolute -top-2 -left-2 w-16 h-16 bg-linear-to-br from-blue-400 to-blue-700 
            rounded-full border-4 border-white/80 shadow-2xl flex items-center justify-center">
            <span className="text-white font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {Math.abs(card.value)}
            </span>
          </div>

          {/* Card Content */}
          <div className="relative h-full flex flex-col items-center justify-between p-4 pt-10 pb-6">
            {/* Icon/Artwork */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-linear-to-br from-amber-200/20 to-amber-900/40 rounded-full blur-md" />
              <div className={`relative text-8xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                stage === 'effect' ? 'scale-125 animate-bounce' : ''
              }`}>
                {card.icon}
              </div>
            </div>

            {/* Card Name */}
            <div className="w-full bg-gradient-to-r from-transparent via-black/70 to-transparent py-2 px-3">
              <div className="text-center font-black text-white text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]
                tracking-wide uppercase"
                style={{ textShadow: '0 0 15px rgba(0,0,0,0.9), 2px 2px 5px rgba(0,0,0,0.9)' }}>
                {card.name}
              </div>
            </div>

            {/* Description Box */}
            <div className="w-full bg-black/50 backdrop-blur-sm rounded-lg border-2 border-amber-200/30 p-3">
              <div className="text-center text-white text-sm font-semibold drop-shadow-md mb-1">
                {card.description}
              </div>
              <div className={`text-center font-black text-xl ${card.value > 0 ? 'text-green-300' : 'text-red-300'}`}
                style={{ textShadow: '0 0 12px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.9)' }}>
                {card.value > 0 ? `+${card.value}` : card.value} HP
              </div>
            </div>
          </div>

          {/* Rarity Gem */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-linear-to-br from-amber-300 to-amber-600 
            rounded-full border-2 border-amber-200 shadow-lg" />
        </div>
      </div>

      {/* Player info banner */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 transition-all duration-500 ${
        stage === 'enter' || stage === 'exit' ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'
      }`}>
        <div className={`px-8 py-3 rounded-xl font-black text-lg shadow-2xl border-3 ${
          team === 'red'
            ? 'bg-gradient-to-r from-red-600 to-red-800 border-red-400 text-white'
            : 'bg-gradient-to-r from-blue-600 to-blue-800 border-blue-400 text-white'
        }`}
          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {playerName} đã sử dụng thẻ!
        </div>
      </div>

      {/* Effect text */}
      {stage === 'effect' && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 animate-bounce">
          <div className={`px-6 py-3 rounded-xl font-black text-2xl shadow-2xl border-3 ${
            isAttack
              ? 'bg-gradient-to-r from-red-600 to-orange-600 border-red-300 text-white'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-300 text-white'
          }`}
            style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
            {effect}
          </div>
        </div>
      )}

      {/* Lightning/Energy effects for attacks */}
      {stage === 'effect' && isAttack && (
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 bg-yellow-400 opacity-80 animate-pulse"
              style={{
                left: `${50 + (Math.random() - 0.5) * 60}%`,
                top: `${30 + (Math.random() - 0.5) * 40}%`,
                height: `${40 + Math.random() * 60}px`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${i * 100}ms`,
                boxShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24',
              }}
            />
          ))}
        </div>
      )}

      {/* Healing sparkles */}
      {stage === 'effect' && !isAttack && (
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-ping"
              style={{
                left: `${50 + (Math.random() - 0.5) * 50}%`,
                top: `${50 + (Math.random() - 0.5) * 50}%`,
                animationDelay: `${i * 80}ms`,
                animationDuration: `${800 + Math.random() * 400}ms`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
