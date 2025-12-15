'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Room } from '@/types';
import RoomList from '@/components/RoomList';

export default function MultiplayerPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      const socket = io({
        path: '/api/socket',
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('request-rooms');
      });

      socket.on('rooms-update', (updatedRooms: Room[]) => {
        setRooms(updatedRooms);
        setLoading(false);
      });

      socket.on('player-joined', (data: { roomId: string; playerId: string }) => {
        // Navigate to game page after successfully joining
        console.log('Player joined event received:', data);
        if (data.roomId && data.playerId) {
          // Save playerId to localStorage
          localStorage.setItem('playerId', data.playerId);
          router.push(`/game/${data.roomId}?playerId=${data.playerId}`);
        }
      });

      socket.on('error', (message: string) => {
        alert(message);
        setShowNameInput(false);
        setSelectedRoomId('');
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [router]);

  const handleJoinRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowNameInput(true);
  };

  const handleSubmitName = () => {
    if (!playerName.trim()) {
      alert('Vui lòng nhập tên người chơi');
      return;
    }

    if (!selectedRoomId) {
      alert('Không có phòng nào được chọn');
      return;
    };

    if (!socketRef.current || !socketRef.current.connected) {
      alert('Chưa kết nối tới server. Vui lòng thử lại!');
      return;
    }

    console.log('Sending join-room request:', { roomId: selectedRoomId, playerName: playerName.trim() });

    // Store player name (server will generate and return the player ID)
    localStorage.setItem('playerName', playerName);

    // Join the room via socket
    socketRef.current.emit('join-room', {
      roomId: selectedRoomId,
      playerName: playerName.trim(),
    });

    console.log('join-room event emitted');

    // Optionally, you can set currentPlayerId here if the server returns it immediately
    // For now, we wait for the 'player-joined' event to navigate
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">⚔️ Phòng Chơi</h1>
          <p className="text-gray-300">Chọn phòng để tham gia trận chiến!</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all"
          >
            ← Quay lại
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-white text-xl">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            Đang tải danh sách phòng...
          </div>
        )}

        {/* Room List */}
        {!loading && <RoomList rooms={rooms} onJoinRoom={handleJoinRoom} />}

        {/* Refresh Button */}
        {!loading && (
          <div className="text-center mt-8">
            <button
              onClick={() => socketRef.current?.emit('request-rooms')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
              🔄 Làm mới danh sách
            </button>
          </div>
        )}
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border-2 border-gray-600">
            <h2 className="text-2xl font-bold text-white mb-4">Nhập tên của bạn</h2>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitName()}
              placeholder="Tên người chơi"
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 border-2 border-gray-600 focus:border-blue-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSubmitName}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                Tham gia
              </button>
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setSelectedRoomId('');
                  setPlayerName('');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
