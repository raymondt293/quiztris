`use client`

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'

type Player = { id: string; name: string }
type ChatMessage = { sender: string; message: string; timestamp: string }
type ServerMessage =
  | { type: 'PLAYER_LIST'; players: Player[]; hostId: string }
  | { type: 'CHAT_MESSAGE'; sender?: string; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_START'; startTimestamp: number; questionIndex: number }
  | { type: 'ROOM_CLOSED' }
  | { type: 'KICKED' }

const mockQuestion = {
  question: 'Which planet is known as the Red Planet?',
  options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] as string[],
  correctAnswer: 'Mars',
  timeLimit: 20,
}

export default function GamePageClient() {
  const router = useRouter()
  const params = useSearchParams()
  const roomCode = params.get('code') ?? ''
  const playerName = params.get('name') ?? ''
  const isHostFlag = params.get('isHost') === 'true'

  // ─── Room & Host ───────────────────────────────────────────
  const [players, setPlayers] = useState<Player[]>([])
  const [hostId, setHostId] = useState<string>('')

  // ─── Chat ───────────────────────────────────────────────────
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  // ─── Quiz Sync ──────────────────────────────────────────────
  const [gameStarted, setGameStarted] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const startRef = useRef<number>(0)
  const totalQuestions = 10

  // ─── Connect & Handle Server Messages ───────────────────────
  useEffect(() => {
    if (!roomCode || !playerName) {
      router.push('/')
      return
    }
    const socket = new WebSocket('ws://localhost:3001')
    wsRef.current = socket

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode,
          name: playerName,
          isHost: isHostFlag,
        })
      )
    })

    socket.addEventListener('message', (evt: MessageEvent<string>) => {
      const data = JSON.parse(evt.data) as ServerMessage
      switch (data.type) {
        case 'PLAYER_LIST':
          setPlayers(data.players)
          setHostId(data.hostId)
          break
        case 'CHAT_MESSAGE': {
          const ts = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          setChat(c => [
            ...c,
            { sender: data.sender ?? 'System', message: data.message, timestamp: ts },
          ])
          break
        }
        case 'ERROR':
          alert(data.message)
          socket.close()
          router.push('/')
          break
        case 'GAME_START': {
          const elapsed = Math.floor((Date.now() - data.startTimestamp) / 1000)
          const remaining = mockQuestion.timeLimit - elapsed
          startRef.current = data.startTimestamp
          setQuestionNumber(data.questionIndex)
          setTimeLeft(Math.max(remaining, 0))
          setIsAnswered(false)
          setSelectedAnswer(null)
          setGameStarted(true)
          break
        }
        case 'ROOM_CLOSED':
          alert('Host has left. Room closed.')
          socket.close()
          router.push('/')
          break
        case 'KICKED':
          alert('You were kicked from the room.')
          socket.close()
          router.push('/')
          break
      }
    })

    return () => {
      socket.close()
    }
  }, [roomCode, playerName, isHostFlag, router])

  // ─── Countdown & Auto‐Advance on Timeout ────────────────────
  useEffect(() => {
    if (!gameStarted) return
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(t)
    }
    // When time runs out, check if it's the last question
    if (questionNumber >= totalQuestions) {
      router.push('/game-over')
      return
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsAnswered(true)
      wsRef.current.send(JSON.stringify({ type: 'NEXT_QUESTION', roomCode }))
    }
  }, [gameStarted, timeLeft, roomCode, questionNumber, totalQuestions, router])

  // ─── Answer Selection ───────────────────────────────────────
  function handleAnswer(opt: string) {
    if (!gameStarted || isAnswered) return
    setSelectedAnswer(opt)
    setIsAnswered(true)
    if (opt === mockQuestion.correctAnswer) {
      setScore(s => s + Math.ceil((timeLeft / mockQuestion.timeLimit) * 1000))
    }
  }

  // ─── Send Chat ──────────────────────────────────────────────
  function sendMessage() {
    if (message.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CHAT_MESSAGE', roomCode, message }))
      setMessage('')
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Quiz Panel */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4 flex justify-between">
          <span>Question {questionNumber}/{totalQuestions}</span>
          <span>Score: {score}</span>
        </div>
        <div className="mb-4">
          <Progress
            value={(timeLeft / mockQuestion.timeLimit) * 100}
            className="h-2"
          />
          <div className="text-right text-sm">{timeLeft}s</div>
        </div>
        <Card className="flex-1 p-6 mb-4 flex flex-col">
          <h2 className="text-xl font-bold mb-8 text-center">{mockQuestion.question}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {mockQuestion.options.map((o, i) => (
              <Button
                key={i}
                onClick={() => handleAnswer(o)}
                disabled={isAnswered}
                className={`h-20 text-lg ${
                  !isAnswered
                    ? ''
                    : o === mockQuestion.correctAnswer
                    ? 'bg-green-500 hover:bg-green-600'
                    : o === selectedAnswer
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'opacity-50'
                }`}
              >
                {o}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Chat & Players Panel */}
      <div className="w-full max-w-sm h-screen border-l bg-white flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat</h2>
          <span className="text-sm">
            Host: {players.find(p => p.id === hostId)?.name ?? '—'}
          </span>
        </div>
        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-2 space-y-4 text-sm">
          {chat.map((m, i) => (
            <div key={i}>
              <div className="flex justify-between font-semibold">
                <span>{m.sender}</span>
                <span className="text-xs text-gray-400">{m.timestamp}</span>
              </div>
              <div className="ml-1 text-gray-700">{m.message}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 border-t">
          <input
            type="text"
            className="flex-1 border rounded-full px-4 py-2 text-sm"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-black text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-800"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
