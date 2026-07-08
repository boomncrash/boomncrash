"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch(`/api/settings/email/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Verification failed");
        setStatus("success");
        setMessage(`Email verified! You'll now receive ${APP_NAME} alerts.`);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Email verification</h1>
      <p
        className={`mt-4 text-sm ${
          status === "success" ? "text-emerald-400" : status === "error" ? "text-red-400" : "text-zinc-400"
        }`}
      >
        {message}
      </p>
      <Link href="/dashboard" className="mt-8 inline-block text-emerald-400 hover:underline">
        Go to Dashboard →
      </Link>
    </div>
  );
}
