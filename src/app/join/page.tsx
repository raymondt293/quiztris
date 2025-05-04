import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"

export default function JoinPage({ searchParams }: { searchParams: { mode?: string } }) {
  const gameMode = searchParams.mode ?? "normal"

  const getGameModeTitle = (mode: string) => {
    const modes: Record<string, string> = {
      normal: "Normal Game",
      "1v1": "1v1 Duel",
      "5v5": "5v5 Team Battle",
      "sudden-death": "Sudden Death",
      practice: "Practice Mode",
    }
    return modes[mode] ?? "Game"
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="w-full max-w-md">
        <Card className="p-6 shadow-lg bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-purple-800">
              {`Joining ${getGameModeTitle(gameMode)}`}
            </h1>
            <p className="text-gray-600 mt-2">Enter your name or sign in to continue</p>
          </div>

          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="guest">Play as Guest</TabsTrigger>
              <TabsTrigger value="account">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="guest">
              <form action="/waiting-room" className="space-y-4">
                <input type="hidden" name="gameMode" value={gameMode} />
                <div className="space-y-2">
                  <Input name="playerName" placeholder="Enter your name" required className="text-center text-lg" />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  Join Room
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="account">
              <form action="/waiting-room" className="space-y-4">
                <input type="hidden" name="gameMode" value={gameMode} />
                <div className="space-y-2">
                  <Input name="email" type="email" placeholder="Email" required />
                </div>
                <div className="space-y-2">
                  <Input name="password" type="password" placeholder="Password" required />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  Sign In & Join
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  )
}
