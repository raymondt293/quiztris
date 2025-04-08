import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Plus, Edit, Copy, Trash2, Play } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockQuizzes = [
  { id: 1, title: "Science Quiz", questions: 10, plays: 245, lastEdited: "2 days ago" },
  { id: 2, title: "History Trivia", questions: 15, plays: 187, lastEdited: "1 week ago" },
  { id: 3, title: "Math Challenge", questions: 8, plays: 92, lastEdited: "3 days ago" },
]

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800">Quiz Dashboard</h1>
          <Link href="/admin/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create New Quiz
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockQuizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>
                  {quiz.questions} questions • {quiz.plays} plays
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Last edited {quiz.lastEdited}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button>
                  <Play className="mr-2 h-4 w-4" /> Start
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
