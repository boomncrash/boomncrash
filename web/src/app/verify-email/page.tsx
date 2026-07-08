import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-20 text-center text-zinc-400">
          Verifying your email…
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
