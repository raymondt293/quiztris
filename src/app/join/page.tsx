"use client"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { SignInButton, useAuth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function JoinPage({ searchParams }: { searchParams: { code?: string; mode?: string } }) {
  const gameCode = searchParams.code ?? ""
  const gameMode = searchParams.mode ?? "normal"
  const { userId } = useAuth()

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

  // If user is signed in, redirect to game page
  useEffect(() => {
    if (userId) {
      redirect(`/game?code=${gameCode}&mode=${gameMode}`)
    }
  }, [userId, gameCode, gameMode])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="w-full max-w-md">
        <Card className="p-6 shadow-lg bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-purple-800">
              {gameCode ? `Joining Game: ${gameCode}` : `Joining ${getGameModeTitle(gameMode)}`}
            </h1>
            <p className="text-gray-600 mt-2">Enter your name or sign in to continue</p>
          </div>

          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="guest">Play as Guest</TabsTrigger>
              <TabsTrigger value="account">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="guest">
              <form action="/game" className="space-y-4">
                <input type="hidden" name="gameCode" value={gameCode} />
                <input type="hidden" name="gameMode" value={gameMode} />

                <div className="space-y-2">
                  <Input name="playerName" placeholder="Enter your name" required className="text-center text-lg" />
                </div>

                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  Join Game
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="account">
              <div className="space-y-4">
                <SignInButton mode="modal">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Sign In with Clerk
                  </Button>
                </SignInButton>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  )
}
