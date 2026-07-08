"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/settings/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEmail(data.email);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Unsubscribe</h1>
      {status === "loading" && <p className="mt-4 text-zinc-400">Processing…</p>}
      {status === "success" && (
        <p className="mt-4 text-emerald-400">
          {email ? `${email} has been unsubscribed` : "You have been unsubscribed"} from {APP_NAME}
          emails. In-app notifications are unchanged.
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 text-red-400">Invalid or expired unsubscribe link.</p>
      )}
      <Link href="/dashboard" className="mt-8 inline-block text-emerald-400 hover:underline">
        Email settings →
      </Link>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-400">Loading…</div>}>
      <UnsubscribeClient />
    </Suspense>
  );
}
