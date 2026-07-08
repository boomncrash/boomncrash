import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Global USDC bounty marketplace. Post tasks, complete bounties, get paid in stablecoin on Base and Solana.",
  keywords: ["bounty", "USDC", "crypto", "tasks", "Base", "Solana", "earn"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen bg-[#0a0a0f] font-sans text-white antialiased`}>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
