import { Trophy, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '@/types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  const getRankIcon = (index: number) => {
    if (index === 0) {
      return <Trophy className="w-5 h-5 text-yellow-400" />;
    } else if (index === 1) {
      return <Medal className="w-5 h-5 text-gray-300" />;
    } else if (index === 2) {
      return <Award className="w-5 h-5 text-amber-600" />;
    }
    return null;
  };

  const getRankBgColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
    if (index === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (index === 2) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
    return 'bg-slate-800/50 border-slate-700/50';
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 border-2 border-slate-700/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-4xl font-bold text-white">Bảng Xếp Hạng</h2>
      </div>
      
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Chưa có dữ liệu bảng xếp hạng</p>
          <p className="text-slate-500 text-sm mt-2">Hãy chơi game để xuất hiện trên bảng xếp hạng!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-700">
                  <th className="text-left text-slate-400 py-4 px-4 font-semibold">Hạng</th>
                  <th className="text-left text-slate-400 py-4 px-4 font-semibold">Tên Người Chơi</th>
                  <th className="text-center text-slate-400 py-4 px-4 font-semibold">Điểm</th>
                  <th className="text-center text-slate-400 py-4 px-4 font-semibold">Thắng</th>
                  <th className="text-center text-slate-400 py-4 px-4 font-semibold">Tổng Trận</th>
                  <th className="text-center text-slate-400 py-4 px-4 font-semibold">Sát Thương</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={entry.playerName}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-all duration-200 ${getRankBgColor(index)}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <span className="text-white font-bold text-lg">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-semibold text-lg">{entry.playerName}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-yellow-400 font-bold text-lg">{entry.score.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-green-400 font-semibold">{entry.wins}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-slate-300">{entry.gamesPlayed}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-red-400 font-semibold">{entry.totalDamageDealt.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {entries.map((entry, index) => (
              <div
                key={entry.playerName}
                className={`rounded-xl p-4 border-2 ${getRankBgColor(index)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getRankIcon(index)}
                    <span className="text-white font-bold text-lg">#{index + 1}</span>
                  </div>
                  <span className="text-yellow-400 font-bold text-xl">{entry.score.toLocaleString()}</span>
                </div>
                <div className="text-white font-semibold text-lg mb-3">{entry.playerName}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-slate-400">Thắng</div>
                    <div className="text-green-400 font-semibold">{entry.wins}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Trận</div>
                    <div className="text-slate-300 font-semibold">{entry.gamesPlayed}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Sát Thương</div>
                    <div className="text-red-400 font-semibold">{entry.totalDamageDealt.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
