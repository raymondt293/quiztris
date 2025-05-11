"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

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
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");

  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "create";
  const codeParam = params.get("code") ?? "";
  const nameParam = params.get("name") ?? "";

  // Keep refs for hostId/playerId to use in callbacks
  const playerIdRef = useRef<string>(playerId);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

  const hostIdRef = useRef<string>(hostId);
  useEffect(() => { hostIdRef.current = hostId; }, [hostId]);

  const roomRef = useRef<string>(codeParam);
  const joined = useRef(false);

  const connectWebSocket = useCallback(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
      if (mode === "create" && nameParam) {
        socket.send(JSON.stringify({ type: "CREATE_ROOM", name: nameParam }));
      } else if (mode === "join" && codeParam && nameParam) {
        socket.send(
          JSON.stringify({ type: "JOIN_ROOM", roomCode: codeParam, name: nameParam })
        );
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
          router.replace(
            `/waiting-room/client?code=${data.roomCode}` +
              `&mode=create&name=${encodeURIComponent(nameParam)}`
          );
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
          const ts = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setChat((c) => [
            ...c,
            { sender: data.sender ?? "System", message: data.message, timestamp: ts },
          ]);
          setTimeout(() => {
            document
              .querySelector(".chat-scroll")
              ?.scrollTo({ top: 1e9, behavior: "smooth" });
          }, 0);
          break;

        case "GAME_START":
          // Notify server to navigate clients
          socket.send(
            JSON.stringify({ type: "GO_TO_GAME", roomCode: roomRef.current })
          );
          socket.close();
          // Only the host should have isHost=true
          const isHostFlag = playerIdRef.current === hostIdRef.current;
          router.push(
            `/game?code=${roomRef.current}` +
              `&name=${encodeURIComponent(nameParam)}` +
              `&isHost=${isHostFlag}`
          );
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
  }, [mode, codeParam, nameParam, router]);

  useEffect(() => {
    if (!joined.current && nameParam) {
      joined.current = true;
      connectWebSocket();
    }
  }, [nameParam, connectWebSocket]);

  const startGame = () =>
    ws?.send(JSON.stringify({ type: "START_GAME", roomCode }));
  const kickPlayer = (id: string) =>
    ws?.send(JSON.stringify({ type: "KICK_PLAYER", roomCode, playerId: id }));
  const leaveRoom = () => {
    ws?.send(JSON.stringify({ type: "LEAVE_ROOM", roomCode, playerId }));
    router.push("/");
  };
  const sendMessage = () => {
    if (message.trim()) {
      ws?.send(JSON.stringify({ type: "CHAT_MESSAGE", roomCode, message }));
      setMessage("");
    }
  };

  if (!joined.current) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100">
        <h1 className="text-xl font-bold text-purple-800">Connecting…</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Players Panel */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Room Code: {roomCode || codeParam}</h2>
          <span className="text-sm text-gray-500">
            Host: {players.find((p) => p.id === hostId)?.name ?? "—"}
          </span>
        </div>
        <Card className="flex-1 p-6 space-y-2 overflow-y-auto">
          {players.map((p) => (
            <div key={p.id} className="flex justify-between items-center">
              <span className="font-medium">
                {p.name} {p.id === hostId && "(Host)"}
              </span>
              {playerId === hostId && p.id !== hostId && (
                <Button variant="destructive" size="sm" onClick={() => kickPlayer(p.id)}>
                  Kick
                </Button>
              )}
            </div>
          ))}
        </Card>
        <div className="mt-4 flex gap-2">
          {playerId === hostId && (
            <Button className="flex-1 bg-green-600 text-white" onClick={startGame}>
              Start Game
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={leaveRoom}>
            Leave
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full max-w-sm h-screen border-l bg-white flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat</h2>
          <span className="text-sm text-gray-500">
            Players: {players.length}
          </span>
        </div>
        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-2 space-y-4 text-sm">
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
      </div>
    </main>
  );
}

export default function WaitingRoomPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <WaitingRoomClient />
    </Suspense>
  );
}
