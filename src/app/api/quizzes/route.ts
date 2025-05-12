// src/app/api/quizzes/route.ts
import { NextResponse } from "next/server"
import { db }            from "drizzle"       // your Drizzle client
import {
  quizzes,
  questions,
  answers,
} from "src/server/db/schema"                                // your createTable exports
interface QuizPayload {
  hostId:   number
  title:    string
  questions: Array<{
    question:   string
    type:       string
    time_limit?: number
    points?:     number
    media?:      string | null
    answers:    Array<{ text: string; is_correct: boolean }>
  }>
}

export async function POST(req: Request) {
  const payload = (await req.json()) as QuizPayload

  // ─── 1) Insert the quiz and get its new ID ─────────────────────────
  // Returns an array like [{ id: number }]
  const [quizRow] = await db
    .insert(quizzes)
    .values({
      host_id: BigInt(payload.hostId),  // your users table is bigint
      title:   payload.title,
    })
    .$returningId()

  const quizId = quizRow!.id  // this is a plain JS number

  // ─── 2) For each question, insert & grab its ID ──────────────────
  for (const q of payload.questions) {
    const [questionRow] = await db
      .insert(questions)
      .values({
        quiz_id:    BigInt(quizId),      // questions.quiz_id is bigint
        question:   q.question,
        type:       q.type,
        time_limit: q.time_limit  ?? undefined,
        points:     q.points      ?? undefined,
        media:      q.media       ?? null,
      })
      .$returningId()

    const questionId = questionRow!.id

    // ─── 3) Insert each answer (no need to return its ID) ───────────
    for (const a of q.answers) {
      await db
        .insert(answers)
        .values({
          question_id: BigInt(questionId),  // answers.question_id is bigint
          text:        a.text,
          is_correct:  a.is_correct,
        })
        .execute()
    }
  }

  // ─── 4) Return success & the numeric quizId ───────────────────────
  return NextResponse.json({ success: true, quizId })
}