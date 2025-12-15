import { Room } from '@/types';

interface RoomListProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
}

export default function RoomList({ rooms, onJoinRoom }: RoomListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => {
        const playerCount = room.players.length;
        const isFull = playerCount >= room.maxPlayers;
        const isInProgress = room.status === 'in-progress';
        
        let statusColor = 'bg-green-500';
        let statusText = `Đang chờ (${playerCount}/${room.maxPlayers})`;
        
        if (isFull || isInProgress) {
          statusColor = 'bg-red-500';
          statusText = isInProgress ? 'Đang chơi' : 'Đầy';
        } else if (playerCount === 1) {
          statusColor = 'bg-yellow-500';
        }
        
        return (
          <div
            key={room.id}
            className="bg-linear-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 border-gray-700 hover:border-gray-500 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{room.name}</h3>
                <p className="text-sm text-gray-400">Room ID: {room.id.substring(0, 8)}</p>
              </div>
              <div className={`${statusColor} text-white text-xs px-3 py-1 rounded-full font-bold`}>
                {statusText}
              </div>
            </div>
            
            <div className="flex gap-2 mb-4">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`${player.team === 'red' ? 'bg-red-500' : 'bg-blue-500'} 
                    text-white text-xs px-3 py-1 rounded-full`}
                >
                  {player.name}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => onJoinRoom(room.id)}
              disabled={isFull || isInProgress}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg
                transition-all"
            >
              {isFull || isInProgress ? 'Không thể tham gia' : 'Tham gia phòng'}
            </button>
          </div>
        );
      })}
      
      {rooms.length === 0 && (
        <div className="col-span-full text-center text-gray-400 py-12">
          Không có phòng nào. Liên hệ admin để tạo phòng mới.
        </div>
      )}
    </div>
  );
}
