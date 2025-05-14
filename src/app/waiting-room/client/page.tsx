"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Copy, LogOut, Crown, UserX, Users } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

// Types
type Player = { id: string; name: string };
type ChatMessage = { sender: string; message: string; timestamp: string };
type ServerMessage =
  | { type: "ROOM_CREATED"; roomCode: string; playerId: string }
  | { type: "ROOM_JOINED"; roomCode: string; playerId: string }
  | { type: "PLAYER_LIST"; players: Player[]; hostId: string }
  | { type: "CHAT_MESSAGE"; sender?: string; message: string }
  | { type: "GAME_START"; startTimestamp: number }
  | { type: "KICKED" }
  | { type: "ROOM_CLOSED" }
  | { type: "ERROR"; message: string };

function WaitingRoomClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useUser();
  const { toast } = useToast();

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [gameMode, setGameMode] = useState("normal");
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [topic, setTopic] = useState("");
  const [isStartingGame, setIsStartingGame] = useState(false);

  const mode = params.get("mode") ?? "create";
  const codeParam = params.get("code") ?? "";
  const nameParam = params.get("name") ?? user?.username ?? user?.fullName ?? "";
  const gameModeParam = params.get("gameMode") ?? "normal";
  console.log("Game mode from URL:", gameModeParam);


  const playerIdRef = useRef(playerId);
  const hostIdRef = useRef(hostId);
  const roomRef = useRef(codeParam);
  const joined = useRef(false);

  const GAME_MODE_LABELS: Record<string, string> = {
    normal: "Normal Game",
    "1v1": "1v1 Duel",
    "5v5": "5v5 Team Battle",
    "sudden-death": "Sudden Death",
    practice: "Practice Mode",
  };
  

  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { hostIdRef.current = hostId; }, [hostId]);

  const connectWebSocket = useCallback(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
      if (mode === "create") {
        socket.send(JSON.stringify({ 
          type: "CREATE_ROOM", 
          name: nameParam,
          gameMode: gameModeParam 
        }));
      } else {
        socket.send(JSON.stringify({ 
          type: "JOIN_ROOM", 
          roomCode: codeParam, 
          name: nameParam 
        }));
      }
    };

    socket.onmessage = (evt) => {
      if (typeof evt.data !== "string") return;
      const data = JSON.parse(evt.data) as ServerMessage;

      switch (data.type) {
        case "ROOM_CREATED":
          setRoomCode(data.roomCode);
          roomRef.current = data.roomCode;
          setPlayerId(data.playerId);
          setHostId(data.playerId);
          setGameMode(gameModeParam);
          const newParams = new URLSearchParams({
            code: data.roomCode,
            mode: "create",
            name: nameParam,
            gameMode: gameModeParam,
          });
          router.replace(`/waiting-room/client?${newParams.toString()}`);
          break;
        case "ROOM_JOINED":
          setRoomCode(data.roomCode);
          roomRef.current = data.roomCode;
          setPlayerId(data.playerId);
          break;
        case "PLAYER_LIST":
          setPlayers(data.players);
          setHostId(data.hostId);
          break;
        case "CHAT_MESSAGE":
          const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setChat((prev) => [...prev, { sender: data.sender ?? "System", message: data.message, timestamp: ts }]);
          break;
        case "GAME_START":
          socket.send (JSON.stringify({ type: "GO_TO_GAME", roomCode: roomRef.current }));
          socket.close();
          const isHostFlag = playerIdRef.current === hostIdRef.current;
          router.push(`/game?code=${roomRef.current}&name=${encodeURIComponent(nameParam)}&isHost=${isHostFlag}`);
          break;
        case "KICKED":
          alert("You were kicked.");
          router.push("/");
          break;
        case "ROOM_CLOSED":
          alert("Room closed.");
          router.push("/");
          break;
        case "ERROR":
          alert(data.message);
          router.push("/");
          break;
      }
    };

    setWs(socket);
  }, [mode, codeParam, nameParam, gameModeParam, router]);

  useEffect(() => {
    if (!joined.current && nameParam) {
      joined.current = true;
      connectWebSocket();
    }
  }, [nameParam, connectWebSocket]);

  const copyGameCode = () => {
    void navigator.clipboard.writeText(roomCode || codeParam);
    setIsCopied(true);
    toast({ title: "Game code copied!", description: "Share this code with your friends." });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const kickPlayer = (id: string) => {
    ws?.send(JSON.stringify({ type: "KICK_PLAYER", roomCode, playerId: id }));
  };

  const leaveRoom = () => {
    ws?.send(JSON.stringify({ type: "LEAVE_ROOM", roomCode, playerId }));
    router.push("/");
  };

  const startGame = () => {
    setShowTopicDialog(true);
  };

  const handleStartGame = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Please enter a topic", variant: "destructive" });
      return;
    }

    setIsStartingGame(true);
    try {
      // First create the quiz and get questions
      const response = await fetch("/api/create-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to create quiz");
      }

      const { quizId } = await response.json();
      
      // Then start the game with the quiz ID
      ws?.send(JSON.stringify({ 
        type: "START_GAME", 
        roomCode,
        quizId 
      }));
      
      setShowTopicDialog(false);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to start game. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsStartingGame(false);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      ws?.send(JSON.stringify({ type: "CHAT_MESSAGE", roomCode, message }));
      setMessage("");
    }
  };

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]); // Re-scroll whenever a new message is added

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 flex flex-col">
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-purple-800">Quiztris Waiting Room</h1>
            <div className="flex items-center mt-1">
              <Badge variant="outline" className="text-lg font-mono mr-2 py-1">
                {roomCode || codeParam}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyGameCode} title="Copy game code">
                <Copy className={`h-4 w-4 ${isCopied ? "text-green-500" : ""}`} />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {gameMode === '1v1' ? '1v1 Duel' : 'Normal Mode'}
            </Badge>
            <Button variant="outline" className="text-red-500" onClick={leaveRoom}>
              <LogOut className="mr-2 h-4 w-4" /> Leave Room
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-600" />
                  <h2 className="text-xl font-semibold">Players ({players.length})</h2>
                </div>
                {playerId === hostId && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Game Mode: {gameMode === '1v1' ? '1v1 Duel' : 'Normal'}
                    </span>
                    <Button onClick={startGame}>
                      Start Game
                    </Button>
                  </div>
                )}
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" style={{ maxHeight: "400px" }}>
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src="/placeholder.svg" alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">{player.name}</span>
                          {player.id === hostId && <Crown className="ml-1 h-4 w-4 text-yellow-500" />}
                        </div>
                        <span className="text-xs text-gray-500">Connected</span>
                      </div>
                    </div>
                    {playerId === hostId && player.id !== hostId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => kickPlayer(player.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b font-semibold">Chat</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm" ref={chatRef} style={{ maxHeight: "300px"}}>
                {chat.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between font-semibold">
                      <span>{m.sender}</span>
                      <span className="text-xs text-gray-400">{m.timestamp}</span>
                    </div>
                    <div className="ml-1 text-gray-700">{m.message}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 border-t">
                <input
                  type="text"
                  className="flex-1 border rounded-full px-4 py-2 text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  className="bg-black text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-800"
                >
                  ➤
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Quiz Topic</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., World History, Science, Movies..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopicDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartGame} disabled={isStartingGame}>
              {isStartingGame ? "Starting..." : "Start Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WaitingRoomPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <WaitingRoomClient />
    </Suspense>
  );
}