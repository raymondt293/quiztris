// app/game-over/page.tsx
'use client'

import { Suspense } from 'react'
import GameOverPage from './GameOverPage'

export default function GameOver() {
  return (
    <Suspense fallback={<div className="p-4">Loading leaderboard…</div>}>
      <GameOverPage />
    </Suspense>
  )
}
