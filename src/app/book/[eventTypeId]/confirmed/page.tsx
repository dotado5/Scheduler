"use client";

import { EVENT_TYPES } from "@/config/event-types";
import { notFound, useSearchParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, Video, CalendarPlus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmationContent({ eventTypeId }: { eventTypeId: string }) {
  const searchParams = useSearchParams();
  const startTime = searchParams.get("startTime");
  const meetLink = searchParams.get("meetLink");
  const timezone = searchParams.get("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  
  const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);

  if (!eventType || !startTime) {
    notFound();
  }

  const dateObj = new Date(startTime);
  const formattedDate = formatInTimeZone(dateObj, timezone, "EEEE, MMMM d, yyyy");
  const formattedTime = formatInTimeZone(dateObj, timezone, "h:mm a");

  // Create Google Calendar add link
  const endTime = new Date(dateObj.getTime() + eventType.duration * 60000);
  const gcalFormat = "yyyyMMdd'T'HHmmss'Z'";
  const startStr = formatInTimeZone(dateObj, timezone, gcalFormat);
  const endStr = formatInTimeZone(endTime, timezone, gcalFormat);
  const addUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventType.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(`Meeting link: ${meetLink}`)}`;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 py-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        
        {/* Left Section - Success Message (col-span-5) */}
        <div className="md:col-span-5 text-center md:text-left flex flex-col items-center md:items-start space-y-5 md:space-y-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] leading-relaxed">
              Your meeting has been scheduled. A calendar invitation has been sent to your email address.
            </p>
          </div>

          <Link href="/" className="inline-flex items-center text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors pt-2">
            Return to home <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {/* Right Section - Meeting Details Card (col-span-7) */}
        <div className="md:col-span-7 w-full flex justify-center md:justify-end">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-left shadow-sm w-full max-w-md relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b border-[var(--border)]">
              {eventType.title}
            </h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase font-semibold">When</p>
                <p className="font-semibold text-base md:text-lg">{formattedDate}</p>
                <p className="text-[var(--primary)] font-bold text-base md:text-lg mt-0.5">{formattedTime}</p>
              </div>
              
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase font-semibold">Where</p>
                {meetLink ? (
                  <div className="flex items-center text-[var(--primary)] font-bold text-base">
                    <Video className="w-4 h-4 mr-2" />
                    Google Meet
                  </div>
                ) : (
                  <p className="font-medium text-sm text-[var(--muted-foreground)]">Details in email</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={addUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                <CalendarPlus className="w-4 h-4 mr-2" /> Add to Calendar
              </a>
              
              {meetLink && (
                <a 
                  href={meetLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Open Meet
                </a>
              )}
            </div>
          </div>
        </div>

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
