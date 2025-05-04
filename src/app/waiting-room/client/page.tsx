"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"

type Player = { id: string; name: string }
type ChatMessage = { sender: string; message: string; timestamp: string }

type ServerMessage =
  | { type: "ROOM_CREATED"; roomCode: string; playerId: string }
  | { type: "PLAYER_LIST"; players: Player[]; hostId: string }
  | { type: "CHAT_MESSAGE"; sender?: string; message: string }
  | { type: "GAME_START" }
  | { type: "KICKED" }
  | { type: "ROOM_CLOSED" }
  | { type: "ERROR"; message: string }

export default function WaitingRoomPage() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [roomCode, setRoomCode] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [hostId, setHostId] = useState("")
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState("")

  const router = useRouter()
  const params = useSearchParams()

  const mode = params.get("mode") ?? "create"
  const codeParam = params.get("code") ?? ""
  const nameParam = params.get("name") ?? ""

  const joined = useRef(false)

  const connectWebSocket = useCallback(() => {
    const socket = new WebSocket("ws://localhost:3001")

    socket.onopen = () => {
      if (mode === "create" && nameParam) {
        socket.send(JSON.stringify({ type: "CREATE_ROOM", name: nameParam }))
      } else if (mode === "join" && codeParam && nameParam) {
        socket.send(JSON.stringify({ type: "JOIN_ROOM", roomCode: codeParam, name: nameParam }))
      }
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage

        switch (data.type) {
          case "ROOM_CREATED":
            setRoomCode(data.roomCode)
            setPlayerId(data.playerId)
            setHostId(data.playerId)
            break

          case "PLAYER_LIST":
            setPlayers(data.players)
            setHostId(data.hostId)
            break

          case "CHAT_MESSAGE":
            {
              const timestamp = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              setChat((prev) => [
                ...prev,
                {
                  sender: data.sender ?? "System",
                  message: data.message,
                  timestamp,
                },
              ])

              setTimeout(() => {
                const chatBox = document.querySelector(".chat-scroll")
                chatBox?.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" })
              }, 0)
            }
            break

          case "GAME_START":
            router.push("/game" as string)
            break

          case "KICKED":
            alert("You were kicked.")
            router.push("/" as string)
            break

          case "ROOM_CLOSED":
            alert("Room closed.")
            router.push("/" as string)
            break

          case "ERROR":
            alert(data.message)
            router.push("/" as string)
            break
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err)
      }
    }

    setWs(socket)
  }, [mode, nameParam, codeParam, router])

  useEffect(() => {
    if (!joined.current && nameParam) {
      joined.current = true
      connectWebSocket()
    }
  }, [nameParam, connectWebSocket])

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

  const sendMessage = () => {
    if (ws && message.trim()) {
      ws.send(JSON.stringify({ type: "CHAT_MESSAGE", roomCode, message }))
      setMessage("")
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
    <main className="min-h-screen flex flex-row bg-purple-50">
      <div className="flex-1 p-6">
        <Card className="p-6 shadow-lg bg-white space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-purple-800">
              Room Code: {roomCode || codeParam}
            </h1>
            <p className="text-gray-600">Waiting for players...</p>
          </div>

          <ul className="space-y-2 max-h-72 overflow-y-auto">
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

      <div className="w-full max-w-sm h-screen border-l bg-white flex flex-col justify-between">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
        </div>

        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-2 space-y-4 text-sm">
          {chat.map((chatMsg, idx) => (
            <div key={idx}>
              <div className="flex justify-between font-semibold">
                <span>{chatMsg.sender}</span>
                <span className="text-xs text-gray-400">{chatMsg.timestamp}</span>
              </div>
              <div className="ml-1 text-gray-700">{chatMsg.message}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 border-t">
          <input
            type="text"
            className="flex-1 border rounded-full px-4 py-2 text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-black text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-4 7 4 7-14-7z" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  )
}