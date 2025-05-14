import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { db } from "drizzle"
import { users, quizzes } from "../../../server/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  // 1) authenticate
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // 2) fetch full Clerk profile
  const client    = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)
  const name      = clerkUser.firstName  ?? ""
  const email     = clerkUser.emailAddresses[0]?.emailAddress ?? ""

  // 3) look up or insert numeric user
let numericHostId: number;
const [existingUser] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.clerk_id, clerkId))
  .execute();

if (existingUser) {
  numericHostId = Number(existingUser.id);
} else {
  
  const [insertedId] = await db
    .insert(users)
    .values({
      clerk_id: clerkId,
      name,
      email,
    })
    .$returningId();     

  numericHostId = Number(insertedId);
}

  // 4) parse your quiz payload
  const { title, questions } = (await req.json()) as {
    title:     string
    questions: Array<{
      question:   string
      type:       string
      time_limit?: number
      points?:     number
      media?:      string | null
      answers:    Array<{ text: string; is_correct: boolean }>
    }>
  }

  // 5) insert the quiz
const [newQuizId] = await db
.insert(quizzes)
.values({
  host_id: BigInt(numericHostId),
  title,
})
.$returningId();                

const quizId = Number(newQuizId);
  // 6) loop your questions & answers exactly like before…

  return NextResponse.json({ success: true, quizId })
}
