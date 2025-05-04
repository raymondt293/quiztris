"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"

type Player = { id: string; name: string }

export default function WaitingRoomPage() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [roomCode, setRoomCode] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [hostId, setHostId] = useState("")

  const router = useRouter()
  const params = useSearchParams()

  const mode = params.get("mode") ?? "create"
  const codeParam = params.get("code") ?? ""
  const nameParam = params.get("name") ?? ""

  const joined = useRef(false)

  const connectWebSocket = () => {
    const socket = new WebSocket("ws://localhost:3001")

    socket.onopen = () => {
      if (mode === "create" && nameParam) {
        socket.send(JSON.stringify({ type: "CREATE_ROOM", name: nameParam }))
      } else if (mode === "join" && codeParam && nameParam) {
        socket.send(JSON.stringify({ type: "JOIN_ROOM", roomCode: codeParam, name: nameParam }))
      }
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "ROOM_CREATED") {
        setRoomCode(data.roomCode)
        setPlayerId(data.playerId)
        setHostId(data.playerId)
      }
      if (data.type === "PLAYER_LIST") {
        setPlayers(data.players)
        setHostId(data.hostId) // <-- important!
      }
      if (data.type === "GAME_START") {
        router.push("/game")
      }
      if (data.type === "KICKED") {
        alert("You were kicked.")
        router.push("/")
      }
      if (data.type === "ROOM_CLOSED") {
        alert("Room closed.")
        router.push("/")
      }
      if (data.type === "ERROR") {
        alert(data.message)
        router.push("/")
      }
    }

    setWs(socket)
  }

  useEffect(() => {
    if (!joined.current && nameParam) {
      joined.current = true
      connectWebSocket()
    }
  }, [nameParam])

  const startGame = () => {
    if (ws && roomCode) {
      ws.send(JSON.stringify({ type: "START_GAME", roomCode }))
    }
  }

  const kickPlayer = (id: string) => {
    if (ws && roomCode) {
      ws.send(JSON.stringify({ type: "KICK_PLAYER", roomCode, playerId: id }))
    }
  }

  if (!joined.current) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 p-6">
        <h1 className="text-xl font-bold text-purple-800">Connecting to Room...</h1>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 p-6">
      <div className="w-full max-w-md">
        <Card className="p-6 shadow-lg bg-white space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-purple-800">
              Room Code: {roomCode || codeParam}
            </h1>
            <p className="text-gray-600">Waiting for players...</p>
          </div>

          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex justify-between items-center border-b pb-2">
                <span>
                  {p.name} {p.id === hostId && <span className="text-sm text-purple-600">(Host)</span>}
                </span>
                {playerId === hostId && p.id !== hostId && (
                  <Button variant="destructive" size="sm" onClick={() => kickPlayer(p.id)}>
                    Kick
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {playerId === hostId && (
            <Button onClick={startGame} className="w-full bg-green-600 text-white hover:bg-green-700">
              Start Game
            </Button>
          )}
        </Card>
      </div>
    </main>
  )
}
