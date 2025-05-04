import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

interface Player {
  id: string
  name: string
}

interface Room {
  host: string
  players: Player[]
  sockets: Record<string, WebSocket>
}

const wss = new WebSocketServer({ port: 3001 })
const rooms: Record<string, Room> = {}
const clientNames: Record<string, string> = {}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4()
  ;(ws as any).id = clientId

  ws.on('message', (message: string) => {
    let data: any
    try {
      data = JSON.parse(message)
    } catch (e) {
      console.error('Invalid message:', message)
      return
    }

    if (data.type === 'CREATE_ROOM') {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const hostName = data.name || 'Host'

      clientNames[clientId] = hostName 

      rooms[roomCode] = {
        host: clientId,
        players: [{ id: clientId, name: hostName }],
        sockets: { [clientId]: ws },
      }

      ws.send(
        JSON.stringify({ type: 'ROOM_CREATED', roomCode, playerId: clientId })
      )
      
      broadcastToRoom(roomCode, {
        type: 'PLAYER_LIST',
        players: rooms[roomCode].players,
        hostId: rooms[roomCode].host,
      })
    }

    if (data.type === 'JOIN_ROOM') {
      const room = rooms[data.roomCode]
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room does not exist' }))
        return
      }

      const nameTaken = room.players.some((p) => p.name === data.name)
      if (nameTaken) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Name already taken in this room' }))
        return
      }

      room.players.push({ id: clientId, name: data.name })
      room.sockets[clientId] = ws
      clientNames[clientId] = data.name

      ws.send(
        JSON.stringify({ type: 'ROOM_CREATED', roomCode: data.roomCode, playerId: clientId })
      )

      broadcastToRoom(data.roomCode, {
        type: 'PLAYER_LIST',
        players: room.players,
        hostId: room.host,
      })

      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender: 'System',
        message: `${data.name} joined the room.`,
      })
    }

    if (data.type === 'KICK_PLAYER') {
      const room = rooms[data.roomCode]
      if (!room || room.host !== clientId) return

      const kickedPlayer = room.players.find(p => p.id === data.playerId)
      const kickedWs = room.sockets[data.playerId]
      if (kickedWs) {
        kickedWs.send(JSON.stringify({ type: 'KICKED' }))
        kickedWs.close()
      }

      room.players = room.players.filter((p) => p.id !== data.playerId)
      delete room.sockets[data.playerId]
      delete clientNames[data.playerId]

      broadcastToRoom(data.roomCode, {
        type: 'PLAYER_LIST',
        players: room.players,
        hostId: room.host,
      })

      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender: 'System',
        message: `${kickedPlayer?.name || 'A player'} was kicked.`,
      })
    }

    if (data.type === 'CHAT_MESSAGE') {
      const room = rooms[data.roomCode]
      const senderName = clientNames[clientId] || "Unknown"

      if (!room) return

      broadcastToRoom(data.roomCode, {
        type: 'CHAT_MESSAGE',
        sender: senderName,
        message: data.message,
      })
    }

    if (data.type === 'START_GAME') {
      broadcastToRoom(data.roomCode, { type: 'GAME_START' })
    }
  })

  ws.on('close', () => {
    for (const [code, room] of Object.entries(rooms)) {
      if (room.sockets[clientId]) {
        delete room.sockets[clientId]
        const leavingPlayer = room.players.find(p => p.id === clientId)
        room.players = room.players.filter((p) => p.id !== clientId)
        delete clientNames[clientId]

        if (room.host === clientId) {
          broadcastToRoom(code, { type: 'ROOM_CLOSED' })
          delete rooms[code]
        } else {
          broadcastToRoom(code, {
            type: 'PLAYER_LIST',
            players: room.players,
            hostId: room.host,
          })

          broadcastToRoom(code, {
            type: 'CHAT_MESSAGE',
            sender: 'System',
            message: `${leavingPlayer?.name || 'A player'} left the room.`,
          })
        }
      }
    }
  })
})

function broadcastToRoom(roomCode: string, message: any) {
  const room = rooms[roomCode]
  if (!room) return

  Object.values(room.sockets).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}

console.log('✅ WebSocket server running at ws://localhost:3001')
