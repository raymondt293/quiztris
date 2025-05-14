import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db } from '~/server/db';
import { quizzes, questions, answers } from '~/server/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

// Load your API key from environment
const API_KEY = process.env.NEXT_PUBLIC_GLM_API_KEY;
if (!API_KEY) {
  console.error('[generate-question] No API key found!');
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

type QuizQuestion = { question: string; options: string[]; answer: string };
type QuizResponse = { questions: QuizQuestion[] };

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topic, count = 10 } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Create quiz first
    const [quizRow] = await db.insert(quizzes).values({
      host_id: userId,
      title: `${topic} Quiz`,
      questions: 0,
    }).$returningId();

    if (!quizRow) {
      throw new Error('Failed to create quiz');
    }

    const quizId = quizRow.id;

    const prompt = `Please respond with ONLY a JSON object with a key "questions" that is an array of exactly ${count} objects. Each object should have:
- question: a multiple-choice question about "${topic}"
- options: an array of 4 strings
- answer: one of the options that is correct`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [prompt],
    });

    const raw = result.text ?? '';
    console.log('[generate-question] raw:', raw);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    let parsed: QuizResponse;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error('[generate-question] Failed to parse JSON:', err);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    for (const q of parsed.questions) {
      const [questionRow] = await db.insert(questions).values({
        quiz_id: BigInt(quizId),
        question: q.question,
        type: 'multiple_choice',
        time_limit: 30,
        points: 1000,
      }).$returningId();

      if (!questionRow) {
        throw new Error('Failed to create question');
      }

      const questionId = questionRow.id;

      await db.insert(answers).values(
        q.options.map((opt) => ({
          question_id: BigInt(questionId),
          text: opt,
          is_correct: opt === q.answer,
        }))
      ).execute();
    }

    await db.update(quizzes)
      .set({ questions: parsed.questions.length })
      .where(eq(quizzes.id, BigInt(quizId)))
      .execute();

    return NextResponse.json({ quizId: quizId.toString() });
  } catch (err) {
    console.error('[generate-question] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
