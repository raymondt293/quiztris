import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Player { id: string; name: string }
interface QuizQuestion { question: string; options: string[]; answer: string }
interface Room {
  host: string;
  players: Player[];
  sockets: Record<string, WebSocket>;
  gameStarted: boolean;
  startTimestamp?: number;
  currentQuestion: number;
  questions?: QuizQuestion[];
  scores: Record<string, number>;    // ← add this
}

const TOTAL_QUESTIONS = 10;
const wss = new WebSocketServer({ port: 3001 });
const rooms: Record<string, Room> = {};
const clientNames: Record<string, string> = {};

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  (ws as any).id = clientId;

  ws.on('message', async (raw: string) => {
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
        scores: {},
      };
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode, playerId: clientId }));
      broadcastToRoom(roomCode, {
        type: 'PLAYER_LIST',
        players: rooms[roomCode].players,
        hostId: clientId,
      });
      return;
    }

    

    // ─── JOIN ROOM ─────────────────────────────────────────────
    if (data.type === 'JOIN_ROOM') {
      const room = rooms[data.roomCode];
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
        return;
      }
      if (room.gameStarted && data.isHost === true) {
        room.host = clientId;
      }
      clientNames[clientId] = data.name;
      room.players.push({ id: clientId, name: data.name });
      room.sockets[clientId] = ws;

      ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomCode: data.roomCode, playerId: clientId }));
      broadcastToRoom(data.roomCode, {
        type: 'PLAYER_LIST',
        players: room.players,
        hostId: room.host,
      });
      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender: 'System',
        message: `${data.name} joined the room.`,
      });
      if (room.gameStarted && room.startTimestamp) {
        ws.send(JSON.stringify({
          type: 'GAME_START',
          startTimestamp: room.startTimestamp,
          questionIndex: room.currentQuestion,
          questions: room.questions
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

      // fetch questions once
      try {
        const res = await fetch('http://localhost:3000/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'General Knowledge', count: TOTAL_QUESTIONS }),
        });
        const body = (await res.json()) as { questions: QuizQuestion[] };
        room.questions = body.questions;
      } catch (err) {
        console.error('Failed to load questions:', err);
        return;
      }

      room.gameStarted = true;
      room.currentQuestion = 1;
      room.startTimestamp = Date.now();
      broadcastToRoom(data.roomCode, {
        type: 'GAME_START',
        startTimestamp: room.startTimestamp,
        questionIndex: room.currentQuestion,
        questions: room.questions,
      });
      return;
    }

    // ─── NEXT QUESTION ─────────────────────────────────────────
    if (data.type === 'NEXT_QUESTION') {
      const room = rooms[data.roomCode];
      if (!room || !room.gameStarted) return;
      room.currentQuestion++;
      if (room.currentQuestion > TOTAL_QUESTIONS) {
        broadcastToRoom(data.roomCode, { type: 'GAME_OVER' });
      } else {
        room.startTimestamp = Date.now();
        broadcastToRoom(data.roomCode, {
          type: 'NEXT_QUESTION',
          questionIndex: room.currentQuestion,
        });
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
      return;
    }
  });

  ws.on('close', () => {
    // handle abrupt disconnects same as LEAVE_ROOM
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
