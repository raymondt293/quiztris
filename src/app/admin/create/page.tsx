"use client"

import { useState, useReducer } from "react"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import { Label } from "~/components/ui/label"
import { ChevronLeft, ChevronRight, Plus, Trash2, ImageIcon, Save, Eye, X, Settings } from "lucide-react"
import QuestionList from "~/components/admin/question-list"
import QuestionPreview from "~/components/admin/question-preview"
import { useRouter } from "next/navigation"
import Image from "next/image";

// Types
type Answer = {
  id: string
  text: string
  isCorrect: boolean
}

type Question = {
  id: string
  text: string
  type: "multiple-choice" | "true-false" | "poll"
  timeLimit: number
  points: number
  answers: Answer[]
  media?: {
    type: "image" | "video"
    url: string
  }
}

type Quiz = {
  title: string
  description: string
  questions: Question[]
}

// Initial state
const initialQuiz: Quiz = {
  title: "Untitled Quiz",
  description: "",
  questions: [
    {
      id: "q1",
      text: "",
      type: "multiple-choice",
      timeLimit: 20,
      points: 1000,
      answers: [
        { id: "a1", text: "", isCorrect: true },
        { id: "a2", text: "", isCorrect: false },
        { id: "a3", text: "", isCorrect: false },
        { id: "a4", text: "", isCorrect: false },
      ],
    },
  ],
}

// Reducer for quiz state management
type QuizAction =
  | { type: "UPDATE_QUIZ_META"; payload: { field: keyof Quiz; value: string } }
  | { type: "ADD_QUESTION" }
  | { type: "REMOVE_QUESTION"; payload: { questionId: string } }
  | { type: "UPDATE_QUESTION"; payload: { questionId: string; field: keyof Question; value: Question[keyof Question] } }
  | { type: "UPDATE_ANSWER"; payload: { questionId: string; answerId: string; field: keyof Answer; value: Answer[keyof Answer] } }
  | { type: "ADD_ANSWER"; payload: { questionId: string } }
  | { type: "REMOVE_ANSWER"; payload: { questionId: string; answerId: string } }
  | { type: "SET_CORRECT_ANSWER"; payload: { questionId: string; answerId: string } }
  | { type: "ADD_MEDIA"; payload: { questionId: string; media: Question["media"] } }
  | { type: "REMOVE_MEDIA"; payload: { questionId: string } }

function quizReducer(state: Quiz, action: QuizAction): Quiz {
  switch (action.type) {
    case "UPDATE_QUIZ_META":
      return { ...state, [action.payload.field]: action.payload.value }

    case "ADD_QUESTION":
      return {
        ...state,
        questions: [
          ...state.questions,
          {
            id: `q${state.questions.length + 1}`,
            text: "",
            type: "multiple-choice",
            timeLimit: 20,
            points: 1000,
            answers: [
              { id: `q${state.questions.length + 1}a1`, text: "", isCorrect: true },
              { id: `q${state.questions.length + 1}a2`, text: "", isCorrect: false },
              { id: `q${state.questions.length + 1}a3`, text: "", isCorrect: false },
              { id: `q${state.questions.length + 1}a4`, text: "", isCorrect: false },
            ],
          },
        ],
      }

    case "REMOVE_QUESTION":
      return {
        ...state,
        questions: state.questions.filter((q) => q.id !== action.payload.questionId),
      }

    case "UPDATE_QUESTION":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId ? { ...q, [action.payload.field]: action.payload.value } : q,
        ),
      }

    case "UPDATE_ANSWER":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                answers: q.answers.map((a) =>
                  a.id === action.payload.answerId ? { ...a, [action.payload.field]: action.payload.value } : a,
                ),
              }
            : q,
        ),
      }

    case "ADD_ANSWER":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                answers: [...q.answers, { id: `${q.id}a${q.answers.length + 1}`, text: "", isCorrect: false }],
              }
            : q,
        ),
      }

    case "REMOVE_ANSWER":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                answers: q.answers.filter((a) => a.id !== action.payload.answerId),
              }
            : q,
        ),
      }

    case "SET_CORRECT_ANSWER":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                answers: q.answers.map((a) => ({
                  ...a,
                  isCorrect: a.id === action.payload.answerId,
                })),
              }
            : q,
        ),
      }

    case "ADD_MEDIA":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                media: action.payload.media,
              }
            : q,
        ),
      }

    case "REMOVE_MEDIA":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId
            ? {
                ...q,
                media: undefined,
              }
            : q,
        ),
      }

    default:
      return state
  }
}

export default function CreateQuizPage() {
  const router = useRouter()
  const [quiz, dispatch] = useReducer(quizReducer, initialQuiz)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  const currentQuestion = quiz.questions[currentQuestionIndex]

  if (!currentQuestion) return <div>No question selected.</div>

  const handleSave = () => {
    // In a real app, this would save to a database
    console.log("Saving quiz:", quiz)
    alert("Quiz saved successfully!")
  }

  const handleExit = () => {
    if (confirm("Are you sure you want to exit? Any unsaved changes will be lost.")) {
      router.push("/admin")
    }
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold">Quiz Preview</h1>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <X className="mr-2 h-4 w-4" /> Close Preview
          </Button>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <QuestionPreview quiz={quiz} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <div>
          <Input
            value={quiz.title}
            onChange={(e) => dispatch({ type: "UPDATE_QUIZ_META", payload: { field: "title", value: e.target.value } })}
            className="text-xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
            placeholder="Untitled Quiz"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" onClick={handleExit}>
            <X className="mr-2 h-4 w-4" /> Exit
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Question List */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <div className="mb-4">
            <Button variant="outline" className="w-full" onClick={() => dispatch({ type: "ADD_QUESTION" })}>
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </div>
          <QuestionList
            questions={quiz.questions}
            currentIndex={currentQuestionIndex}
            onSelect={setCurrentQuestionIndex}
            onRemove={(id) => {
              if (quiz.questions.length > 1) {
                dispatch({ type: "REMOVE_QUESTION", payload: { questionId: id } })
                if (currentQuestionIndex >= quiz.questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1)
                }
              } else {
                alert("You must have at least one question.")
              }
            }}
          />
        </div>

        {/* Center - Question Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Card className="p-6">
            <div className="mb-6">
              <Label htmlFor="question-text" className="text-lg font-medium mb-2 block">
                Question
              </Label>
              <Textarea
                id="question-text"
                value={currentQuestion.text}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_QUESTION",
                    payload: { questionId: currentQuestion.id, field: "text", value: e.target.value },
                  })
                }
                placeholder="Enter your question here..."
                className="min-h-[100px]"
              />
            </div>

            {/* Media Upload */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg font-medium">Media (Optional)</Label>
                {currentQuestion.media && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: "REMOVE_MEDIA", payload: { questionId: currentQuestion.id } })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>

              {currentQuestion.media ? (
                <div className="border rounded-md p-4 flex items-center justify-center">
                  {currentQuestion.media.type === "image" && (
                    <Image
                      src={currentQuestion.media.url || "/placeholder.svg"}
                      alt="Question media"
                      className="max-h-[200px] object-contain"
                    />
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-[100px] border-dashed"
                  onClick={() => {
                    // In a real app, this would open a file picker
                    const url = prompt("Enter image URL (for demo purposes):")
                    if (url) {
                      dispatch({
                        type: "ADD_MEDIA",
                        payload: {
                          questionId: currentQuestion.id,
                          media: { type: "image", url },
                        },
                      })
                    }
                  }}
                >
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-8 w-8 mb-2 text-gray-400" />
                    <span>Click to add image or media</span>
                  </div>
                </Button>
              )}
            </div>

            {/* Answer Options */}
            <div className="mb-6">
              <Label className="text-lg font-medium mb-4 block">Answer Options</Label>

              {currentQuestion.answers.map((answer, index) => (
                <div key={answer.id} className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md">{index + 1}</div>
                  <Input
                    value={answer.text}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_ANSWER",
                        payload: {
                          questionId: currentQuestion.id,
                          answerId: answer.id,
                          field: "text",
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder={`Answer ${index + 1}`}
                    className="flex-1"
                    required={index < 2}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`correct-${answer.id}`}
                        checked={answer.isCorrect}
                        onCheckedChange={() =>
                          dispatch({
                            type: "SET_CORRECT_ANSWER",
                            payload: { questionId: currentQuestion.id, answerId: answer.id },
                          })
                        }
                      />
                      <Label htmlFor={`correct-${answer.id}`} className="text-sm">
                        Correct
                      </Label>
                    </div>
                    {index > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_ANSWER",
                            payload: { questionId: currentQuestion.id, answerId: answer.id },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {currentQuestion.answers.length < 8 && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => dispatch({ type: "ADD_ANSWER", payload: { questionId: currentQuestion.id } })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Answer Option
                </Button>
              )}
            </div>

            {/* Question Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Question
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
              >
                Next Question <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Settings */}
        <div className="w-72 bg-white border-l p-4 overflow-y-auto">
          <div className="mb-4 flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <h3 className="font-semibold">Question Settings</h3>
          </div>

          <div className="space-y-6">
            {/* Question Type */}
            <div>
              <Label htmlFor="question-type" className="text-sm font-medium mb-1 block">
                Question Type
              </Label>
              <Select
                value={currentQuestion.type}
                onValueChange={(value: Question["type"]) =>
                  dispatch({
                    type: "UPDATE_QUESTION",
                    payload: { questionId: currentQuestion.id, field: "type", value },
                  })
                }
              >
                <SelectTrigger id="question-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Limit */}
            <div>
              <Label htmlFor="time-limit" className="text-sm font-medium mb-1 block">
                Time Limit (seconds)
              </Label>
              <Select
                value={currentQuestion.timeLimit.toString()}
                onValueChange={(value) =>
                  dispatch({
                    type: "UPDATE_QUESTION",
                    payload: { questionId: currentQuestion.id, field: "timeLimit", value: Number.parseInt(value) },
                  })
                }
              >
                <SelectTrigger id="time-limit">
                  <SelectValue placeholder="Select time limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="20">20 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                  <SelectItem value="90">90 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Points */}
            <div>
              <Label htmlFor="points" className="text-sm font-medium mb-1 block">
                Points
              </Label>
              <Select
                value={currentQuestion.points.toString()}
                onValueChange={(value) =>
                  dispatch({
                    type: "UPDATE_QUESTION",
                    payload: { questionId: currentQuestion.id, field: "points", value: Number.parseInt(value) },
                  })
                }
              >
                <SelectTrigger id="points">
                  <SelectValue placeholder="Select points" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500 points</SelectItem>
                  <SelectItem value="1000">1000 points</SelectItem>
                  <SelectItem value="2000">2000 points</SelectItem>
                  <SelectItem value="5000">5000 points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Answer Options Settings */}
            <div>
              <Label className="text-sm font-medium mb-1 block">Answer Options</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Randomize order</span>
                  <Switch id="randomize" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multiple correct answers</span>
                  <Switch id="multiple-correct" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Case sensitive</span>
                  <Switch id="case-sensitive" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
