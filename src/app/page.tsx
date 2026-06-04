import { EVENT_TYPES } from "@/config/event-types";
import Link from "next/link";
import { Clock, ArrowRight, Mail } from "lucide-react";

export default function Home() {
  const hostName = process.env.HOST_NAME || "Your Host";
  const hostEmail = process.env.HOST_EMAIL;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="space-y-5 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Meet with {hostName}
        </h1>
        <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
          Choose an event type below to book a time that works for you. 
          Availability is synced in real-time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {EVENT_TYPES.map((eventType) => (
          <Link
            key={eventType.id}
            href={`/book/${eventType.id}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]"
          >
            {/* Color accent line */}
            <div 
              className="absolute left-0 top-0 h-1.5 w-full opacity-80 group-hover:opacity-100 transition-opacity" 
              style={{ backgroundColor: eventType.color }} 
            />
            
            <div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-[var(--primary)] transition-colors">
                {eventType.title}
              </h2>
              <div className="flex items-center text-[var(--muted-foreground)] mb-5 space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium text-lg">{eventType.duration} min</span>
              </div>
              <p className="text-[var(--muted-foreground)] leading-relaxed text-base">
                {eventType.description}
              </p>
            </div>

            <div className="mt-8 flex items-center font-bold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
              Book this event <ArrowRight className="ml-2 w-5 h-5" />
            </div>
          </Link>
        ))}
      </div>

      {hostEmail && (
        <div className="mt-16 pt-12 border-t border-[var(--border)] text-center max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-3">Just want to ask a question?</h3>
          <p className="text-[var(--muted-foreground)] mb-6">
            You don&apos;t need to schedule a meeting just to reach out. Feel free to send an email anytime.
          </p>
          <a 
            href={`mailto:${hostEmail}`}
            className="inline-flex items-center justify-center py-3 px-6 rounded-full bg-[var(--muted)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] font-medium transition-colors border border-[var(--border)] hover:border-transparent group"
          >
            <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            Send an Email
          </a>
        </div>
      )}
    </div>
  );
}
