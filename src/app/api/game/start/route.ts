import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { games } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { quizId, hostId, gamePin } = await req.json();

    if (!quizId || !hostId || !gamePin) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new game instance
    const gameId = await db
      .insert(games)
      .values({
        quiz_id: BigInt(quizId),
        host_id: hostId,
        game_pin: gamePin,
        is_active: true,
        started_at: new Date(),
      })
      .$returningId();

    return NextResponse.json({ gameId: gameId.toString() });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
