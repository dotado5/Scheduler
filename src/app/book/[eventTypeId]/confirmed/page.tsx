"use client";

import { EVENT_TYPES } from "@/config/event-types";
import { notFound, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, Video, CalendarPlus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmationContent({ eventTypeId }: { eventTypeId: string }) {
  const searchParams = useSearchParams();
  const startTime = searchParams.get("startTime");
  const meetLink = searchParams.get("meetLink");
  
  const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);

  if (!eventType || !startTime) {
    notFound();
  }

  const dateObj = new Date(startTime);
  const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");
  const formattedTime = format(dateObj, "h:mm a");

  // Create Google Calendar add link
  const endTime = new Date(dateObj.getTime() + eventType.duration * 60000);
  const gcalFormat = "yyyyMMdd'T'HHmmss'Z'";
  const startStr = format(dateObj, gcalFormat);
  const endStr = format(endTime, gcalFormat);
  const addUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventType.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(`Meeting link: ${meetLink}`)}`;

  return (
    <div className="max-w-2xl mx-auto mt-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight mb-4">
        You&apos;re all set!
      </h1>
      <p className="text-lg text-[var(--muted-foreground)] mb-10">
        Your meeting has been scheduled. A calendar invitation has been sent to your email address.
      </p>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-left shadow-sm max-w-md mx-auto relative overflow-hidden">
        {/* Accent border */}
        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: eventType.color }} />
        
        <h2 className="text-xl font-bold mb-6 pb-4 border-b border-[var(--border)]">
          {eventType.title}
        </h2>
        
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">When</p>
            <p className="font-semibold text-lg">{formattedDate}</p>
            <p className="text-[var(--primary)] font-medium">{formattedTime}</p>
          </div>
          
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Where</p>
            {meetLink ? (
              <div className="flex items-center text-[var(--primary)] font-medium">
                <Video className="w-4 h-4 mr-2" />
                Google Meet
              </div>
            ) : (
              <p className="font-medium">Details in email</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a 
            href={addUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)] transition-colors"
          >
            <CalendarPlus className="w-4 h-4 mr-2" /> Add to Calendar
          </a>
          
          {meetLink && (
            <a 
              href={meetLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-opacity"
            >
              Open Meet
            </a>
          )}
        </div>
      </div>

      <div className="mt-12">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          Return to home <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmedPage({ params }: { params: { eventTypeId: string } }) {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading confirmation...</div>}>
      <ConfirmationContent eventTypeId={params.eventTypeId} />
    </Suspense>
  );
}
