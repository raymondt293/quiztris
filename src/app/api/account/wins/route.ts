import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "~/server/db"
import { users } from "~/server/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  // 1) Get authenticated Clerk user
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2) Lookup the user in your database by Clerk ID
  const [user] = await db
    .select({ wins: users.number_of_wins })
    .from(users)
    .where(eq(users.clerk_id, clerkId))
    .limit(1)
    .execute()

  if (!user) {
    return NextResponse.json({ error: "User not found in database" }, { status: 404 })
  }

  // 3) Return number of wins
  return NextResponse.json({ wins: user.wins ?? 0 })
}
