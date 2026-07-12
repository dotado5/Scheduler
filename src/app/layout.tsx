import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Scheduler",
  description: "Book a meeting seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen md:h-screen md:overflow-hidden flex flex-col`}>
        <main className="flex-grow flex flex-col justify-center container mx-auto px-4 py-4 md:py-6 w-full md:overflow-hidden">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-[var(--muted-foreground)] shrink-0 border-t border-[var(--border)]/50 bg-[var(--background)]">
          &copy; {new Date().getFullYear()} Personal Scheduler
        </footer>
      </body>
    </html>
  );
}
