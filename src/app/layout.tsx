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
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <main className="flex-grow container mx-auto px-4 py-12 md:py-24 max-w-4xl">
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-[var(--muted-foreground)]">
          &copy; {new Date().getFullYear()} Personal Scheduler
        </footer>
      </body>
    </html>
  );
}
