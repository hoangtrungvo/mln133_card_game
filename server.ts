import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as IOServer } from 'socket.io';
import { GameState, GameAction, PassiveEffect } from './types';
import { readGames, updateGame, updateRoom, readRooms, readQueue, updateQueue } from './lib/database';
import { joinRoom, leaveRoom, getAllRooms } from './lib/roomManager';
import { joinQueue, leaveQueue, leaveQueueByName, leaveQueueByIP, leaveQueueBySocketId, reconnectPlayer, startMatching, getQueue } from './lib/queueManager';
import { applyCardEffect, calculateScore, generateCard } from './lib/gameLogic';
import { updateLeaderboard } from './lib/leaderboard';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new IOServer(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Helper function to extract IP address from socket
  const getClientIP = (socket: any): string => {
    return socket.handshake.address || 
           (socket.request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           socket.request.socket.remoteAddress ||
           'unknown';
  };

  io.on('connection', (socket) => {
    const clientIP = getClientIP(socket);
    console.log('Client connected:', socket.id, 'from IP:', clientIP);

    // Helper function to apply damage with passive effects
    const applyDamageWithPassives = (
      target: any,
      baseDamage: number,
      attacker: any,
      gameState: GameState
    ): { finalDamage: number; blocked: boolean; countered: number } => {
      let damage = baseDamage;
      let blocked = false;
      let counterDamage = 0;
      
      // Check for weaken debuff on target (increases damage taken)
      const weakenEffect = gameState.passiveEffects.find(
        e => e.playerId === target.id && e.effect === 'weaken-debuff'
      );
      if (weakenEffect) {
        damage += weakenEffect.value || 5;
      }
      
      // Check for immunity-and-reduction
      const immunityEffect = gameState.passiveEffects.find(
        e => e.playerId === target.id && e.effect === 'immunity-and-reduction'
      );
      if (immunityEffect) {
        const metadata = immunityEffect.metadata || {};
        if (!metadata.immunityUsed) {
          // First hit - immune
          blocked = true;
          metadata.immunityUsed = true;
          immunityEffect.metadata = metadata;
          damage = 0;
        } else {
          // Subsequent hits - reduce by 30%
          damage = Math.floor(damage * 0.7);
        }
      }
      
      // Check for counter effects
      const counterEffect = gameState.passiveEffects.find(
        e => e.playerId === target.id && e.effect === 'counter-2.5x'
      );
      if (counterEffect && !blocked) {
        const multiplier = counterEffect.value || 2.5;
        counterDamage = Math.floor(damage * multiplier);
      }
      
      return { finalDamage: damage, blocked, countered: counterDamage };
    };

    // Request current game state for a room
    socket.on('request-game-state', async (data: { roomId: string }) => {
      const rooms = await readRooms();
      const room = rooms.find(r => r.id === data.roomId);
      
      if (room && room.gameState) {
        socket.join(data.roomId);
        socket.emit('game-update', room.gameState);
      } else {
        socket.emit('error', 'Room or game not found');
      }
    });

    // Send initial rooms list
    socket.on('request-rooms', async () => {
      const rooms = await getAllRooms();
      socket.emit('rooms-update', rooms);
    });

    // Join room
    socket.on('join-room', async (data: { roomId: string; playerName: string }) => {
      try {
        // Validate input
        if (!data.roomId || !data.playerName) {
          socket.emit('error', 'Invalid room ID or player name');
          return;
        }
        if (typeof data.playerName !== 'string' || data.playerName.trim().length === 0 || data.playerName.length > 50) {
          socket.emit('error', 'Player name must be between 1 and 50 characters');
          return;
        }
        
        console.log('Received join-room request:', data, 'from socket:', socket.id);
        
        try {
          const result = await joinRoom(data.roomId, data.playerName);
          
          console.log('Join room result:', { success: result.success, playerId: result.player?.id, error: result.error });
          
          if (result.success && result.player && result.room) {
            socket.join(data.roomId);
            console.log('Emitting player-joined to socket:', socket.id, 'with data:', { roomId: data.roomId, playerId: result.player.id });
            
            // Emit to the player who just joined
            socket.emit('player-joined', { 
              roomId: data.roomId, 
              playerId: result.player.id 
            });
            
            // Broadcast game update to all players in the room
            if (result.room.gameState) {
              io.to(data.roomId).emit('game-update', result.room.gameState);
            }
            
            // Update rooms list for all clients
            const rooms = await getAllRooms();
            io.emit('rooms-update', rooms);
          } else {
            console.log('Join room failed, emitting error:', result.error);
            socket.emit('error', result.error || 'Failed to join room');
          }
        } catch (error: any) {
          console.error('Error in join-room handler:', error);
          socket.emit('error', error.message || 'An error occurred while joining the room');
        }
      } catch (error: any) {
        console.error('Unexpected error in join-room:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Leave room
    socket.on('leave-room', async (data: { roomId: string; playerId: string }) => {
      try {
        // Validate input
        if (!data.roomId || !data.playerId) {
          socket.emit('error', 'Invalid room ID or player ID');
          return;
        }
        
        console.log('Received leave-room request:', data, 'from socket:', socket.id);
        
        try {
          const result = await leaveRoom(data.roomId, data.playerId);
          
          if (result.success) {
            socket.leave(data.roomId);
            io.to(data.roomId).emit('player-left', data.playerId);
            
            // Update rooms list for all clients
            const rooms = await getAllRooms();
            io.emit('rooms-update', rooms);
            
            console.log('Player left room successfully:', data.playerId);
          } else {
            console.log('Leave room failed:', result.error);
            socket.emit('error', result.error || 'Failed to leave room');
          }
        } catch (error: any) {
          console.error('Error in leave-room handler:', error);
          socket.emit('error', error.message || 'An error occurred while leaving the room');
        }
      } catch (error: any) {
        console.error('Unexpected error in leave-room:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Queue operations
    socket.on('request-queue', async () => {
      try {
        const queue = await getQueue();
        socket.emit('queue-update', queue);
      } catch (error: any) {
        console.error('Error fetching queue:', error);
        socket.emit('error', 'Failed to fetch queue');
      }
    });

    // Join queue
    socket.on('join-queue', async (data: { playerName: string }) => {
      try {
        if (!data.playerName || typeof data.playerName !== 'string') {
          socket.emit('error', 'Invalid player name');
          return;
        }
        
        // Get IP address from socket
        const clientIP = getClientIP(socket);
        console.log('Received join-queue request:', data, 'from socket:', socket.id, 'IP:', clientIP);
        
        // Helper to check if a socket ID is still connected
        const isSocketConnected = (socketIdToCheck: string): boolean => {
          return io.sockets.sockets.has(socketIdToCheck);
        };
        
        try {
          // NOTE: We don't pre-check the queue because:
          // 1. It causes race conditions (reading without lock)
          // 2. joinQueue() already handles duplicate socket IDs internally
          // 3. With ngrok, all players have the same IP, so we can't use IP for duplicates
          // 4. Socket ID is the unique identifier
          // 5. Fast Refresh reconnection is handled by the disconnect grace period
          
          console.log('[SERVER] join-queue request received:', { playerName: data.playerName, socketId: socket.id, ip: clientIP });
          console.log('[SERVER] Calling joinQueue...');
          const result = await joinQueue(data.playerName, socket.id, clientIP, isSocketConnected);
          console.log('joinQueue result:', { success: result.success, hasEntry: !!result.entry, error: result.error });
          
          if (result.success && result.entry) {
            // Use the queue from the result (already updated and written)
            // This avoids race conditions from reading the file again
            if (!result.queue) {
              console.error('ERROR: result.queue is missing! This should not happen.');
              const fallbackQueue = await getQueue();
              console.log('Using fallback queue with', fallbackQueue.entries.length, 'entries');
              io.emit('queue-update', fallbackQueue);
              return;
            }
            
            const queue = result.queue;
            console.log('Queue after join - Total entries:', queue.entries.length);
            console.log('Queue entries:', queue.entries.map(e => ({ name: e.playerName, socket: e.socketId, id: e.playerId })));
            
            // Verify the entry we just added is in the queue
            const foundEntry = queue.entries.find(e => e.socketId === socket.id);
            if (!foundEntry) {
              console.error('WARNING: Entry not found in queue after join! Socket:', socket.id, 'Expected entry:', result.entry);
            }
            
            console.log('Broadcasting queue-update to all clients. Queue has', queue.entries.length, 'entries');
            io.emit('queue-update', queue);
            console.log('Emitted queue-update event to all sockets');
            
            console.log('Player joined queue:', result.entry.playerName, 'IP:', clientIP, 'Socket:', socket.id);
          } else if (result.room && result.player) {
            // Player is already in an active room - automatically reconnect them
            socket.join(result.room.id);
            
            socket.emit('matched', {
              roomId: result.room.id,
              playerId: result.player.id
            });
            
            // Send game state
            if (result.room.gameState) {
              socket.emit('game-update', result.room.gameState);
            }
            
            console.log('Player redirected to active room:', data.playerName, 'room:', result.room.id, 'IP:', clientIP);
          } else {
            const errorMsg = result.error || 'Failed to join queue';
            console.error('Join queue failed:', errorMsg);
            socket.emit('error', errorMsg);
          }
        } catch (error: any) {
          console.error('Error in join-queue handler:', error);
          socket.emit('error', error.message || 'An error occurred while joining queue');
        }
      } catch (error: any) {
        console.error('Unexpected error in join-queue:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Leave queue
    socket.on('leave-queue', async (data: { playerId?: string; playerName?: string }) => {
      try {
        if (!data.playerId && !data.playerName) {
          socket.emit('error', 'Invalid player ID or name');
          return;
        }
        
        console.log('Received leave-queue request:', data);
        
        try {
          let result;
          if (data.playerId) {
            result = await leaveQueue(data.playerId);
          } else if (data.playerName) {
            // Pass socket ID if available to make name-based leave more precise
            result = await leaveQueueByName(data.playerName, socket.id);
          } else {
            socket.emit('error', 'Invalid player ID or name');
            return;
          }
          
          if (result.success) {
            // Broadcast queue update
            const queue = await getQueue();
            io.emit('queue-update', queue);
            
            console.log('Player left queue:', data.playerId || data.playerName);
          } else {
            socket.emit('error', result.error || 'Failed to leave queue');
          }
        } catch (error: any) {
          console.error('Error in leave-queue handler:', error);
          socket.emit('error', error.message || 'An error occurred while leaving queue');
        }
      } catch (error: any) {
        console.error('Unexpected error in leave-queue:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Reconnect player (now uses IP address instead of name)
    socket.on('reconnect-player', async (data: { playerName?: string }) => {
      try {
        // Get IP address from socket
        const clientIP = getClientIP(socket);
        console.log('Received reconnect request from socket:', socket.id, 'IP:', clientIP, 'name:', data.playerName);
        
        try {
          const result = await reconnectPlayer(clientIP, socket.id, data.playerName);
          
          if (result.success) {
            if (result.room && result.player) {
              // Player reconnected to an active room
              socket.join(result.room.id);
              
              socket.emit('matched', {
                roomId: result.room.id,
                playerId: result.player.id
              });
              
              // Send game state
              if (result.room.gameState) {
                socket.emit('game-update', result.room.gameState);
              }
              
              console.log('Player reconnected to room:', result.room.id, 'IP:', clientIP);
            } else {
              // Player is in queue - send queue update
              const queue = await getQueue();
              socket.emit('queue-update', queue);
              console.log('Player reconnected to queue, IP:', clientIP);
            }
          } else {
            socket.emit('error', result.error || 'No active game or queue entry found. Please join the queue.');
          }
        } catch (error: any) {
          console.error('Error in reconnect-player handler:', error);
          socket.emit('error', error.message || 'An error occurred while reconnecting');
        }
      } catch (error: any) {
        console.error('Unexpected error in reconnect-player:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Admin start matching
    socket.on('admin-start-matching', async () => {
      try {
        console.log('Admin requested to start matching');
        
        try {
          const result = await startMatching();
          
          if (result.success && result.queueEntries) {
            // Get all created rooms
            const rooms = await getAllRooms();
            const newlyCreatedRooms = rooms.filter(r => {
              const timeDiff = Date.now() - r.createdAt;
              return timeDiff < 5000; // Rooms created in last 5 seconds
            });
            
            // Notify each matched player using queue entries
            for (const entry of result.queueEntries) {
              if (entry.assignedRoomId && entry.socketId) {
                const room = newlyCreatedRooms.find(r => r.id === entry.assignedRoomId);
                if (room && room.gameState) {
                  const player = room.gameState.players.find(p => p.id === entry.playerId);
                  if (player) {
                    const playerSocket = io.sockets.sockets.get(entry.socketId);
                    if (playerSocket) {
                      playerSocket.join(room.id);
                      playerSocket.emit('matched', {
                        roomId: room.id,
                        playerId: player.id
                      });
                      playerSocket.emit('game-update', room.gameState);
                    }
                  }
                }
              }
            }
            
            // Broadcast game updates to all rooms
            for (const room of newlyCreatedRooms) {
              if (room.gameState) {
                io.to(room.id).emit('game-update', room.gameState);
              }
            }
            
            // Reset queue to waiting status and clear entries after notification
            await updateQueue(async (queue) => {
              if (queue) {
                queue.entries = [];
                queue.status = 'waiting';
                queue.matchedAt = undefined;
              }
              return queue;
            });
            
            // Broadcast queue update
            const queue = await getQueue();
            io.emit('queue-update', queue);
            
            // Update rooms list
            io.emit('rooms-update', rooms);
            
            socket.emit('matching-complete', { roomsCreated: result.roomsCreated });
            console.log('Matching completed. Created', result.roomsCreated, 'rooms');
          } else {
            socket.emit('error', result.error || 'Failed to start matching');
          }
        } catch (error: any) {
          console.error('Error in admin-start-matching handler:', error);
          socket.emit('error', error.message || 'An error occurred while starting matching');
        }
      } catch (error: any) {
        console.error('Unexpected error in admin-start-matching:', error);
        socket.emit('error', 'An unexpected error occurred');
      }
    });

    // Player ready
    socket.on('player-ready', async (data: { roomId: string; playerId: string }) => {
      const rooms = await readRooms();
      const room = rooms.find(r => r.id === data.roomId);
      
      if (room && room.gameState) {
        const player = room.gameState.players.find(p => p.id === data.playerId);
        if (player) {
          player.ready = true;
          
          const allReady = room.gameState.players.every(p => p.ready);
          
          if (allReady && room.gameState.status === 'waiting') {
            room.gameState.status = 'active';
            room.gameState.startTime = Date.now();
            room.status = 'in-progress';
            
            // Initialize hasDrawnCardThisTurn for all players
            for (const p of room.gameState.players) {
              p.hasDrawnCardThisTurn = false;
            }
            // The first player (red team) hasn't drawn a card yet
            const firstPlayer = room.gameState.players.find(p => p.team === room.gameState.currentTurn);
            if (firstPlayer) {
              firstPlayer.hasDrawnCardThisTurn = false;
            }
            
            await updateRoom(data.roomId, { status: room.status, gameState: room.gameState });
            await updateGame(room.gameState.id, { status: 'active', startTime: room.gameState.startTime });
            
            io.to(data.roomId).emit('game-started', room.gameState);
          } else {
            // Update room even if not all ready yet
            await updateRoom(data.roomId, { gameState: room.gameState });
          }
          
          io.to(data.roomId).emit('game-update', room.gameState);
        }
      }
    });

    // Play card
    socket.on('play-card', async (data: { roomId: string; playerId: string; cardId: string; answer: string }) => {
      const rooms = await readRooms();
      const room = rooms.find(r => r.id === data.roomId);
      
      if (!room || !room.gameState) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const gameState = room.gameState;
      const player = gameState.players.find(p => p.id === data.playerId);
      
      if (!player) {
        socket.emit('error', 'Player not found');
        return;
      }
      
      if (player.team !== gameState.currentTurn) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      const cardIndex = player.cards.findIndex(c => c.id === data.cardId);
      if (cardIndex === -1) {
        socket.emit('error', 'Card not found');
        return;
      }
      
      const card = player.cards[cardIndex];
      
      // Check if trying to play revive-once when already has one
      if (card.passive === 'revive-once') {
        const hasRevive = gameState.passiveEffects.some(
          e => e.playerId === player.id && e.effect === 'revive-once'
        );
        if (hasRevive) {
          socket.emit('error', 'Đã sử dụng Phép Lạ rồi! Chỉ được dùng 1 lần/game');
          return;
        }
      }
      
      
      
      // Validate answer (case-insensitive)
      const isCorrect = card.correctAnswer.toLowerCase().trim() === data.answer.toLowerCase().trim();
      
      if (!isCorrect) {
        socket.emit('error', `❌ Sai rồi! Đáp án đúng là: ${card.correctAnswer}`);
        return;
      }
      
      // Answer is correct - calculate points
      const questionPoints = (card as any).questionPoints || 10; // 10 for first correct, 5 for retry
      const answerTime = (card as any).answerTime || 0; // Time taken to answer
      const attemptsFinal = (card as any).attemptsFinal || 1;
      const isFirstAttempt = attemptsFinal === 1;
      
      // Answer is correct - apply card effect
      player.cards.splice(cardIndex, 1);
      
      let effectDescription = '';
      const isAttack = card.value < 0;
      const opponent = gameState.players.find(p => p.team !== player.team)!;
      const target = isAttack ? opponent : player;
      
      // Apply passive effects based on card type
      if (card.passive) {
        switch (card.passive) {
          case 'compassion-heal': {
            // Từ Bi: Hồi 20 HP + Passive hồi 5 HP cho đồng minh mỗi turn
            const result = applyCardEffect(player.health, player.maxHealth, card);
            player.health = result.newHealth;
            const passiveEffect: PassiveEffect = {
              id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              playerId: player.id,
              effect: 'compassion-heal',
              duration: 999, // Permanent until game ends
              value: 5
            };
            gameState.passiveEffects.push(passiveEffect);
            effectDescription = `${card.name}: +${card.value} HP + Passive: Hồi 5 HP mỗi turn`;
            break;
          }
          
          case 'immunity-and-reduction': {
            // Bất Động Tâm: Miễn nhiễm lần đầu + Giảm 30% damage trong 2 turn
            const passiveEffect: PassiveEffect = {
              id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              playerId: player.id,
              effect: 'immunity-and-reduction',
              duration: 2,
              value: 30, // 30% reduction
              metadata: { immunityUsed: false }
            };
            gameState.passiveEffects.push(passiveEffect);
            effectDescription = `${card.name}: Miễn nhiễm lần đầu + Giảm 30% damage (2 turn)`;
            break;
          }
          
          case 'counter-2.5x': {
            // Nhân Quả: Phản lại x2.5 damage
            const passiveEffect: PassiveEffect = {
              id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              playerId: player.id,
              effect: 'counter-2.5x',
              duration: 2,
              value: 2.5
            };
            gameState.passiveEffects.push(passiveEffect);
            effectDescription = `${card.name}: Phản đòn x2.5 damage (2 turn)`;
            break;
          }
          
          case 'low-hp-bonus': {
            // Lời Cầu Nguyện: Hồi 25 HP + Bonus nếu HP < 30%
            let healAmount = card.value;
            if (player.health < player.maxHealth * 0.3) {
              healAmount += 15;
            }
            const result = applyCardEffect(player.health, player.maxHealth, { ...card, value: healAmount });
            player.health = result.newHealth;
            effectDescription = healAmount > card.value 
              ? `${card.name}: +${healAmount} HP (Low HP Bonus!)` 
              : `${card.name}: +${card.value} HP`;
            break;
          }
          
          case 'revive-once': {
            // Phép Lạ: Hồi sinh với 50 HP khi chết (1 lần/game)
            const passiveEffect: PassiveEffect = {
              id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              playerId: player.id,
              effect: 'revive-once',
              duration: 999,
              value: 50
            };
            gameState.passiveEffects.push(passiveEffect);
            effectDescription = `${card.name}: Hồi sinh với 50 HP khi chết (1 lần)`;
            break;
          }
          
          case 'combo-damage': {
            // Thập Tự Giáo: Gây 18 damage + Combo nếu đối thủ nhận damage turn trước
            let damageAmount = Math.abs(card.value);
            const lastAction = gameState.history[gameState.history.length - 1];
            if (lastAction && lastAction.card && lastAction.card.value < 0 && lastAction.team === player.team) {
              damageAmount += 12;
            }
            
            const damageResult = applyDamageWithPassives(opponent, damageAmount, player, gameState);
            opponent.health = Math.max(0, opponent.health - damageResult.finalDamage);
            
            // Apply counter damage to attacker if any
            if (damageResult.countered > 0) {
              player.health = Math.max(0, player.health - damageResult.countered);
              effectDescription = `${card.name}: -${damageResult.finalDamage} HP (Combo!) + Phản đòn: -${damageResult.countered} HP`;
            } else if (damageResult.blocked) {
              effectDescription = `${card.name}: MIỄN NHIỄM! (Bất Động Tâm)`;
            } else {
              effectDescription = damageAmount > Math.abs(card.value)
                ? `${card.name}: -${damageResult.finalDamage} HP (Combo!)`
                : `${card.name}: -${damageResult.finalDamage} HP`;
            }
            break;
          }
          
          case 'choice-3-paths': {
            // Tam Giáo Hợp Nhất: Chọn Phật/Đạo/Nho (TODO: cần UI chọn, tạm mặc định Phật)
            const result = applyCardEffect(player.health, player.maxHealth, { ...card, value: 15 });
            player.health = result.newHealth;
            effectDescription = `${card.name}: Phật - Hồi 15 HP`;
            break;
          }
          
          case 'preview-cards': {
            // Thiên Nhãn: Xem 3 thẻ tiếp của đối thủ + Counter miễn phí nếu có thẻ ATK
            const previewCards = opponent.cards.slice(0, 3);
            const hasAttackCard = previewCards.some(c => c.value < 0);
            
            // Gửi preview cards cho player
            socket.emit('preview-opponent-cards', {
              cards: previewCards.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                value: c.value,
                description: c.description,
                icon: c.icon,
                image: c.image
              }))
            });
            
            // Nếu có thẻ tấn công, đặt counter miễn phí
            if (hasAttackCard) {
              const counterEffect: PassiveEffect = {
                id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                playerId: player.id,
                effect: 'counter-2.5x',
                duration: 2,
                value: 2.5
              };
              gameState.passiveEffects.push(counterEffect);
              effectDescription = `${card.name}: Xem 3 thẻ đối thủ + Phát hiện thẻ tấn công! Đặt Counter x2.5`;
            } else {
              effectDescription = `${card.name}: Xem 3 thẻ đối thủ (Không có thẻ tấn công)`;
            }
            break;
          }
          
          case 'draw-card': {
            // Tu Tại Gia: Hồi 15 HP + Rút 1 thẻ
            const result = applyCardEffect(player.health, player.maxHealth, card);
            player.health = result.newHealth;
            const newCard = generateCard();
            player.cards.push(newCard);
            effectDescription = `${card.name}: +${card.value} HP + Rút 1 thẻ`;
            break;
          }
          
          case 'execute-bonus': {
            // Tinh Thần Dân Tộc: Gây 15 damage + Bonus nếu HP đối thủ > 70%
            let damageAmount = Math.abs(card.value);
            if (opponent.health > opponent.maxHealth * 0.7) {
              damageAmount += 25;
            }
            
            const damageResult = applyDamageWithPassives(opponent, damageAmount, player, gameState);
            opponent.health = Math.max(0, opponent.health - damageResult.finalDamage);
            
            if (damageResult.countered > 0) {
              player.health = Math.max(0, player.health - damageResult.countered);
              effectDescription = `${card.name}: -${damageResult.finalDamage} HP (Execute!) + Phản đòn: -${damageResult.countered} HP`;
            } else if (damageResult.blocked) {
              effectDescription = `${card.name}: MIỄN NHIỄM!`;
            } else {
              effectDescription = damageAmount > Math.abs(card.value)
                ? `${card.name}: -${damageResult.finalDamage} HP (Execute!)`
                : `${card.name}: -${damageResult.finalDamage} HP`;
            }
            break;
          }
          
          case 'perfect-answer-bonus': {
            // Ân Điển: Hồi 18 HP + Bonus nếu trả lời đúng lần 1
            let healAmount = card.value;
            if (isFirstAttempt) {
              healAmount += 12;
            }
            const result = applyCardEffect(player.health, player.maxHealth, { ...card, value: healAmount });
            player.health = result.newHealth;
            effectDescription = healAmount > card.value
              ? `${card.name}: +${healAmount} HP (Perfect!)`
              : `${card.name}: +${card.value} HP`;
            break;
          }
          
          case 'weaken-debuff': {
            // Truyền Giáo: Gây 12 damage + Debuff +5 damage (2 turn)
            const damageAmount = Math.abs(card.value);
            const damageResult = applyDamageWithPassives(opponent, damageAmount, player, gameState);
            opponent.health = Math.max(0, opponent.health - damageResult.finalDamage);
            
            const passiveEffect: PassiveEffect = {
              id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              playerId: opponent.id,
              effect: 'weaken-debuff',
              duration: 2,
              value: 5
            };
            gameState.passiveEffects.push(passiveEffect);
            
            if (damageResult.countered > 0) {
              player.health = Math.max(0, player.health - damageResult.countered);
              effectDescription = `${card.name}: -${damageResult.finalDamage} HP + Debuff + Phản đòn: -${damageResult.countered} HP`;
            } else if (damageResult.blocked) {
              effectDescription = `${card.name}: MIỄN NHIỄM! + Debuff vẫn áp dụng`;
            } else {
              effectDescription = `${card.name}: -${damageResult.finalDamage} HP + Debuff: +5 damage (2 turn)`;
            }
            break;
          }
          
          case 'choice-4-elements': {
            // Bốn Cung Thánh Mẫu: Chọn Thiên/Địa/Thủy/Sơn lâm (TODO: cần UI, tạm mặc định Thủy)
            const result = applyCardEffect(player.health, player.maxHealth, { ...card, value: 20 });
            player.health = result.newHealth;
            effectDescription = `${card.name}: Thủy - Hồi 20 HP`;
            break;
          }
          
          case 'copy-card': {
            // Hầu Đồng: Copy 1 thẻ đã dùng (random)
            const usedCards = gameState.history.filter(h => h.card).map(h => h.card!);
            if (usedCards.length > 0) {
              const randomCard = usedCards[Math.floor(Math.random() * usedCards.length)];
              effectDescription = `${card.name}: Copy thẻ "${randomCard.name}"`;
              // TODO: Apply copied card effect
            } else {
              effectDescription = `${card.name}: Chưa có thẻ nào để copy`;
            }
            break;
          }
          
          default:
            // Fallback to basic card effect
            const result = applyCardEffect(target.health, target.maxHealth, card);
            target.health = result.newHealth;
            effectDescription = card.value > 0
              ? `${card.name}: +${card.value} HP`
              : `${card.name}: ${card.value} HP`;
        }
      } else {
        // No passive - apply basic effect
        const result = applyCardEffect(target.health, target.maxHealth, card);
        target.health = result.newHealth;
        effectDescription = card.value > 0
          ? `${card.name}: +${card.value} HP`
          : `${card.name}: ${card.value} HP`;
      }
      
      const action: GameAction = {
        playerId: player.id,
        playerName: player.name,
        team: player.team,
        action: 'play-card',
        card,
        timestamp: Date.now(),
        effect: effectDescription,
        questionPoints,
        answerTime,
      };
      
      gameState.history.push(action);
      
      // Check if any player died and handle revive
      for (const p of gameState.players) {
        if (p.health <= 0) {
          const reviveEffect = gameState.passiveEffects.find(
            e => e.playerId === p.id && e.effect === 'revive-once'
          );
          if (reviveEffect) {
            // Revive with 50 HP
            p.health = reviveEffect.value || 50;
            // Remove revive effect (only once per game)
            gameState.passiveEffects = gameState.passiveEffects.filter(e => e.id !== reviveEffect.id);
            
            const reviveAction: GameAction = {
              playerId: p.id,
              playerName: p.name,
              team: p.team,
              action: 'play-card',
              timestamp: Date.now(),
              effect: `🕊️ Phép Lạ: ${p.name} hồi sinh với 50 HP!`,
            };
            gameState.history.push(reviveAction);
          }
        }
      }
      
      // Check game over
      const deadPlayers = gameState.players.filter(p => p.health <= 0);
      if (deadPlayers.length > 0) {
        const losingTeam = deadPlayers[0].team;
        gameState.status = 'finished';
        gameState.winner = losingTeam === 'red' ? 'blue' : 'red';
        gameState.endTime = Date.now();
        room.status = 'finished';
        
        const gameDuration = gameState.endTime - (gameState.startTime || gameState.endTime);
        
        for (const p of gameState.players) {
          const won = p.team === gameState.winner;
          const score = calculateScore(won, p.health, gameState.history.filter(h => h.playerId === p.id).length, gameDuration);
          p.score = score;
          
          const damageDealt = gameState.history
            .filter(h => h.playerId === p.id && h.card && h.card.value < 0)
            .reduce((sum, h) => sum + Math.abs(h.card!.value), 0);
          
          // Tính điểm câu hỏi
          const totalQuestionPoints = gameState.history
            .filter(h => h.playerId === p.id)
            .reduce((sum, h) => sum + (h.questionPoints || 0), 0);
          
          const correctAnswers = gameState.history
            .filter(h => h.playerId === p.id && h.questionPoints === 10)
            .length;
          
          const partialAnswers = gameState.history
            .filter(h => h.playerId === p.id && h.questionPoints === 5)
            .length;
          
          await updateLeaderboard(p.name, won, score, damageDealt, totalQuestionPoints, correctAnswers, partialAnswers);
        }
        
        await updateRoom(data.roomId, { status: room.status, gameState });
        await updateGame(gameState.id, gameState);
        
        io.to(data.roomId).emit('game-ended', { winner: gameState.winner, gameState });
      } else {
        // Game continues - check if player has drawn a card this turn
        // If not, auto-draw a card before ending the turn (only if hand is not full)
        if (!player.hasDrawnCardThisTurn && player.cards.length < 6) {
          const newCard = generateCard();
          player.cards.push(newCard);
          player.hasDrawnCardThisTurn = true;
          
          // Add auto-draw action to history
          const autoDrawAction: GameAction = {
            playerId: player.id,
            playerName: player.name,
            team: player.team,
            action: 'draw-card',
            timestamp: Date.now(),
            effect: `Tự động rút thẻ: ${newCard.name}`,
          };
          gameState.history.push(autoDrawAction);
        } else if (!player.hasDrawnCardThisTurn && player.cards.length >= 6) {
          // Hand is full, mark as drawn to prevent further auto-draw attempts
          player.hasDrawnCardThisTurn = true;
        }
        
        // Switch turn
        gameState.currentTurn = gameState.currentTurn === 'red' ? 'blue' : 'red';
        gameState.turnNumber += 1;
        
        // Reset hasDrawnCardThisTurn for the new current player
        const newCurrentPlayer = gameState.players.find(p => p.team === gameState.currentTurn);
        if (newCurrentPlayer) {
          newCurrentPlayer.hasDrawnCardThisTurn = false;
        }
        
        // Apply passive effects at start of turn
        for (const p of gameState.players) {
          // Apply compassion-heal: Hồi 5 HP mỗi turn
          const compassionEffects = gameState.passiveEffects.filter(
            e => e.effect === 'compassion-heal' && e.playerId === p.id
          );
          for (const effect of compassionEffects) {
            const healAmount = effect.value || 5;
            p.health = Math.min(p.maxHealth, p.health + healAmount);
          }
        }
        
        // Decrement passive effect durations at the end of each turn
        gameState.passiveEffects = gameState.passiveEffects
          .map(effect => {
            // Don't decrement permanent effects (duration 999)
            if (effect.duration >= 999) return effect;
            return { ...effect, duration: effect.duration - 1 };
          })
          .filter(effect => effect.duration > 0);
        
        await updateRoom(data.roomId, { gameState });
        await updateGame(gameState.id, gameState);
        
        io.to(data.roomId).emit('card-played', action);
        io.to(data.roomId).emit('turn-changed', gameState.currentTurn);
      }
      
      io.to(data.roomId).emit('game-update', gameState);
      
      const allRooms = await getAllRooms();
      io.emit('rooms-update', allRooms);
    });

    // Draw card
    socket.on('draw-card', async (data: { roomId: string; playerId: string; cardType?: string }) => {
      const rooms = await readRooms();
      const room = rooms.find(r => r.id === data.roomId);
      
      if (!room || !room.gameState) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const gameState = room.gameState;
      const player = gameState.players.find(p => p.id === data.playerId);
      
      if (!player) {
        socket.emit('error', 'Player not found');
        return;
      }
      
      if (player.team !== gameState.currentTurn) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // Check if hand is full (max 6 cards)
      if (player.cards.length >= 6) {
        socket.emit('error', 'Tay bài đã đầy! (Tối đa 6 thẻ)');
        return;
      }
      
      // Generate a new card with specified type or random
      const newCard = generateCard(data.cardType as any);
      player.cards.push(newCard);
      player.hasDrawnCardThisTurn = true;
      
      // Drawing a card counts as a turn
      gameState.currentTurn = gameState.currentTurn === 'red' ? 'blue' : 'red';
      gameState.turnNumber += 1;
      
      // Reset hasDrawnCardThisTurn for the new current player
      const newCurrentPlayer = gameState.players.find(p => p.team === gameState.currentTurn);
      if (newCurrentPlayer) {
        newCurrentPlayer.hasDrawnCardThisTurn = false;
      }
      
      // Decrement passive effect durations at the end of each turn
      gameState.passiveEffects = gameState.passiveEffects
        .map(effect => {
          // Don't decrement permanent effects (duration 999)
          if (effect.duration >= 999) return effect;
          return { ...effect, duration: effect.duration - 1 };
        })
        .filter(effect => effect.duration > 0);
      
      await updateRoom(data.roomId, { gameState });
      await updateGame(gameState.id, gameState);
      
      io.to(data.roomId).emit('turn-changed', gameState.currentTurn);
      io.to(data.roomId).emit('game-update', gameState);
    });

    socket.on('disconnect', async () => {
      // Get IP address from socket (may not be available on disconnect, use stored socketId instead)
      const clientIP = getClientIP(socket);
      console.log('Client disconnected:', socket.id, 'IP:', clientIP);
      
      // Wait a bit before removing from queue (grace period for Fast Refresh/reconnection)
      // This prevents players from being removed during Fast Refresh
      const disconnectedSocketId = socket.id; // Store socket ID before timeout
      setTimeout(async () => {
        console.log(`[DISCONNECT] Checking if socket ${disconnectedSocketId} should be removed from queue...`);
        // Check if entry still exists with this socket ID
        // If player reconnected (Fast Refresh), join-queue would have updated the socket ID
        const currentQueue = await getQueue();
        console.log(`[DISCONNECT] Current queue has ${currentQueue.entries.length} entries:`, currentQueue.entries.map(e => ({ name: e.playerName, socket: e.socketId })));
        const entry = currentQueue.entries.find(e => e.socketId === disconnectedSocketId);
        
        // Only remove if entry still has this socket ID (meaning it wasn't updated by reconnection)
        if (entry) {
          console.log(`[DISCONNECT] Found entry for disconnected socket ${disconnectedSocketId}:`, entry.playerName);
          // Check if socket is still connected (double-check)
          const isStillConnected = io.sockets.sockets.has(disconnectedSocketId);
          console.log(`[DISCONNECT] Socket ${disconnectedSocketId} still connected?`, isStillConnected);
          if (!isStillConnected) {
            // Socket is definitely disconnected, remove from queue
            try {
              console.log(`[DISCONNECT] Removing socket ${disconnectedSocketId} from queue...`);
              const leaveResult = await leaveQueueBySocketId(disconnectedSocketId);
              if (leaveResult.success) {
                // Broadcast queue update to all clients
                const queue = await getQueue();
                console.log(`[DISCONNECT] After removal, queue has ${queue.entries.length} entries:`, queue.entries.map(e => ({ name: e.playerName, socket: e.socketId })));
                io.emit('queue-update', queue);
                console.log('Removed disconnected player from queue, socket:', disconnectedSocketId, 'IP:', clientIP);
              } else {
                console.log(`[DISCONNECT] Failed to remove socket ${disconnectedSocketId}:`, leaveResult.error);
              }
            } catch (error: any) {
              // Player might not have been in queue, which is fine
              console.log('Player was not in queue or already removed:', disconnectedSocketId, error.message);
            }
          } else {
            console.log('Socket reconnected, keeping entry:', disconnectedSocketId);
          }
        } else {
          console.log('Entry not found or already updated with new socket ID:', disconnectedSocketId);
        }
      }, 2000); // 2 second grace period for Fast Refresh
    });
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running on path: /api/socket`);
    });
});
