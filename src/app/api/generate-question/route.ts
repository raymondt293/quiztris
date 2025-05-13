// app/api/generate-question/route.ts
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Load your API key from environment
const API_KEY = process.env.NEXT_PUBLIC_GLM_API_KEY
if (!API_KEY) {
  console.error('[generate-question] no API key found!')
}

// Initialize the GenAI client
const ai = new GoogleGenAI({ apiKey: API_KEY! })

type QuizQuestion = { question: string; options: string[]; answer: string }
type QuizResponse = { questions: QuizQuestion[] }

export async function POST(req: Request): Promise<Response> {
  try {
    // Parse incoming JSON: expect { topic, count }
    const payload = (await req.json()) as { topic: string; count?: number }
    const topic = payload.topic
    const count = payload.count ?? 10        // default to 10 questions
    console.log('[generate-question] topic:', topic, 'count:', count)

    // Build prompt for multiple questions
    const prompt = `Please respond with ONLY a JSON object with a key "questions" that is an array of exactly ${count} objects. Each object should have keys:
- question: a single multiple-choice question about "${topic}"
- options: an array of exactly four strings
- answer: the single correct option`

    // Call Gemini via the GenAI SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',       // or another Gemini model name you have access to
      contents: [prompt],
    })

    // Ensure raw is a string
    const raw = response.text ?? ''
    console.log('[generate-question] raw text:', raw)

    // Extract JSON substring if extra text is present
    const match = /\{[\s\S]*\}/.exec(raw)
    const jsonString = match ? match[0] : raw

    // Parse JSON
    let parsed: QuizResponse
    try {
      parsed = JSON.parse(jsonString) as QuizResponse
    } catch (parseErr: unknown) {
      if (parseErr instanceof Error) {
        console.error('JSON parse failed:', parseErr.message);
      } else {
        console.error('JSON parse failed with unknown error:', parseErr);
      }
      return NextResponse.error();
    }

    return NextResponse.json(parsed)
    } catch (err: unknown) {
    // 1. narrow to get a string
    const errorMessage = err instanceof Error ? err.message : String(err);

    // 2. log it
    console.error(
      '[generate-question] error generating question:',
      errorMessage
    );

    // 3. respond, using nullish-coalescing to guard just in case
    return NextResponse.json(
      { error: errorMessage ?? 'Something went wrong' },
      { status: 500 }
    );
  }
}