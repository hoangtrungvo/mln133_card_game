'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-xl">
            <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Trò Chơi Thẻ Bài
          </h1>
          <p className="text-lg text-slate-400 font-light">Đấu trường chiến thuật đầy kịch tính!</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Multiplayer - Primary Action */}
          <button
            onClick={() => router.push('/multiplayer')}
            className="group bg-gradient-to-br from-blue-600/90 to-blue-700/90 hover:from-blue-500 hover:to-blue-600 
              border-2 border-blue-500/50 hover:border-blue-400 text-white p-8 rounded-2xl shadow-xl 
              transform transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-white/90 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-3xl font-bold mb-2 text-white">Bắt Đầu Chơi</h2>
            <p className="text-base text-blue-100">Tham gia phòng và chiến đấu với người chơi khác!</p>
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="group bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700/50 hover:border-yellow-500/50
              text-white p-8 rounded-2xl shadow-xl transform transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-400 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <h2 className="text-3xl font-bold mb-2 text-white">Bảng Xếp Hạng</h2>
            <p className="text-base text-slate-400">Xem top cao thủ và điểm số!</p>
          </button>
        </div>

        {/* How to Play Section - Enhanced */}
        <div className="bg-slate-800/60 border-2 border-slate-700/50 text-white p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-3xl font-bold text-white">Hướng Dẫn Chơi</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Flow */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-400 mb-3">📋 Các Bước Chơi</h3>
              <div className="space-y-3 text-slate-300">
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">1</span>
                  <p className="text-base">Chọn <span className="text-blue-400 font-semibold">"Bắt Đầu Chơi"</span> để vào phòng chơi</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">2</span>
                  <p className="text-base">Nhập tên và chọn phòng có chỗ trống</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">3</span>
                  <p className="text-base">Chờ người chơi thứ 2 tham gia</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">4</span>
                  <p className="text-base">Nhấn <span className="text-green-400 font-semibold">"Sẵn Sàng"</span> khi cả 2 đã vào</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">5</span>
                  <p className="text-base">Trả lời câu hỏi và chơi thẻ bài trên lượt của bạn</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500/20 text-blue-400 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">6</span>
                  <p className="text-base">Giảm HP đối thủ về 0 để <span className="text-yellow-400 font-semibold">chiến thắng!</span></p>
                </div>
              </div>
            </div>

            {/* Card Types */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-400 mb-3">🃏 Loại Thẻ Bài</h3>
              <div className="space-y-2.5 text-slate-300">
                <div className="flex items-center bg-slate-700/30 rounded-lg p-2.5">
                  <span className="text-green-400 mr-2">🛡️</span>
                  <div>
                    <p className="font-semibold text-white">Phòng Thủ</p>
                    <p className="text-sm text-slate-400">Hồi +10 HP</p>
                  </div>
                </div>
                <div className="flex items-center bg-slate-700/30 rounded-lg p-2.5">
                  <span className="text-green-400 mr-2">💚</span>
                  <div>
                    <p className="font-semibold text-white">Hồi Máu</p>
                    <p className="text-sm text-slate-400">Hồi +15 HP</p>
                  </div>
                </div>
                <div className="flex items-center bg-slate-700/30 rounded-lg p-2.5">
                  <span className="text-red-400 mr-2">🔥</span>
                  <div>
                    <p className="font-semibold text-white">Chém Mạnh</p>
                    <p className="text-sm text-slate-400">Gây -20 HP</p>
                  </div>
                </div>
                <div className="flex items-center bg-slate-700/30 rounded-lg p-2.5">
                  <span className="text-yellow-400 mr-2">⚡</span>
                  <div>
                    <p className="font-semibold text-white">Siêu Phép</p>
                    <p className="text-sm text-slate-400">Gây -25 HP</p>
                  </div>
                </div>
                <div className="flex items-center bg-slate-700/30 rounded-lg p-2.5">
                  <span className="text-blue-400 mr-2">💧</span>
                  <div>
                    <p className="font-semibold text-white">Giải Độc</p>
                    <p className="text-sm text-slate-400">Hồi +18 HP</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-200">
                  <span className="font-semibold">💡 Mẹo:</span> Trả lời đúng câu hỏi để sử dụng thẻ bài. Mỗi thẻ có hiệu ứng khác nhau!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm mt-8">
          <p>Powered by Next.js & WebSocket</p>
        </div>
      </div>
    </div>
  );
}
