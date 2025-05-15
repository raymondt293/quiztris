import Link from "next/link"
import { Button } from "~/components/ui/button"
import { Users, Swords, Shield, Skull, Dumbbell } from "lucide-react"

const gameModes = [
  {
    name: "Normal",
    icon: <Users className="mr-2 h-4 w-4" />,
    description: "Classic quiz experience",
    href: "/join?mode=normal",
    color: "bg-blue-100 hover:bg-blue-200 text-blue-700",
  },
  {
    name: "1v1",
    icon: <Swords className="mr-2 h-4 w-4" />,
    description: "Head-to-head challenge",
    href: "/join?mode=1v1",
    color: "bg-red-100 hover:bg-red-200 text-red-700",
  },
  {
    name: "Practice",
    icon: <Dumbbell className="mr-2 h-4 w-4" />,
    description: "Train without pressure",
    href: "/join?mode=practice",
    color: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700",
  },
]

export default function GameModes() {
  return (
    <div className="grid gap-3">
      {gameModes.map((mode) => (
        <Link key={mode.name} href={mode.href} className="block w-full">
          <Button variant="outline" className={`w-full justify-start ${mode.color} border-0`}>
            {mode.icon}
            <div className="flex flex-col items-start">
              <span>{mode.name}</span>
              <span className="text-xs opacity-70">{mode.description}</span>
            </div>
          </Button>
        </Link>
      ))}
    </div>
  )
}
