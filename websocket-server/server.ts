import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface Player { id: string; name: string }
interface Room {
  host: string;
  players: Player[];
  sockets: Record<string, WebSocket>;
  gameStarted: boolean;
  startTimestamp?: number;
  currentQuestion: number;
  gameMode: string;
  playerQuestions: Record<string, QuizQuestion[]>;
  stackedQuestions: Record<string, QuizQuestion[]>;
  quizId?: string;
}

const port = Number(process.env.PORT) || 3001;
const wss = new WebSocketServer({ port });
const rooms: Record<string, Room> = {};
const clientNames: Record<string, string> = {};

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  (ws as any).id = clientId;

  ws.on('message', (raw: string) => {
    let data: any;
    try { data = JSON.parse(raw); } catch { return; }

    // ─── CREATE ROOM ───────────────────────────────────────────
    if (data.type === 'CREATE_ROOM') {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const name = data.name || 'Host';
      clientNames[clientId] = name;
      rooms[roomCode] = {
        host: clientId,
        players: [{ id: clientId, name }],
        sockets: { [clientId]: ws },
        gameStarted: false,
        currentQuestion: 0,
        gameMode: data.gameMode || 'normal',
        playerQuestions: {},
        stackedQuestions: {},
      };
      
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode, playerId: clientId }));
      broadcastToRoom(roomCode, {
        type: 'PLAYER_LIST',
        players: rooms[roomCode]!.players,
        hostId: clientId,
      });
      return;
    }

    // ─── JOIN ROOM ─────────────────────────────────────────────
    if (data.type === "JOIN_ROOM") {
      const room = rooms[data.roomCode];
      if (!room) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Room not found" }));
        return;
      }

      // ── If we're already mid‐game and this name matches the original host,
      //     promote this connection to be the new host.
      if (room.gameStarted && data.isHost === true) {
        room.host = clientId;
      }

      clientNames[clientId] = data.name;
      room.players.push({ id: clientId, name: data.name });
      room.sockets[clientId] = ws;

      // Acknowledge join
      ws.send(JSON.stringify({
        type: "ROOM_JOINED",
        roomCode: data.roomCode,
        playerId: clientId,
      }));

      // Broadcast updated player list
      broadcastToRoom(data.roomCode, {
        type: "PLAYER_LIST",
        players: room.players,
        hostId: room.host,
      });

      // Always announce a join
      broadcastToRoom(data.roomCode, {
        type: "CHAT_MESSAGE",
        sender: "System",
        message: `${data.name} joined the room.`,
      });

      // If the game's underway, sync them to the current question
      if (room.gameStarted && room.startTimestamp) {
        ws.send(JSON.stringify({
          type: "GAME_START",
          startTimestamp: room.startTimestamp,
          questionIndex: room.currentQuestion,
        }));
      }
      return;
    }

    // ─── EJECT WAITING-ROOM SOCKET ─────────────────────────────
    if (data.type === 'GO_TO_GAME') {
      const room = rooms[data.roomCode];
      if (room && room.sockets[clientId]) {
        delete room.sockets[clientId];
      }
      return;
    }

    // ─── CHAT MESSAGE ──────────────────────────────────────────
    if (data.type === 'CHAT_MESSAGE') {
      const sender = clientNames[clientId] || 'System';
      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender,
        message: data.message,
      });
      return;
    }

    // ─── START GAME ────────────────────────────────────────────
    if (data.type === 'START_GAME') {
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;
      room.gameStarted = true;
      room.currentQuestion = 1;
      room.startTimestamp = Date.now();
      room.quizId = data.quizId;

      // Initialize questions for 1v1 mode
      if (room.gameMode === '1v1') {
        room.players.forEach(player => {
          room.playerQuestions[player.id] = [];
          room.stackedQuestions[player.id] = [];
        });
      }

      broadcastToRoom(data.roomCode, {
        type: 'GAME_START',
        startTimestamp: room.startTimestamp,
        questionIndex: room.currentQuestion,
        gameMode: room.gameMode,
        quizId: room.quizId,
      });
      return;
    }

    // ─── NEXT QUESTION ─────────────────────────────────────────
    if (data.type === 'NEXT_QUESTION') {
      const room = rooms[data.roomCode];
      if (!room || !room.gameStarted || room.host !== clientId) return;
      room.currentQuestion++;
      room.startTimestamp = Date.now();
      broadcastToRoom(data.roomCode, {
        type: 'GAME_START',
        startTimestamp: room.startTimestamp,
        questionIndex: room.currentQuestion,
      });
      return;
    }

    // ─── ANSWER QUESTION ───────────────────────────────────────
    if (data.type === 'ANSWER_QUESTION') {
      const room = rooms[data.roomCode];
      if (!room || !room.gameStarted) return;

      if (room.gameMode === '1v1') {
        const isCorrect = data.isCorrect;
        const question = data.question;
        const opponentId = room.players.find(p => p.id !== clientId)?.id;

        if (isCorrect && opponentId) {
          // Add the question to opponent's stack
          room.stackedQuestions[opponentId] = [...(room.stackedQuestions[opponentId] || []), question];
          
          // Notify opponent about the new stacked question
          const opponentWs = room.sockets[opponentId];
          if (opponentWs) {
            opponentWs.send(JSON.stringify({
              type: 'QUESTION_STACKED',
              playerId: opponentId,
              question: question
            }));
          }

          // Check if the current player has won
          const currentPlayerQuestions = room.playerQuestions[clientId] || [];
          const currentPlayerStacked = room.stackedQuestions[clientId] || [];
          if (currentPlayerQuestions.length === 0 && currentPlayerStacked.length === 0) {
            broadcastToRoom(data.roomCode, {
              type: 'GAME_OVER',
              winner: clientId
            });
          }
        }
      }
      return;
    }

    // ─── KICK PLAYER ───────────────────────────────────────────
    if (data.type === 'KICK_PLAYER') {
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;
      const kickedWs = room.sockets[data.playerId];
      const kickedName = clientNames[data.playerId] || 'A player';
      if (kickedWs) {
        kickedWs.send(JSON.stringify({ type: 'KICKED' }));
        kickedWs.close();
      }
      room.players = room.players.filter(p => p.id !== data.playerId);
      delete room.sockets[data.playerId];
      delete clientNames[data.playerId];
      broadcastToRoom(data.roomCode, {
        type: 'PLAYER_LIST',
        players: room.players,
        hostId: room.host,
      });
      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender: 'System',
        message: `${kickedName} was kicked from the room.`,
      });
      return;
    }

    // ─── LEAVE ROOM ────────────────────────────────────────────
    if (data.type === 'LEAVE_ROOM') {
      for (const [code, room] of Object.entries(rooms)) {
        if (room.sockets[clientId]) {
          const leaving = room.players.find(p => p.id === clientId);
          delete room.sockets[clientId];
          room.players = room.players.filter(p => p.id !== clientId);
          delete clientNames[clientId];

          if (room.host === clientId) {
            // host left: broadcast and delete room
            broadcastToRoom(code, { type: 'ROOM_CLOSED' });
            delete rooms[code];
          } else {
            // just a normal player
            broadcastToRoom(code, {
              type: 'PLAYER_LIST',
              players: room.players,
              hostId: room.host,
            });
            broadcastToRoom(code, {
              type: 'CHAT_MESSAGE',
              sender: 'System',
              message: `${leaving?.name || 'A player'} left the room.`,
            });
          }
        }
      }
      return;
    }
  });

  ws.on('close', () => {
    // handle abrupt disconnects the same as LEAVE_ROOM
    if (!clientNames[clientId]) return;
    for (const [code, room] of Object.entries(rooms)) {
      if (room.sockets[clientId]) {
        const leaving = room.players.find(p => p.id === clientId);
        delete room.sockets[clientId];
        room.players = room.players.filter(p => p.id !== clientId);
        delete clientNames[clientId];

        if (room.host === clientId) {
          broadcastToRoom(code, { type: 'ROOM_CLOSED' });
          delete rooms[code];
        } else {
          broadcastToRoom(code, {
            type: 'PLAYER_LIST',
            players: room.players,
            hostId: room.host,
          });
          broadcastToRoom(code, {
            type: 'CHAT_MESSAGE',
            sender: 'System',
            message: `${leaving?.name || 'A player'} left the room.`,
          });
        }
      }
    }
  });
});

function broadcastToRoom(roomCode: string, msg: any) {
  const room = rooms[roomCode];
  if (!room) return;
  for (const s of Object.values(room.sockets)) {
    if (s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(msg));
    }
  }
}

console.log('✅ WebSocket server listening on ws://localhost:3001');