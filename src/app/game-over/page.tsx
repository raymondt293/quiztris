import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Trophy, Home, RotateCcw } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockPlayers = [
  { id: 1, name: "Alex", score: 8750, correct: 9, incorrect: 1 },
  { id: 2, name: "You", score: 7500, correct: 8, incorrect: 2, isCurrentUser: true },
  { id: 3, name: "Taylor", score: 6200, correct: 7, incorrect: 3 },
  { id: 4, name: "Jordan", score: 5800, correct: 6, incorrect: 4 },
  { id: 5, name: "Casey", score: 4500, correct: 5, incorrect: 5 },
]

export default function GameOverPage() {
  // Sort players by score in descending order
  const sortedPlayers = [...mockPlayers].sort((a, b) => b.score - a.score)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">Game Over!</h1>
          <p className="text-gray-600 mb-8">Here's how everyone performed</p>
        </div>

        <Card className="shadow-lg bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <Trophy className="mr-2 h-5 w-5" />
              Final Scoreboard
            </h2>
            <div className="text-sm opacity-80">Game Mode: Normal</div>
          </div>

          <CardContent className="p-0">
            <div className="grid grid-cols-12 bg-gray-100 text-sm font-medium p-3">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-2 text-right">Correct</div>
              <div className="col-span-2 text-right">Incorrect</div>
            </div>

            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`grid grid-cols-12 p-3 text-sm border-b border-gray-100 ${
                  player.isCurrentUser ? "bg-purple-50 font-medium" : ""
                }`}
              >
                <div className="col-span-1">{index + 1}</div>
                <div className="col-span-5">
                  {player.name}
                  {player.isCurrentUser && <span className="ml-2 text-xs text-purple-600">(You)</span>}
                </div>
                <div className="col-span-2 text-right">{player.score.toLocaleString()}</div>
                <div className="col-span-2 text-right text-green-600">{player.correct}</div>
                <div className="col-span-2 text-right text-red-600">{player.incorrect}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/join" className="flex-1">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Play Again
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
