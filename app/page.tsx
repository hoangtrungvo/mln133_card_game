'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-xl">
            <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Trò Chơi Thẻ Bài
          </h1>
          <p className="text-lg text-slate-400 font-light">Đấu trường chiến thuật!</p>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Multiplayer */}
          <button
            onClick={() => router.push('/multiplayer')}
            className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600
              text-white p-6 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-1.5 text-white">Chơi Multiplayer</h2>
            <p className="text-sm text-slate-400">Tham gia phòng và chiến đấu!</p>
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600
              text-white p-6 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-1.5 text-white">Bảng Xếp Hạng</h2>
            <p className="text-sm text-slate-400">Xem top cao thủ!</p>
          </button>

          {/* Admin */}
          <button
            onClick={() => router.push('/admin')}
            className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600
              text-white p-6 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-1.5 text-white">Quản Trị</h2>
            <p className="text-sm text-slate-400">Quản lý phòng và cấu hình</p>
          </button>

          {/* How to Play */}
          <div className="bg-slate-800/80 border border-slate-700/50 text-white p-6 rounded-xl shadow-lg">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-3 text-white">Cách Chơi</h2>
            <div className="text-xs text-slate-400 text-left space-y-1.5">
              <p>• Phòng Thủ: +10 HP</p>
              <p>• Hồi Máu: +15 HP</p>
              <p>• Chém Mạnh: -20 HP</p>
              <p>• Siêu Phép: -25 HP</p>
              <p>• Giải Độc: +18 HP</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs">
          <p>Powered by Next.js & WebSocket</p>
        </div>
      </div>
    </div>
  );
}
