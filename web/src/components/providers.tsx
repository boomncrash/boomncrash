"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

const ClientProviders = dynamic(() => import("@/components/client-providers"), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ClientProviders>{children}</ClientProviders>
    </QueryClientProvider>
  );
}
