import { LeaderboardEntry } from '@/types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="bg-linear-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 border-gray-700">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">🏆 Bảng Xếp Hạng</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 py-3 px-2">Hạng</th>
              <th className="text-left text-gray-400 py-3 px-2">Tên</th>
              <th className="text-center text-gray-400 py-3 px-2">Điểm</th>
              <th className="text-center text-gray-400 py-3 px-2">Thắng</th>
              <th className="text-center text-gray-400 py-3 px-2">Tổng trận</th>
              <th className="text-center text-gray-400 py-3 px-2">Sát thương</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              let rankIcon = '';
              if (index === 0) rankIcon = '🥇';
              else if (index === 1) rankIcon = '🥈';
              else if (index === 2) rankIcon = '🥉';
              
              return (
                <tr
                  key={entry.playerName}
                  className="border-b border-gray-800 hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-2 text-white font-bold">
                    {rankIcon} {index + 1}
                  </td>
                  <td className="py-3 px-2 text-white font-semibold">{entry.playerName}</td>
                  <td className="py-3 px-2 text-center text-yellow-400 font-bold">{entry.score}</td>
                  <td className="py-3 px-2 text-center text-green-400">{entry.wins}</td>
                  <td className="py-3 px-2 text-center text-gray-300">{entry.gamesPlayed}</td>
                  <td className="py-3 px-2 text-center text-red-400">{entry.totalDamageDealt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {entries.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            Chưa có dữ liệu bảng xếp hạng
          </div>
        )}
      </div>
    </div>
  );
}
