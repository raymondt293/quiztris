"use client"
export const dynamic = "force-dynamic";

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function WaitingRoomRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get("gameCode") ?? ""
    const mode = code ? "join" : "create"
    const name = params.get("playerName") ?? params.get("email") ?? ""

    if (!name) {
      alert("Missing player name.")
      router.push("/")
      return
    }

    const query = new URLSearchParams({
      code,
      mode,
      name,
    })

    router.replace(`/waiting-room/client?${query.toString()}`)
  }, [router, params])

  return <main className="p-6 text-center">Redirecting to waiting room...</main>
}
