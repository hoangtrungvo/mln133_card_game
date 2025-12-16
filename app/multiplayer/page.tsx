'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Loader2, User, X, LogIn } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { MatchQueue } from '@/types';

// Module-level socket to persist across Fast Refresh
let globalSocket: Socket | null = null;
let socketHandlersAttached = false; // Track if handlers are already attached

export default function MultiplayerPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const socketInitializedRef = useRef(false); // Track if socket was already initialized
  const [queue, setQueue] = useState<MatchQueue | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInQueue, setIsInQueue] = useState(false);
  const [isJoining, setIsJoining] = useState(false); // Prevent duplicate join requests

  useEffect(() => {
    // Check for saved player name
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }

    // Function to attach socket handlers (must be reattached on Fast Refresh for React state)
    const attachSocketHandlers = (socket: Socket) => {
      console.log('Attaching socket handlers to socket:', socket.id);
      // Remove old handlers first
      socket.removeAllListeners('connect');
      socket.removeAllListeners('queue-update');
      socket.removeAllListeners('matched');
      socket.removeAllListeners('error');
      socket.removeAllListeners('disconnect');
      
      socket.on('connect', () => {
        const socketId = socket.id;
        console.log('Connected to server, socket ID:', socketId);
        // Store socket ID to identify our entry in the queue
        if (socketId) {
          const oldSocketId = localStorage.getItem('socketId');
          localStorage.setItem('socketId', socketId);
          
          // If socket ID changed (new connection), check if we were in queue and need to rejoin
          if (oldSocketId && oldSocketId !== socketId) {
            console.log('Socket ID changed from', oldSocketId, 'to', socketId, '- may need to rejoin queue');
          }
        }
        
        socket.emit('request-queue');
        
        // Don't auto-reconnect on connect - let user explicitly choose to reconnect
        // This prevents auto-reconnection when user has left the queue
      });

      socket.on('queue-update', (updatedQueue: MatchQueue) => {
        console.log('=== RECEIVED queue-update EVENT ===');
        console.log('Received queue-update:', updatedQueue.entries.length, 'entries');
        console.log('Queue entries:', updatedQueue.entries.map(e => ({ name: e.playerName, socket: e.socketId })));
        console.log('Current socket ID:', socket.id);
        setQueue(updatedQueue);
        setLoading(false);
        setIsJoining(false); // Reset joining flag when queue updates
        
        // Check if current player is in queue by socket ID (stored in socket.id)
        // We need to match by socket ID, not name, to handle multiple players with same name
        // Store socket ID when joining so we can identify our entry
        const savedSocketId = localStorage.getItem('socketId');
        
        if (savedSocketId) {
          const entry = updatedQueue.entries.find(
            e => e.socketId === savedSocketId
          );
          if (entry) {
            setCurrentPlayerId(entry.playerId);
            setIsInQueue(true);
          } else {
            // Player is not in queue - make sure state reflects this
            setIsInQueue(false);
            // Clear currentPlayerId if player is not in queue
            if (currentPlayerId) {
              setCurrentPlayerId(null);
            }
          }
        } else if (currentPlayerId) {
          // Fallback: check by playerId if socket ID not available
          const inQueue = updatedQueue.entries.some(e => e.playerId === currentPlayerId);
          setIsInQueue(inQueue);
          if (!inQueue) {
            setCurrentPlayerId(null);
          }
        }
      });

      socket.on('matched', (data: { roomId: string; playerId: string }) => {
        // Navigate to game page after being matched
        console.log('Matched event received:', data);
        if (data.roomId && data.playerId) {
          localStorage.setItem('playerId', data.playerId);
          router.push(`/game/${data.roomId}?playerId=${data.playerId}`);
        }
      });

      socket.on('error', (message: string) => {
        console.error('Socket error:', message);
        alert(message);
        setShowNameInput(false);
        setIsJoining(false); // Reset joining flag on error
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsJoining(false);
      });
    };
    
    // Initialize socket connection
    const initSocket = async () => {
      // Use global socket if it exists and is connected (persists across Fast Refresh)
      if (globalSocket && globalSocket.connected) {
        console.log('Reusing existing socket connection (Fast Refresh), socket ID:', globalSocket.id);
        socketRef.current = globalSocket;
        // Reattach handlers on Fast Refresh (React state setters change)
        attachSocketHandlers(globalSocket);
        globalSocket.emit('request-queue');
        return;
      }
      
      // If global socket exists but disconnected, reconnect it
      if (globalSocket && !globalSocket.connected) {
        console.log('Reconnecting global socket');
        globalSocket.connect();
        socketRef.current = globalSocket;
        attachSocketHandlers(globalSocket);
        return;
      }
      
      // Create new socket
      console.log('Creating new socket connection');
      const socket = io({
        path: '/api/socket',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      globalSocket = socket;
      socketRef.current = socket;
      socketInitializedRef.current = true;
      
      // Attach handlers
      attachSocketHandlers(socket);
      socketHandlersAttached = true;
    };

    initSocket();

    return () => {
      // Don't disconnect on Fast Refresh - the global socket persists
      // Only disconnect when actually navigating away (which would require manual cleanup)
      // For now, we keep the socket alive across Fast Refresh
      // The socket will be cleaned up when the page is actually closed/navigated away
    };
  }, [router]); // Removed currentPlayerId from dependencies to prevent reconnection loop

  const handleJoinQueue = () => {
    // Always show name input modal when joining queue
    setShowNameInput(true);
  };

  const handleSubmitName = () => {
    if (!playerName.trim()) {
      alert('Vui lòng nhập tên người chơi');
      return;
    }

    if (!socketRef.current || !socketRef.current.connected) {
      alert('Chưa kết nối tới server. Vui lòng thử lại!');
      return;
    }

    // Prevent duplicate join requests
    if (isJoining) {
      console.log('Already joining, ignoring duplicate request');
      return;
    }

    if (isInQueue) {
      console.log('Already in queue, ignoring join request');
      setShowNameInput(false);
      return;
    }

    setIsJoining(true);
    console.log('Sending join-queue request:', playerName.trim());
    console.log('Socket connected?', socketRef.current?.connected);
    console.log('Socket ID:', socketRef.current?.id);

    // Store player name
    localStorage.setItem('playerName', playerName.trim());

    // Join the queue via socket
    if (socketRef.current) {
      socketRef.current.emit('join-queue', {
        playerName: playerName.trim(),
      }, (response: any) => {
        // Callback to confirm the event was sent
        console.log('join-queue emit callback:', response);
      });
      console.log('Emitted join-queue event');
    } else {
      console.error('Socket is null!');
      alert('Socket connection lost. Please refresh the page.');
      setIsJoining(false);
      return;
    }

    setShowNameInput(false);
  };

  const handleLeaveQueue = () => {
    if (!socketRef.current) return;
    
    // Try to leave by playerId first, fallback to playerName if playerId is not available
    if (currentPlayerId) {
      socketRef.current.emit('leave-queue', { playerId: currentPlayerId });
    } else if (playerName.trim()) {
      socketRef.current.emit('leave-queue', { playerName: playerName.trim() });
    } else {
      alert('Không thể rời hàng chờ: Không tìm thấy thông tin người chơi');
      return;
    }
    
    // Clear state immediately
    setCurrentPlayerId(null);
    setIsInQueue(false);
  };

  const handleReconnect = () => {
    if (!socketRef.current) return;
    
    // Reconnect is now IP-based, name is optional for updating
    socketRef.current.emit('reconnect-player', { 
      playerName: playerName.trim() || undefined 
    });
  };

  // Update currentPlayerId when queue updates
  // This is handled in the queue-update socket handler, so this useEffect is mainly for initial state
  // Removed to prevent conflicts with the socket handler

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600 
              text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">Hàng Chờ</h1>
          </div>
          <p className="text-center text-slate-400 text-lg">
            Tham gia hàng chờ để được ghép cặp ngẫu nhiên với người chơi khác!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-xl">Đang tải...</p>
          </div>
        )}

        {/* Queue Display */}
        {!loading && queue && (
          <div className="space-y-6">
            {/* Queue Status Card */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-700/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Trạng Thái Hàng Chờ</h2>
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
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-1">Số người trong hàng chờ</div>
                  <div className="text-3xl font-bold text-white">
                    {queue.entries.length} / {queue.maxPlayers}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-1">Trạng thái</div>
                  <div className="text-lg font-semibold text-slate-300">
                    {queue.entries.length % 2 === 0 && queue.entries.length >= 2
                      ? '✅ Sẵn sàng ghép cặp'
                      : queue.entries.length === 0
                      ? 'Chưa có người chơi'
                      : '⏳ Đang chờ người chơi thêm'}
                  </div>
                </div>
              </div>
            </div>

            {/* Player List */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-700/50 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4">Danh Sách Người Chơi</h3>
              
              {queue.entries.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Chưa có người chơi nào trong hàng chờ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {queue.entries.map((entry, index) => (
                    <div
                      key={entry.playerId}
                      className={`p-3 rounded-lg border-2 ${
                        entry.playerId === currentPlayerId
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-slate-700/30 border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index < 3
                            ? index === 0
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : index === 1
                              ? 'bg-gray-400/20 text-gray-300'
                              : 'bg-amber-600/20 text-amber-400'
                            : 'bg-slate-600 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-white font-medium flex-1">{entry.playerName}</span>
                        {entry.playerId === currentPlayerId && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Bạn</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!isInQueue ? (
                <>
                  <button
                    onClick={handleJoinQueue}
                    disabled={queue.status !== 'waiting' || queue.entries.length >= queue.maxPlayers}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 
                      hover:from-green-500 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed
                      text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <LogIn className="w-5 h-5" />
                    {playerName ? `Tham Gia Hàng Chờ (${playerName})` : 'Tham Gia Hàng Chờ'}
                  </button>
                  
                  <button
                    onClick={handleReconnect}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                      text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <User className="w-5 h-5" />
                    {playerName ? `Kết Nối Lại (${playerName})` : 'Kết Nối Lại'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLeaveQueue}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700
                    text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <X className="w-5 h-5" />
                  Rời Hàng Chờ
                </button>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                <strong>💡 Hướng dẫn:</strong> Tham gia hàng chờ và chờ admin bắt đầu ghép cặp. 
                Khi có số chẵn người chơi (tối đa 28), admin có thể bắt đầu ghép cặp ngẫu nhiên. 
                Nếu bạn bị ngắt kết nối, hãy nhập lại tên cũ để kết nối lại vào phòng của bạn.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border-2 border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Nhập tên của bạn</h2>
              </div>
              <button
                onClick={() => {
                  setShowNameInput(false);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitName()}
              placeholder="Nhập tên người chơi..."
              className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg mb-6 border-2 border-slate-600 
                focus:border-blue-500 focus:outline-none transition-colors"
              autoFocus
              maxLength={50}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNameInput(false);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitName}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Tham Gia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
