import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Player        { id: string; name: string }
interface QuizQuestion  { question: string; options: string[]; answer: string }
interface Room {
  host:            string;
  players:         Player[];
  sockets:         Record<string, WebSocket>;
  gameStarted:     boolean;
  startTimestamp?: number;
  currentQuestion: number;
  questions?:      QuizQuestion[];

  // per‐player stats
  scores:    Record<string, number>;
  correct:   Record<string, number>;
  incorrect: Record<string, number>;
}

interface AnswerMsg {
  type:     'ANSWER';
  roomCode: string;
  playerId: string;
  points:   number;
}

interface PlayerResult {
  id:        string;
  name:      string;
  score:     number;
  correct:   number;
  incorrect: number;
}

const TOTAL_QUESTIONS = 10;
const wss             = new WebSocketServer({ port: 3001 });
const rooms: Record<string, Room>        = {};
const clientNames: Record<string, string> = {};

// ─── Helpers ──────────────────────────────────────────────────────
// strip out duplicate IDs, keeping first occurrence
function uniquePlayers(list: Player[]): Player[] {
  return Array.from(
    new Map(list.map(p => [p.id, p])).values()
  );
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  (ws as any).id = clientId;

  ws.on('message', async (raw: string) => {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    // ─── CREATE ROOM ─────────────────────────────────────────────
    if (data.type === 'CREATE_ROOM') {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const name     = data.name || 'Host';
      clientNames[clientId] = name;

      rooms[roomCode] = {
        host:            clientId,
        players:         [{ id: clientId, name }],
        sockets:         { [clientId]: ws },
        gameStarted:     false,
        currentQuestion: 0,
        scores:    {},
        correct:   {},
        incorrect: {},
      };

      ws.send(JSON.stringify({
        type:     'ROOM_CREATED',
        roomCode,
        playerId: clientId,
      }));

      broadcastToRoom(roomCode, {
        type:     'PLAYER_LIST',
        players:  uniquePlayers(rooms[roomCode].players),
        hostId:   clientId,
      });

      return;
    }

    // ─── JOIN ROOM ────────────────────────────────────────────────
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
      // remove any old entry for this player name (in case of a reconnect)
      room.players = room.players.filter(p => p.name !== data.name);
      // now add the fresh connection
      room.players.push({ id: clientId, name: data.name });
      room.sockets[clientId] = ws;

      ws.send(JSON.stringify({
        type:     'ROOM_JOINED',
        roomCode: data.roomCode,
        playerId: clientId,
      }));

      broadcastToRoom(data.roomCode, {
        type:     'PLAYER_LIST',
        players:  uniquePlayers(room.players),
        hostId:   room.host,
      });

      broadcastToRoom(data.roomCode, {
        type:     'CHAT_MESSAGE',
        sender:   'System',
        message:  `${data.name} joined the room.`,
      });

      if (room.gameStarted && room.startTimestamp && room.questions) {
        ws.send(JSON.stringify({
          type:           'GAME_START',
          startTimestamp: room.startTimestamp,
          questionIndex:  room.currentQuestion,
          questions:      room.questions,
        }));
      }

      return;
    }

    // ─── EJECT WAITING‐ROOM SOCKET ────────────────────────────────
    if (data.type === 'GO_TO_GAME') {
      const room = rooms[data.roomCode];
      if (room && room.sockets[clientId]) {
        delete room.sockets[clientId];
      }
      return;
    }

    // ─── CHAT MESSAGE ─────────────────────────────────────────────
    if (data.type === 'CHAT_MESSAGE') {
      const sender = clientNames[clientId] || 'System';
      broadcastToRoom(data.roomCode, {
        type:    'CHAT_MESSAGE',
        sender,
        message: data.message,
      });
      return;
    }

    // ─── START GAME ───────────────────────────────────────────────
    if (data.type === 'START_GAME') {
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;

      // fetch questions
      try {
        const res = await fetch('/api/generate-question', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ topic: 'General Knowledge', count: TOTAL_QUESTIONS }),
        });
        const body = (await res.json()) as { questions: QuizQuestion[] };
        room.questions = body.questions;
      } catch (err) {
        console.error('Failed to load questions:', err);
        return;
      }

      room.gameStarted     = true;
      room.currentQuestion = 1;
      room.startTimestamp  = Date.now();

      broadcastToRoom(data.roomCode, {
        type:           'GAME_START',
        startTimestamp: room.startTimestamp,
        questionIndex:  room.currentQuestion,
        questions:      room.questions,
      });

      return;
    }

    // ─── ANSWER ────────────────────────────────────────────────────
    if (data.type === 'ANSWER') {
      const msg = data as AnswerMsg;
      const room = rooms[msg.roomCode];
      if (!room || !room.gameStarted) return;

      // add the actual points you earned
      room.scores[msg.playerId] = (room.scores[msg.playerId] || 0) + msg.points;

      // still track correct / incorrect counts if you like:
      if (msg.points > 0) {
        room.correct[msg.playerId] = (room.correct[msg.playerId] || 0) + 1;
      } else {
        room.incorrect[msg.playerId] = (room.incorrect[msg.playerId] || 0) + 1;
      }

      return;
    }

    // ─── NEXT QUESTION / GAME OVER ────────────────────────────────
    if (data.type === 'NEXT_QUESTION') {
      const room = rooms[data.roomCode];
      if (!room || !room.gameStarted) return;

      room.currentQuestion += 1;

      if (room.currentQuestion > TOTAL_QUESTIONS) {
        // de-dupe by player ID
        const unique = uniquePlayers(room.players);

        const results: PlayerResult[] = unique.map(p => ({
          id:        p.id,
          name:      p.name,
          score:     room.scores[p.id]    || 0,
          correct:   room.correct[p.id]   || 0,
          incorrect: room.incorrect[p.id] || 0,
        }));

        broadcastToRoom(data.roomCode, {
          type:    'GAME_OVER',
          results,
        });
      } else {
        room.startTimestamp = Date.now();
        broadcastToRoom(data.roomCode, {
          type:           'NEXT_QUESTION',
          questionIndex:  room.currentQuestion,
        });
      }

      return;
    }

    // ─── KICK PLAYER ──────────────────────────────────────────────
    if (data.type === 'KICK_PLAYER') {
      const room = rooms[data.roomCode];
      if (!room || room.host !== clientId) return;

      const kickedWs   = room.sockets[data.playerId];
      const kickedName = clientNames[data.playerId] || 'A player';

      if (kickedWs) {
        kickedWs.send(JSON.stringify({ type: 'KICKED' }));
        kickedWs.close();
      }

      room.players = room.players.filter(p => p.id !== data.playerId);
      delete room.sockets[data.playerId];
      delete clientNames[data.playerId];

      broadcastToRoom(data.roomCode, {
        type:    'PLAYER_LIST',
        players: uniquePlayers(room.players),
        hostId:  room.host,
      });
      broadcastToRoom(data.roomCode, {
        type:    'CHAT_MESSAGE',
        sender:  'System',
        message: `${kickedName} was kicked from the room.`,
      });

      return;
    }

    // ─── LEAVE ROOM ───────────────────────────────────────────────
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
              type:    'PLAYER_LIST',
              players: uniquePlayers(room.players),
              hostId:  room.host,
            });
            broadcastToRoom(code, {
              type:    'CHAT_MESSAGE',
              sender:  'System',
              message: `${leaving?.name || 'A player'} left the room.`,
            });
          }
        }
      }
      return;
    }
  });

  ws.on('close', () => {
    // mirror LEAVE_ROOM on abrupt disconnect
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
            type:    'PLAYER_LIST',
            players: uniquePlayers(room.players),
            hostId:  room.host,
          });
          broadcastToRoom(code, {
            type:    'CHAT_MESSAGE',
            sender:  'System',
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
