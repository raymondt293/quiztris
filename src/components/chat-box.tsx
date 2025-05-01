"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Send } from "lucide-react"

// Mock data for demonstration
const mockMessages = [
  { id: 1, user: "System", message: "Welcome to the game room!", timestamp: new Date().toISOString() },
  { id: 2, user: "Alice", message: "Good luck everyone!", timestamp: new Date().toISOString() },
  { id: 3, user: "Bob", message: "This is going to be fun!", timestamp: new Date().toISOString() },
]

interface Message {
  id: number
  user: string
  message: string
  timestamp: string
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() === "") return

    const message: Message = {
      id: Date.now(),
      user: "You", // In a real app, this would be the current user's name
      message: newMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-semibold">Chat</h3>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <div className="flex items-baseline">
                <span className="font-semibold text-sm">{msg.user}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm">{msg.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
