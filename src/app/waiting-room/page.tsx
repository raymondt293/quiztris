"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectLogic() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("gameCode") ?? "";
    const mode = code ? "join" : "create";
    const name = params.get("playerName") ?? params.get("email") ?? "";

    if (!name) {
      alert("Missing player name.");
      router.push("/");
      return;
    }

    const query = new URLSearchParams({
      code,
      mode,
      name,
    });

    router.replace(`/waiting-room/client?${query.toString()}`);
  }, [router, params]);

  return null;
}

export default function WaitingRoomRedirect() {
  return (
    <main className="p-6 text-center">
      <Suspense fallback={<p>Redirecting to waiting room...</p>}>
        <RedirectLogic />
      </Suspense>
    </main>
  );
}
