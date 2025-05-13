'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'

type QuizQuestion = { question: string; options: string[]; answer: string }
type Player       = { id: string; name: string }
type ChatMessage  = { sender: string; message: string; timestamp: string }
interface PlayerResult {
  id: string
  name: string
  score: number
  correct: number
  incorrect: number
}
type ServerMessage =
  | { type: 'PLAYER_LIST'; players: Player[]; hostId: string }
  | { type: 'CHAT_MESSAGE'; sender?: string; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_START'; startTimestamp: number; questionIndex: number; questions: QuizQuestion[] }
  | { type: 'NEXT_QUESTION'; questionIndex: number }
  | { type: 'GAME_OVER';      results: PlayerResult[] }
  | { type: 'ROOM_CLOSED' }
  | { type: 'KICKED' }

const DEFAULT_TIME_LIMIT = 20
const TOTAL_QUESTIONS    = 10

export default function GamePageClient() {
  const router     = useRouter()
  const params     = useSearchParams()
  const roomCode   = params.get('code') ?? ''
  const playerName = params.get('name') ?? ''
  const isHostFlag = params.get('isHost') === 'true'

  // ─── Room State ───────────────────────────────────────────
  const [players, setPlayers] = useState<Player[]>([])
  const [hostId, setHostId]   = useState<string>('')

  const youId = players.find((p) => p.name === playerName)?.id ?? ''

  // ─── Chat State ───────────────────────────────────────────
  const [chat, setChat]       = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const wsRef                 = useRef<WebSocket | null>(null)

  // ─── Quiz State ───────────────────────────────────────────
  const [questions, setQuestions]           = useState<QuizQuestion[]>([])
  const [gameStarted, setGameStarted]       = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [timeLeft, setTimeLeft]             = useState(0)
  const [isAnswered, setIsAnswered]         = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore]                   = useState(0)
  const startRef                            = useRef<number>(0)

  // ─── Connect & Handle Messages ────────────────────────────
  useEffect(() => {
    if (!roomCode || !playerName) {
      router.push('/')
      return
    }
    const socket = new WebSocket('ws://localhost:3001')
    wsRef.current = socket

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: playerName,
        isHost: isHostFlag,
      }))
    })

    socket.addEventListener('message', (evt) => {
      if (typeof evt.data !== 'string') return
      const data = JSON.parse(evt.data) as ServerMessage

      switch (data.type) {
        case 'PLAYER_LIST': {
          // de-dupe by name (so re-joins don’t show twice)
          const unique = data.players.filter(
            (p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx
          );
          setPlayers(unique)
          setHostId(data.hostId)
          break
        }

        case 'CHAT_MESSAGE': {
          const ts = new Date().toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          })
          setChat(c => [
            ...c,
            { sender: data.sender ?? 'System', message: data.message, timestamp: ts }
          ])
          break
        }

        case 'ERROR':
          alert(data.message)
          socket.close()
          router.push('/')
          break

        case 'GAME_START': {
          setQuestions(data.questions)
          const elapsed   = Math.floor((Date.now() - data.startTimestamp) / 1000)
          const remaining = DEFAULT_TIME_LIMIT - elapsed
          startRef.current     = data.startTimestamp
          setQuestionNumber(data.questionIndex)
          setTimeLeft(Math.max(remaining, 0))
          setIsAnswered(false)
          setSelectedAnswer(null)
          setGameStarted(true)
          break
        }

        case 'NEXT_QUESTION':
          setQuestionNumber(data.questionIndex)
          setTimeLeft(DEFAULT_TIME_LIMIT)
          setIsAnswered(false)
          setSelectedAnswer(null)
          break

        case 'GAME_OVER': {
          // Remove any accidental duplicates by player ID
          const uniqueResults = data.results.filter(
            (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
        )

          // Navigate with only the unique results
          const qs = new URLSearchParams()
          qs.set('players', JSON.stringify(uniqueResults))
          qs.set('youId', youId)
          router.push(`/game-over?${qs.toString()}`)
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

    return () => socket.close()
  }, [roomCode, playerName, isHostFlag, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Countdown & Auto-Advance ─────────────────────────────
  useEffect(() => {
    if (!gameStarted) return

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    }

    // On timeout, always ask the server to advance (or end) the game
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsAnswered(true)
      wsRef.current.send(JSON.stringify({
        type:     'NEXT_QUESTION',
        roomCode,
      }))
    }
  }, [gameStarted, timeLeft, roomCode])

  // ─── Answer Selection ───────────────────────────────────────
  const currentQuestion =
    questions[questionNumber - 1] ?? { question: 'Loading...', options: [], answer: '' }

  function handleAnswer(opt: string) {
    if (!gameStarted || isAnswered) return
    setSelectedAnswer(opt)
    setIsAnswered(true)

    const isRight = opt === currentQuestion.answer
    // how many points you just earned
    const earned = isRight
      ? Math.ceil((timeLeft / DEFAULT_TIME_LIMIT) * 1000)
      : 0

    // update your local totals
    if (earned > 0) {
      setScore(s => s + earned)
    }

    // Tell the server who answered and whether it was correct
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type:     'ANSWER',
        roomCode,
        playerId: youId,
        points:   earned,
      }))
    }
  }

  // ─── Chat Sending ───────────────────────────────────────────
  function sendMessage() {
    if (message.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type:    'CHAT_MESSAGE',
        roomCode,
        message,
      }))
      setMessage('')
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Quiz Panel */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4 flex justify-between">
          <span>Question {questionNumber}/{TOTAL_QUESTIONS}</span>
          <span>Score: {score}</span>
        </div>
        <div className="mb-4">
          <Progress value={(timeLeft / DEFAULT_TIME_LIMIT) * 100} className="h-2" />
          <div className="text-right text-sm">{timeLeft}s</div>
        </div>
        <Card className="flex-1 p-6 mb-4 flex flex-col">
          <h2 className="text-xl font-bold mb-8 text-center">
            {currentQuestion.question}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {currentQuestion.options.map((o, i) => (
              <Button
                key={i}
                onClick={() => handleAnswer(o)}
                disabled={isAnswered}
                className={`h-20 text-lg ${
                  !isAnswered
                    ? ''
                    : o === currentQuestion.answer
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
            Host: {players.find((p) => p.id === hostId)?.name ?? '—'}
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
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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
