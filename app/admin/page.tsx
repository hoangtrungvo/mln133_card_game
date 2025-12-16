'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { AdminConfig, Room, MatchQueue } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [queue, setQueue] = useState<MatchQueue | null>(null);
  const [maxRooms, setMaxRooms] = useState(5);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingQuestions, setUploadingQuestions] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [startingMatching, setStartingMatching] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Initialize socket for queue updates
    const socket = io({
      path: '/api/socket',
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Admin connected to server');
      socket.emit('request-queue');
    });
    
    socket.on('queue-update', (updatedQueue: MatchQueue) => {
      setQueue(updatedQueue);
    });
    
    socket.on('matching-complete', (data: { roomsCreated: number }) => {
      alert(`Ghép cặp hoàn tất! Đã tạo ${data.roomsCreated} phòng.`);
      setStartingMatching(false);
      fetchData();
    });
    
    socket.on('error', (message: string) => {
      alert(message);
      setStartingMatching(false);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, roomsRes] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/rooms'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        setMaxRooms(configData.maxRooms);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaxRooms = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxRooms }),
      });

      if (res.ok) {
        alert('Cập nhật thành công!');
        fetchData();
      } else {
        alert('Cập nhật thất bại!');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Lỗi khi cập nhật!');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Vui lòng nhập tên phòng');
      return;
    }

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });

      if (res.ok) {
        alert('Tạo phòng thành công!');
        setNewRoomName('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Tạo phòng thất bại!');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Lỗi khi tạo phòng!');
    }
  };

  const handleStartMatching = async () => {
    if (!queue) {
      alert('Không có thông tin hàng chờ');
      return;
    }
    
    if (queue.entries.length < 2) {
      alert('Cần ít nhất 2 người chơi để bắt đầu ghép cặp');
      return;
    }
    
    if (queue.entries.length % 2 !== 0) {
      alert('Cần số chẵn người chơi để ghép cặp (hiện tại: ' + queue.entries.length + ')');
      return;
    }
    
    if (queue.status !== 'waiting') {
      alert('Ghép cặp đang trong tiến trình hoặc đã hoàn tất');
      return;
    }
    
    if (!confirm(`Bắt đầu ghép cặp ${queue.entries.length} người chơi thành ${queue.entries.length / 2} trận đấu?`)) {
      return;
    }
    
    setStartingMatching(true);
    
    if (socketRef.current) {
      socketRef.current.emit('admin-start-matching');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Bạn có chắc muốn xóa phòng này?')) return;

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Xóa phòng thành công!');
        fetchData();
      } else {
        alert('Xóa phòng thất bại!');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Lỗi khi xóa phòng!');
    }
  };

  const handleResetLeaderboard = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ bảng xếp hạng? Hành động này không thể hoàn tác!')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/leaderboard', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminPassword}`,
        },
      });

      if (res.ok) {
        alert('Đã reset bảng xếp hạng thành công!');
      } else {
        const data = await res.json();
        alert(data.error || 'Reset thất bại!');
      }
    } catch (error) {
      console.error('Error resetting leaderboard:', error);
      alert('Lỗi khi reset bảng xếp hạng!');
    }
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Vui lòng chọn file CSV!');
      return;
    }

    setUploadingQuestions(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminPassword}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Nhập câu hỏi thành công! ${data.message}`);
        if (data.errors && data.errors.length > 0) {
          console.warn('Import warnings:', data.errors);
        }
      } else {
        alert(data.error || 'Nhập câu hỏi thất bại!');
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      alert('Lỗi khi nhập câu hỏi!');
    } finally {
      setUploadingQuestions(false);
      e.target.value = ''; // Reset input
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Đang tải...</div>
      </div>
    );
  }

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 border-2 border-gray-700 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">🔐 Xác thực Admin</h1>
          
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Mật khẩu Admin:</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setIsAuthenticated(true)}
              placeholder="Nhập mật khẩu"
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setIsAuthenticated(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">⚙️ Quản Trị</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all"
          >
            ← Quay lại
          </button>
        </div>

        {/* Configuration Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Cấu hình</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="text-white font-semibold">Số phòng tối đa:</label>
            <input
              type="number"
              value={maxRooms}
              onChange={(e) => setMaxRooms(Number(e.target.value))}
              min={1}
              max={20}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg w-24 border-2 border-gray-600"
            />
            <button
              onClick={handleUpdateMaxRooms}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all"
            >
              Cập nhật
            </button>
          </div>

          {config && (
            <div className="mt-4 text-gray-300 text-sm">
              <div>🏥 HP mặc định: {config.defaultPlayerHealth}</div>
              <div>🃏 Số thẻ mỗi người: {config.cardsPerPlayer}</div>
            </div>
          )}
        </div>

        {/* Leaderboard & Questions Management */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">🎮 Quản lý Game</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reset Leaderboard */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">🏆 Bảng xếp hạng</h3>
              <p className="text-gray-400 text-sm mb-3">
                Xóa toàn bộ dữ liệu bảng xếp hạng
              </p>
              <button
                onClick={handleResetLeaderboard}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
              >
                🗑️ Reset Leaderboard
              </button>
            </div>

            {/* Import Questions */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">❓ Câu hỏi</h3>
              <p className="text-gray-400 text-sm mb-3">
                Import câu hỏi từ file CSV
              </p>
              <label className="w-full block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportQuestions}
                  disabled={uploadingQuestions}
                  className="hidden"
                />
                <div className={`w-full text-center px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  uploadingQuestions 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}>
                  {uploadingQuestions ? '⏳ Đang tải...' : '📁 Chọn file CSV'}
                </div>
              </label>
              <p className="text-gray-500 text-xs mt-2">
                Format: type,question,answer,option1,option2,...
              </p>
            </div>
          </div>
        </div>

        {/* Queue Management Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">🎯 Quản Lý Hàng Chờ</h2>
          
          {queue && (
            <div className="mb-6">
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Số người trong hàng chờ</div>
                    <div className="text-3xl font-bold text-white">
                      {queue.entries.length} / {queue.maxPlayers}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-semibold ${
                    queue.status === 'waiting' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : queue.status === 'matching'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  }`}>
                    {queue.status === 'waiting' ? 'Đang chờ' : queue.status === 'matching' ? 'Đang ghép cặp' : 'Đã ghép'}
                  </div>
                </div>
                
                <div className="text-sm text-gray-300 mb-4">
                  {queue.entries.length % 2 === 0 && queue.entries.length >= 2
                    ? '✅ Sẵn sàng ghép cặp'
                    : queue.entries.length === 0
                    ? 'Chưa có người chơi'
                    : '⏳ Đang chờ người chơi thêm (cần số chẵn)'}
                </div>
                
                {queue.entries.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-400 mb-2">Danh sách người chơi:</div>
                    <div className="flex flex-wrap gap-2">
                      {queue.entries.map((entry, index) => (
                        <span
                          key={entry.playerId}
                          className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm"
                        >
                          {index + 1}. {entry.playerName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleStartMatching}
                disabled={startingMatching || queue.status !== 'waiting' || queue.entries.length < 2 || queue.entries.length % 2 !== 0}
                className={`w-full py-4 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  startingMatching || queue.status !== 'waiting' || queue.entries.length < 2 || queue.entries.length % 2 !== 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {startingMatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang ghép cặp...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Bắt Đầu Ghép Cặp ({queue.entries.length} người → {queue.entries.length / 2} trận)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Create Room Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">➕ Tạo phòng mới</h2>
          
          <div className="flex gap-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              placeholder="Tên phòng"
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border-2 border-gray-600"
            />
            <button
              onClick={handleCreateRoom}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition-all"
            >
              Tạo phòng
            </button>
          </div>
        </div>

        {/* Rooms List */}
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">🏠 Danh sách phòng ({rooms.length}/{maxRooms})</h2>
          
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white font-bold text-lg">{room.name}</h3>
                  <div className="text-sm text-gray-400">
                    ID: {room.id} | Trạng thái: {room.status} | Người chơi: {room.players.length}/{room.maxPlayers}
                  </div>
                  {room.players.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {room.players.map((player) => (
                        <span
                          key={player.id}
                          className={`text-xs px-2 py-1 rounded ${
                            player.team === 'red' ? 'bg-red-500' : 'bg-blue-500'
                          } text-white`}
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
                >
                  Xóa
                </button>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Chưa có phòng nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
