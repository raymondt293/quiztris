import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card } from "~/components/ui/card"
import GameModes from "~/components/game-modes"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="w-full max-w-md space-y-8">

        <Card className="p-6 shadow-lg bg-white">
          <form action="/join" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center">Have a game code?</h2>
              <div className="flex space-x-2">
                <Input name="code" placeholder="Enter game code" className="text-center text-lg tracking-wider" />
                <Button type="submit" size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-sm text-gray-500">or choose a game mode</span>
            </div>
          </div>

          <GameModes />
        </Card>
      </div>
    </main>
  )
}
