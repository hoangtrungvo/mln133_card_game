import { Users, Clock, Play, Lock, User } from 'lucide-react';
import { Room } from '@/types';

interface RoomListProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}

export default function RoomList({ rooms, onJoinRoom }: RoomListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => {
        const playerCount = room.players.length;
        const isFull = playerCount >= room.maxPlayers;
        const isInProgress = room.status === 'in-progress';
        
        let statusConfig = {
          color: 'bg-green-500/20 border-green-500/50 text-green-400',
          icon: Clock,
          text: `Đang chờ (${playerCount}/${room.maxPlayers})`
        };
        
        if (isInProgress) {
          statusConfig = {
            color: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
            icon: Play,
            text: 'Đang chơi'
          };
        } else if (isFull) {
          statusConfig = {
            color: 'bg-red-500/20 border-red-500/50 text-red-400',
            icon: Lock,
            text: 'Đầy'
          };
        } else if (playerCount === 1) {
          statusConfig = {
            color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
            icon: Clock,
            text: `Đang chờ (${playerCount}/${room.maxPlayers})`
          };
        }
        
        const StatusIcon = statusConfig.icon;
        
        return (
          <div
            key={room.id}
            className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-700/50 
              hover:border-blue-500/50 transition-all duration-200 shadow-xl hover:shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{room.name}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {room.id.substring(0, 12)}...</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${statusConfig.color} text-xs font-semibold`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusConfig.text}</span>
              </div>
            </div>
            
            {/* Players */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400 font-medium">Người chơi:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {room.players.length > 0 ? (
                  room.players.map((player) => (
                    <div
                      key={player.id}
                      className={`inline-flex items-center gap-1.5 ${
                        player.team === 'red' 
                          ? 'bg-red-500/20 border-red-500/50 text-red-300' 
                          : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      } border px-3 py-1.5 rounded-lg text-sm font-medium`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{player.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">Chưa có người chơi</p>
                )}
              </div>
            </div>
            
            {/* Join Button */}
            <button
              onClick={() => onJoinRoom(room.id)}
              disabled={isFull || isInProgress}
              className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${
                isFull || isInProgress
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isFull || isInProgress ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Không thể tham gia
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Tham gia phòng
                </span>
              )}
            </button>
          </div>
        );
      })}
      
      {rooms.length === 0 && (
        <div className="col-span-full">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-12 border-2 border-slate-700/50 text-center">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">Không có phòng nào</p>
            <p className="text-slate-500 text-sm">Liên hệ admin để tạo phòng mới</p>
          </div>
        </div>
      )}
    </div>
  );
}
