import { Card } from "~/components/ui/card"

type Answer = {
  id: string
  text: string
  isCorrect: boolean
}

type Question = {
  id: string
  text: string
  type: string
  timeLimit: number
  points: number
  answers: Answer[]
  media?: {
    type: string
    url: string
  }
}

type Quiz = {
  title: string
  description: string
  questions: Question[]
}

interface QuestionPreviewProps {
  quiz: Quiz
}

export default function QuestionPreview({ quiz }: QuestionPreviewProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{quiz.title}</h1>

      <div className="space-y-8">
        {quiz.questions.map((question, qIndex) => (
          <Card key={question.id} className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Question {qIndex + 1}</h2>
              <div className="text-sm text-gray-500">
                {question.timeLimit} seconds • {question.points} points
              </div>
            </div>

            <div className="mb-6">
              <p className="text-lg">{question.text || `[Question ${qIndex + 1} text]`}</p>
            </div>

            {question.media && (
              <div className="mb-6 flex justify-center">
                <img
                  src={question.media.url || "/placeholder.svg"}
                  alt="Question media"
                  className="max-h-[200px] object-contain rounded-md"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.answers.map((answer, aIndex) => (
                <div
                  key={answer.id}
                  className={`p-3 rounded-md border ${
                    answer.isCorrect ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full mr-2 text-xs font-medium bg-gray-200">
                      {aIndex + 1}
                    </div>
                    <div className="flex-1">{answer.text || `[Answer ${aIndex + 1}]`}</div>
                    {answer.isCorrect && <div className="text-xs font-medium text-green-600">Correct</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
