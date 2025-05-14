import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { questions, answers } from "~/server/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    if (!params.quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const quizId = BigInt(params.quizId);

    // Get all questions for the quiz
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quiz_id, quizId));

    // Get all answers for these questions
    const questionAnswers = await db
      .select()
      .from(answers)
      .where(
        inArray(
          answers.question_id,
          quizQuestions.map((q) => q.id)
        )
      );

    // Group answers by question
    const answersByQuestion = questionAnswers.reduce((acc, answer) => {
      const questionId = answer.question_id.toString();
      if (!acc[questionId]) {
        acc[questionId] = [];
      }
      acc[questionId].push(answer);
      return acc;
    }, {} as Record<string, typeof answers.$inferSelect[]>);

    // Transform the data into the expected format
    const formattedQuestions = quizQuestions.map((q) => {
      const questionAnswers = answersByQuestion[q.id.toString()] || [];
      return {
        question: q.question,
        options: questionAnswers.map((a) => a.text),
        answer: questionAnswers.find((a) => a.is_correct)?.text ?? "",
      };
    });

    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
} 