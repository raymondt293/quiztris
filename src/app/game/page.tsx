// app/game/page.tsx
'use client' // note: this file still runs on the client
import { Suspense } from 'react'
import GamePageClient from './GamePageClient'

export default function GamePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading game…</div>}>
      <GamePageClient />
    </Suspense>
  )
}
