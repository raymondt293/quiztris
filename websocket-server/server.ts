import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Player { id: string; name: string }
interface Room {
  host: string;
  players: Player[];
  sockets: Record<string, WebSocket>;
  gameStarted: boolean;
  startTimestamp?: number;
  currentQuestion: number;
  topic?: string;
  questions?: any[];
  scores: PlayerScore[];
}
interface PlayerScore {
  id: string;
  name: string;
  score: number;
  correct: number;
  incorrect: number;
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

    console.log('Received message:', data.type);

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
        scores: [],
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

      // If the game’s underway, sync them to the current question
      if (room.gameStarted && room.startTimestamp) {
        ws.send(JSON.stringify({
          type: "GAME_START",
          startTimestamp: room.startTimestamp,
          questionIndex: room.currentQuestion,
          topic: room.topic,
        }));
        if (room.questions) {
          ws.send(JSON.stringify({
            type: "QUESTIONS_SHARED",
            questions: room.questions
          }));
        }
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
      console.log('Received START_GAME:', data);
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;
      room.gameStarted = true;
      room.currentQuestion = 1;
      room.startTimestamp = Date.now();
      room.topic = data.topic
      broadcastToRoom(data.roomCode, {
        type: 'GAME_START',
        startTimestamp: room.startTimestamp,
        questionIndex: room.currentQuestion,
        topic: room.topic,
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
        type: 'NEXT_QUESTION',
        startTimestamp: room.startTimestamp,
        questionIndex: room.currentQuestion,
      });
      return;
    }

    // ─── SHARE QUESTIONS ─────────────────────────────────────────
    if (data.type === 'SHARE_QUESTIONS') {
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;

      // Store questions at the room level
      room.questions = data.questions;

      // Broadcast questions to all players in the room
      broadcastToRoom(data.roomCode, {
        type: 'QUESTIONS_SHARED',
        questions: data.questions
      });
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

    // ─── SUBMIT SCORE ──────────────────────────────────────────
    if (data.type === 'SUBMIT_SCORE') {
      const room = rooms[data.roomCode];
      if (!room) return;

      broadcastToRoom(data.roomCode, {
        type: 'ADD_SCORE',
        playerId: data.score.id,
        score: {
          id: data.score.id,
          name: data.score.name,
          score: data.score.score,
          correct: data.score.correct,
          incorrect: data.score.incorrect
        }
      });

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
