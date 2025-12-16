'use client';

import { Card } from '@/types';
import { useState, useEffect } from 'react';

interface QuestionModalProps {
  card: Card;
  onSubmit: (answer: string) => void;
  onCancel: () => void;
  questionTimerSeconds?: number; // Timer duration for answering question
}

// Fibonacci point reduction: 10 → 8 → 5 → 3 → 2 → 1 (minimum 1)
// Returns ratio (0-1) for scaling question points
function getFibonacciRatio(attemptCount: number): number {
  const sequence = [10, 8, 5, 3, 2, 1];
  const fibScore = attemptCount < sequence.length ? sequence[attemptCount] : 1;
  return fibScore / 10; // Return ratio (max 1.0 for attempt 0)
}

// Calculate final question points based on base points and attempt count
function calculateQuestionPoints(basePoints: number, attemptCount: number): number {
  const ratio = getFibonacciRatio(attemptCount);
  return Math.round(basePoints * ratio);
}

export default function QuestionModal({ card, onSubmit, onCancel, questionTimerSeconds = 15 }: QuestionModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [remainingTime, setRemainingTime] = useState(questionTimerSeconds);
  // Restore attemptCount and questionPoints from card if they exist (persistence fix)
  const [attemptCount, setAttemptCount] = useState(card.attemptCount || 0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    // Reset timer when modal opens for a new card, but preserve attemptCount from card
    setRemainingTime(questionTimerSeconds);
    setHasExpired(false);
    // Restore attemptCount from card if it exists (persistence fix)
    if (card.attemptCount !== undefined) {
      setAttemptCount(card.attemptCount);
    } else {
      setAttemptCount(0);
    }
    // Reset answer selections
    setSelectedAnswer('');
    setTextAnswer('');
  }, [card.id, questionTimerSeconds]); // Reset when card ID changes

  useEffect(() => {
    // Start countdown timer
    if (hasExpired || remainingTime <= 0) {
      return; // Don't run timer if expired
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          // Time expired - auto-submit with 0 points
          setHasExpired(true);
          // Set questionPoints to 0 and play card anyway
          (card as any).questionPoints = 0;
          (card as any).answerTime = questionTimerSeconds * 1000;
          (card as any).attemptsFinal = attemptCount + 1;
          // Submit with empty answer (will be wrong, but card still plays)
          setTimeout(() => onSubmit(''), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime, hasExpired, questionTimerSeconds, attemptCount, card, onSubmit]);

  const handleSubmit = () => {
    if (hasExpired) {
      return; // Don't allow submission after timeout
    }

    const answer = card.options ? selectedAnswer : textAnswer;
    if (!answer.trim()) {
      alert('Vui lòng chọn hoặc nhập câu trả lời!');
      return;
    }
    
    // Check if answer is correct
    const isCorrect = answer.toLowerCase().trim() === card.correctAnswer.toLowerCase().trim();
    if (isCorrect) {
      // Calculate points based on base points from question and attempt count
      const basePoints = (card as any).points || 10; // Default to 10 if not specified
      const questionPoints = calculateQuestionPoints(basePoints, attemptCount);
      card.questionStartTime = (card.questionStartTime || Date.now()) - (questionTimerSeconds - remainingTime) * 1000;
      // Persist points and attempt count on card (fixes persistence bug)
      (card as any).questionPoints = questionPoints;
      (card as any).answerTime = (questionTimerSeconds - remainingTime) * 1000;
      (card as any).attemptsFinal = attemptCount + 1;
      (card as any).attemptCount = attemptCount; // Persist attempt count
    } else {
      // Wrong answer - increment attempt count and recalculate points
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      (card as any).attemptCount = newAttemptCount; // Persist on card
      setSelectedAnswer('');
      setTextAnswer('');
      alert('Sai rồi! Thử lại nha 🤔');
      return;
    }
    
    onSubmit(answer);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 69, 19, 0.2), transparent 70%)' }}>
      <div className="relative max-w-xl w-full">
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
              {/* Timer and attempt counter */}
              <div className="flex justify-center gap-4 mb-4">
                <div className={`px-3 py-1 rounded-lg border ${
                  remainingTime > 5 
                    ? 'bg-blue-900/50 border-blue-500/50' 
                    : remainingTime > 0
                    ? 'bg-red-900/50 border-red-500/50 animate-pulse'
                    : 'bg-gray-900/50 border-gray-500/50'
                }`}>
                  <span className={`text-xs font-bold ${
                    remainingTime > 5 
                      ? 'text-blue-300' 
                      : remainingTime > 0
                      ? 'text-red-300'
                      : 'text-gray-300'
                  }`}>
                    ⏱️ {remainingTime}s
                  </span>
                </div>
                <div className="bg-orange-900/50 px-3 py-1 rounded-lg border border-orange-500/50">
                  <span className="text-orange-300 text-xs font-bold">🎯 Lần {attemptCount + 1}</span>
                </div>
                <div className={`px-3 py-1 rounded-lg border ${
                  hasExpired 
                    ? 'bg-gray-900/50 border-gray-500/50'
                    : getFibonacciRatio(attemptCount) === 1
                    ? 'bg-green-900/50 border-green-500/50'
                    : getFibonacciRatio(attemptCount) >= 0.5
                    ? 'bg-yellow-900/50 border-yellow-500/50'
                    : 'bg-orange-900/50 border-orange-500/50'
                }`}>
                  <span className={`text-xs font-bold ${
                    hasExpired
                      ? 'text-gray-300'
                      : getFibonacciRatio(attemptCount) === 1
                      ? 'text-green-300'
                      : getFibonacciRatio(attemptCount) >= 0.5
                      ? 'text-yellow-300'
                      : 'text-orange-300'
                  }`}>
                    {hasExpired ? '⭐ 0đ' : `⭐ ${calculateQuestionPoints((card as any).points || 10, attemptCount)}đ`}
                  </span>
                </div>
              </div>
              
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

            {/* Question Box */}
            <div className="relative bg-linear-to-br from-slate-700 to-slate-900 rounded-xl p-5 mb-5 border-2 border-amber-600/30 shadow-lg">
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent rounded-xl" />
              <h3 className="text-amber-300 font-black text-sm mb-3 uppercase tracking-widest flex items-center gap-2"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                <span className="text-xl">❓</span> Câu hỏi
              </h3>
              <p className="text-white text-xl font-bold leading-relaxed relative z-10"
                style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                {card.question}
              </p>
            </div>

            {/* Answer Options or Text Input */}
            {card.options ? (
              <div className="space-y-3 mb-6 relative z-10">
                {card.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    className={`relative w-full p-4 rounded-xl font-bold text-base transition-all group overflow-hidden ${
                      selectedAnswer === option
                        ? 'bg-linear-to-r from-amber-500 to-yellow-600 text-black border-2 border-amber-300 shadow-xl shadow-amber-500/50 scale-105'
                        : 'bg-linear-to-br from-slate-700 to-slate-800 text-white hover:from-slate-600 hover:to-slate-700 border-2 border-slate-600 hover:border-amber-600/50 hover:scale-102'
                    }`}
                    style={{ textShadow: selectedAnswer === option ? '1px 1px 2px rgba(0,0,0,0.5)' : '1px 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10">
                      <span className={`inline-block w-7 h-7 rounded-full mr-3 text-center leading-7 ${
                        selectedAnswer === option ? 'bg-black/20' : 'bg-amber-600/30'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-6 relative z-10">
                <label className="block text-amber-300 font-black mb-3 text-sm uppercase tracking-wider"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  ✍️ Nhập câu trả lời:
                </label>
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Gõ đáp án tại đây..."
                  className="w-full bg-slate-800 text-white px-5 py-4 rounded-xl border-2 border-slate-600 focus:border-amber-500 outline-none text-lg font-semibold transition-all shadow-inner"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  autoFocus
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 relative z-10">
              <button
                onClick={handleSubmit}
                className="relative flex-1 bg-linear-to-br from-green-600 via-green-700 to-green-800 hover:from-green-500 hover:via-green-600 hover:to-green-700 text-white font-black py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 border-2 border-green-400/30 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                  Xác nhận
                </span>
              </button>
              <button
                onClick={onCancel}
                className="relative flex-1 bg-linear-to-br from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:via-red-600 hover:to-red-700 text-white font-black py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 border-2 border-red-400/30 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                  Hủy
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
