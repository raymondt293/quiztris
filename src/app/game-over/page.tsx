'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Trophy, Home, RotateCcw } from 'lucide-react'

interface PlayerResult {
  id: string
  name: string
  score: number
  correct: number
  incorrect: number
}

export default function GameOverPage() {
  const params     = useSearchParams()
  const rawPlayers = params.get('players') ?? '[]'
  const youId      = params.get('youId')    ?? ''

  let players: PlayerResult[]
  try {
    players = JSON.parse(rawPlayers)
  } catch {
    players = []
  }

  // sort descending by score
  const sorted = [...players].sort((a, b) => b.score - a.score)

  // find you for header
  const you = players.find(p => p.id === youId)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">
            {you ? `Game Over, ${you.name}!` : 'Game Over!'}
          </h1>
          {you ? (
            <p className="text-gray-600 mb-8">
              Your final score: <span className="font-medium">{you.score.toLocaleString()}</span>
            </p>
          ) : (
            <p className="text-gray-600 mb-8">Here’s how everyone performed</p>
          )}
        </div>

        <Card className="shadow-lg bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <Trophy className="mr-2 h-5 w-5" /> Final Scoreboard
            </h2>
          </div>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 bg-gray-100 text-sm font-medium p-3">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-2 text-right">Correct</div>
              <div className="col-span-2 text-right">Incorrect</div>
            </div>
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className={`grid grid-cols-12 p-3 text-sm border-b border-gray-100 ${
                  p.id === youId ? 'bg-purple-50 font-medium' : ''
                }`}
              >
                <div className="col-span-1">{idx + 1}</div>
                <div className="col-span-5">
                  {p.name}
                  {p.id === youId && (
                    <span className="ml-2 text-xs text-purple-600">(You)</span>
                  )}
                </div>
                <div className="col-span-2 text-right">{p.score.toLocaleString()}</div>
                <div className="col-span-2 text-right text-green-600">{p.correct}</div>
                <div className="col-span-2 text-right text-red-600">{p.incorrect}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
          <Link href="/join" className="flex-1">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" /> Play Again
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
