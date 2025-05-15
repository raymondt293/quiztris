import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Plus, Edit, Copy, Trash2, Play } from "lucide-react"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { db } from "drizzle"
import  { quizzes, users } from "../../server/db/schema"
import { eq, desc } from "drizzle-orm"
import { SignInButton } from "@clerk/nextjs"

export default async function AdminPage() {
  // 1) Get Clerk userId (string)
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl mb-4">Please sign in to view your quizzes</h1>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
      </div>
    )
  }

  // 2) Find your numeric host ID in `users`
  const [maybeUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerk_id, clerkId))
    .execute()

  // if they've never created a quiz (i.e. no row in `users`), show empty state
  if (!maybeUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-gray-600 mb-4">
          You haven’t created any quizzes yet.
        </p>
        <Link href="/admin/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Quiz
          </Button>
        </Link>
      </div>
    )
  }
  const hostId = maybeUser.id  // this is a bigint

  // 3) Load only *their* quizzes
  const rows = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.host_id, hostId))
    .orderBy(desc(quizzes.created_at))
    .execute()

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header + “Create New Quiz” */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800">
            Quiz Dashboard
          </h1>
          <Link href="/admin/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create New Quiz
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {rows.length === 0 ? (
          <p className="text-center text-gray-600">
            You haven’t created any quizzes yet.
          </p>
        ) : (
          /* Quiz cards grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((quiz) => (
              <Card key={quiz.id.toString()}>
                <CardHeader>
                  <CardTitle>{quiz.title}</CardTitle>
                  <CardDescription>
                    {quiz.questions} questions • {quiz.plays} plays
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-500">
                    Last edited{" "}
                    {quiz.last_edited
                      ? new Date(quiz.last_edited).toLocaleDateString()
                      : "—"}
                  </p>
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
                  <Link href={`/host?quiz=${quiz.id.toString()}`}>
                    <Button>
                      <Play className="mr-2 h-4 w-4" /> Start
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}