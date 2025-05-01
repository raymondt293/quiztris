"use client"

import { useCallback, useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Progress } from "~/components/ui/progress"
import ChatBox from "~/components/chat-box"
import { useRouter } from "next/navigation"

// Mock data for demonstration
const mockQuestion = {
  id: 1,
  question: "Which planet is known as the Red Planet?",
  options: ["Venus", "Mars", "Jupiter", "Saturn"],
  correctAnswer: "Mars",
  timeLimit: 20,
}

export default function GamePage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(mockQuestion.timeLimit)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions] = useState(10)

  const handleTimeUp = useCallback(() => {
    setIsAnswered(true)
  
    setTimeout(() => {
      if (questionNumber < totalQuestions) {
        setQuestionNumber(questionNumber + 1)
        setTimeLeft(mockQuestion.timeLimit)
        setSelectedAnswer(null)
        setIsAnswered(false)
      } else {
        router.push("/game-over")
      }
    }, 2000)
  }, [questionNumber, router, totalQuestions])

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeUp()
    }
  }, [timeLeft, isAnswered, handleTimeUp])

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return

    setSelectedAnswer(answer)
    setIsAnswered(true)

    if (answer === mockQuestion.correctAnswer) {
      // Calculate score based on time left
      const pointsEarned = Math.ceil((timeLeft / mockQuestion.timeLimit) * 1000)
      setScore(score + pointsEarned)
    }

    // Move to next question after 2 seconds
    setTimeout(() => {
      if (questionNumber < totalQuestions) {
        setQuestionNumber(questionNumber + 1)
        setTimeLeft(mockQuestion.timeLimit)
        setSelectedAnswer(null)
        setIsAnswered(false)
      } else {
        router.push("/game-over")
      }
    }, 2000)
  }

  
  const getButtonClass = (option: string) => {
    if (!isAnswered) return ""
    if (option === mockQuestion.correctAnswer) return "bg-green-500 hover:bg-green-600"
    if (option === selectedAnswer) return "bg-red-500 hover:bg-red-600"
    return "opacity-50"
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Main game area */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm font-medium">
            Question {questionNumber}/{totalQuestions}
          </div>
          <div className="text-sm font-medium">Score: {score}</div>
        </div>

        <div className="mb-4">
          <Progress value={(timeLeft / mockQuestion.timeLimit) * 100} className="h-2" />
          <div className="text-right text-sm mt-1">{timeLeft}s</div>
        </div>

        <Card className="flex-1 p-6 mb-4 flex flex-col">
          <h2 className="text-xl font-bold mb-8 text-center">{mockQuestion.question}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {mockQuestion.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`h-20 text-lg ${getButtonClass(option)}`}
                disabled={isAnswered}
              >
                {option}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Chat sidebar */}
      <div className="hidden md:block w-80 border-l border-gray-200 bg-white">
        <ChatBox />
      </div>
    </div>
  )
}
