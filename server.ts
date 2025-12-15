import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as IOServer } from 'socket.io';
import { GameState, GameAction, PassiveEffect } from './types';
import { readGames, updateGame, updateRoom, readRooms } from './lib/database';
import { joinRoom, leaveRoom, getAllRooms } from './lib/roomManager';
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

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

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
      // Validate input
      if (!data.roomId || !data.playerName) {
        socket.emit('error', 'Invalid room ID or player name');
        return;
      }
      if (typeof data.playerName !== 'string' || data.playerName.length > 50) {
        socket.emit('error', 'Player name must be a string (max 50 chars)');
        return;
      }
      
      console.log('Received join-room request:', data, 'from socket:', socket.id);
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
        io.to(data.roomId).emit('game-update', result.room.gameState);
        
        // Update rooms list for all clients
        const rooms = await getAllRooms();
        io.emit('rooms-update', rooms);
      } else {
        console.log('Join room failed, emitting error:', result.error);
        socket.emit('error', result.error || 'Failed to join room');
      }
    });

    // Leave room
    socket.on('leave-room', async (data: { roomId: string; playerId: string }) => {
      const result = await leaveRoom(data.roomId, data.playerId);
      
      if (result.success) {
        socket.leave(data.roomId);
        io.to(data.roomId).emit('player-left', data.playerId);
        
        const rooms = await getAllRooms();
        io.emit('rooms-update', rooms);
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
        // Game continues - switch turn
        gameState.currentTurn = gameState.currentTurn === 'red' ? 'blue' : 'red';
        gameState.turnNumber += 1;
        
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
      
      // Generate a new card with specified type or random
      const newCard = generateCard(data.cardType as any);
      player.cards.push(newCard);
      
      // Drawing a card counts as a turn
      gameState.currentTurn = gameState.currentTurn === 'red' ? 'blue' : 'red';
      gameState.turnNumber += 1;
      
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

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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
