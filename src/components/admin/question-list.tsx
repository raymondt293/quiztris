"use client"

import { Button } from "~/components/ui/button"
import { Trash2 } from "lucide-react"

type Question = {
  id: string
  text: string
}

interface QuestionListProps {
  questions: Question[]
  currentIndex: number
  onSelect: (index: number) => void
  onRemove: (id: string) => void
}

export default function QuestionList({ questions, currentIndex, onSelect, onRemove }: QuestionListProps) {
  return (
    <div className="space-y-2">
      {questions.map((question, index) => (
        <div
          key={question.id}
          className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
            index === currentIndex ? "bg-purple-100 border border-purple-300" : "hover:bg-gray-100"
          }`}
          onClick={() => onSelect(index)}
        >
          <div className="flex items-center">
            <div className="w-6 h-6 flex items-center justify-center bg-purple-600 text-white rounded-full text-xs mr-2">
              {index + 1}
            </div>
            <div className="text-sm truncate max-w-[150px]">{question.text || `Question ${index + 1}`}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(question.id)
            }}
          >
            <Trash2 className="h-3 w-3 text-gray-500 hover:text-red-500" />
          </Button>
        </div>
      ))}
    </div>
  )
}
