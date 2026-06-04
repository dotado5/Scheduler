"use client";

import { EVENT_TYPES } from "@/config/event-types";
import { notFound, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format, addDays, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, addMonths, subMonths, getDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function BookingPage({ params }: { params: { eventTypeId: string } }) {
  const router = useRouter();
  const eventType = EVENT_TYPES.find((e) => e.id === params.eventTypeId);

  if (!eventType) {
    notFound();
  }

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(startOfToday()));
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfToday();
  const maxDate = addDays(today, 30); // Max days ahead

  useEffect(() => {
    if (selectedDate) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true);
        setSelectedSlot(null); // Reset slot selection
        try {
          const dateString = format(selectedDate, "yyyy-MM-dd");
          const res = await fetch(`/api/slots?date=${dateString}&eventTypeId=${eventType.id}`);
          if (!res.ok) throw new Error("Failed to fetch slots");
          const data = await res.json();
          setAvailableSlots(data.slots || []);
        } catch (err) {
          console.error(err);
          setAvailableSlots([]);
        } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate, eventType.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedSlot,
          eventTypeId: eventType.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      // Redirect to confirmation page
      router.push(`/book/${eventType.id}/confirmed?startTime=${encodeURIComponent(selectedSlot)}&meetLink=${encodeURIComponent(data.meetLink || "")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  
  const startingDayIndex = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: startingDayIndex }).map((_, i) => i);

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event Types
      </Link>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Header - Event Info */}
        <div className="p-6 md:p-8 border-b border-[var(--border)] bg-[var(--muted)]">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{eventType.title}</h1>
          <div className="flex items-center text-[var(--muted-foreground)] mb-4 space-x-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{eventType.duration} minutes</span>
          </div>
          <p className="text-[var(--muted-foreground)] leading-relaxed break-words whitespace-normal">
            {eventType.description}
          </p>
          
          {selectedDate && selectedSlot && (
            <div className="mt-6 p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg inline-block">
              <p className="text-sm font-medium mb-1 text-[var(--muted-foreground)]">Selected Time:</p>
              <p className="font-semibold text-lg md:text-xl">
                {format(new Date(selectedSlot), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-[var(--primary)] font-bold text-lg md:text-xl">
                {format(new Date(selectedSlot), "h:mm a")}
              </p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-6 md:p-8">
          {!selectedSlot ? (
            <div className="space-y-10">
              {/* Full Calendar */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <CalendarIcon className="mr-2 w-5 h-5" /> Select a Date
                  </h2>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      disabled={isBefore(currentMonth, startOfMonth(today))}
                      className="p-2 rounded-full hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium min-w-[120px] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      disabled={isAfter(currentMonth, maxDate)}
                      className="p-2 rounded-full hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs font-semibold text-[var(--muted-foreground)] py-2 uppercase">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {emptyDays.map((empty) => (
                    <div key={`empty-${empty}`} className="p-2 md:p-4" />
                  ))}
                  
                  {daysInMonth.map((date) => {
                    const isDisabled = isBefore(date, today) || isAfter(date, maxDate);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isCurrentDay = isSameDay(date, today);

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => !isDisabled && setSelectedDate(date)}
                        disabled={isDisabled}
                        className={`
                          p-2 md:p-4 rounded-xl text-center font-medium transition-all
                          ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--muted)] cursor-pointer"}
                          ${isSelected ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)] shadow-sm" : ""}
                          ${isCurrentDay && !isSelected ? "text-[var(--primary)] font-bold bg-[var(--primary)]/10" : ""}
                        `}
                      >
                        {format(date, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="animate-in fade-in slide-in-from-top-4 pt-6 border-t border-[var(--border)]">
                  <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
                    <span>Available Times on {format(selectedDate, "MMM d")}</span>
                  </h2>
                  
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading availability...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className="py-3 px-4 rounded-xl border border-[var(--border)] text-center font-medium hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-all focus:ring-2 focus:ring-[var(--primary)] outline-none"
                        >
                          {format(new Date(slot), "h:mm a")}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                      <p className="text-[var(--muted-foreground)]">No available times on this date. Please select another date.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
                <h2 className="text-2xl font-semibold">Your Details</h2>
                <button 
                  onClick={() => setSelectedSlot(null)}
                  className="mt-2 sm:mt-0 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors"
                >
                  Change time
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <input
                    id="name"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="topic" className="text-sm font-medium">Topic / Reason for meeting</label>
                  <textarea
                    id="topic"
                    required
                    rows={4}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none transition-shadow"
                    placeholder="What would you like to discuss?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 mt-6 rounded-xl font-bold text-[var(--primary-foreground)] bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-sm"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Confirming...</>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
                
                <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
                  By confirming, you will receive an email invitation with a Google Meet link.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
