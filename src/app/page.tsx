import { EVENT_TYPES } from "@/config/event-types";
import Link from "next/link";
import { Clock, ArrowRight, Mail } from "lucide-react";

export default function Home() {
  const hostName = process.env.HOST_NAME || "Your Host";
  const hostEmail = process.env.HOST_EMAIL;

  return (
    <div className="flex flex-col justify-center py-4 space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto w-full">
      <div className="space-y-3 text-center px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Meet with {hostName}
        </h1>
        <p className="text-base md:text-lg text-[var(--muted-foreground)] max-w-xl mx-auto leading-relaxed">
          Choose a meeting type below to book a time that works for you. {hostName} Availability is synced in real-time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {EVENT_TYPES.map((eventType) => (
          <Link
            key={eventType.id}
            href={`/book/${eventType.id}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]"
          >
            <div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">
                {eventType.title}
              </h2>
              <div className="flex items-center text-[var(--muted-foreground)] mb-4 space-x-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">{eventType.duration} min</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                {eventType.description}
              </p>
            </div>

            <div className="mt-6 flex items-center font-bold text-sm text-[var(--primary)] group-hover:translate-x-1 transition-transform">
              Book this Meeting <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {hostEmail && (
        <div className="mt-8 pt-6 border-t border-[var(--border)] text-center max-w-lg mx-auto w-full">
          <h3 className="text-lg font-semibold mb-2">Just want to ask a question?</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            You don&apos;t need to schedule a meeting just to reach out. Feel free to send an email anytime.
          </p>
          <a
            href={`mailto:${hostEmail}`}
            className="inline-flex items-center justify-center py-2 px-5 rounded-full bg-[var(--muted)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] text-sm font-medium transition-colors border border-[var(--border)] hover:border-transparent group"
          >
            <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            Send an Email
          </a>
        </div>
      )}
    </div>
  );
}
