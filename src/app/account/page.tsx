'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Card } from '~/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'

export default function AccountPage() {
    const { user, isSignedIn } = useUser()
    const [wins, setWins] = useState<number | null>(null)
  
    useEffect(() => {
      const fetchWins = async () => {
        try {
          const res = await fetch('/api/account/wins')
          const data = await res.json()
          setWins(data.wins)
        } catch (err) {
          console.error("Failed to fetch wins", err)
          setWins(0)
        }
      }
  
      if (isSignedIn) {
        fetchWins()
      }
    }, [isSignedIn])
  
    if (!isSignedIn) return <div className="p-6">You must be signed in to view this page.</div>

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 flex flex-col items-center p-6">
      <Card className="w-full max-w-md p-6 flex flex-col items-center gap-4 shadow-lg">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.imageUrl} alt={user.fullName ?? user.username ?? 'User'} />
          <AvatarFallback>{(user.firstName ?? 'U')[0]}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-800">
            {user.fullName ?? user.username ?? 'Player'}
          </h2>
          <p className="text-gray-600">{user.emailAddresses[0]?.emailAddress}</p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-700 font-medium">Total Wins</p>
          {wins !== null ? (
            <Badge className="text-4xl font-bold px-4 py-1 mt-1">{wins}</Badge>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>
      </Card>
    </main>
  )
}
