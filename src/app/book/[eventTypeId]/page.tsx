"use client";

import { EVENT_TYPES } from "@/config/event-types";
import { notFound, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  format,
  addDays,
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { getSlots, createBooking } from "@/app/actions";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export default function BookingPage({
  params,
}: {
  params: { eventTypeId: string };
}) {
  const router = useRouter();
  const eventType = EVENT_TYPES.find((e) => e.id === params.eventTypeId);

  if (!eventType) {
    notFound();
  }

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(startOfToday()),
  );

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const today = startOfToday();
  const maxDate = addDays(today, 30); // Max days ahead

  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [timezoneList, setTimezoneList] = useState<string[]>(COMMON_TIMEZONES);

  useEffect(() => {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (userTz && !COMMON_TIMEZONES.includes(userTz)) {
      setTimezoneList((prev) => [userTz, ...prev]);
    }
    setSelectedTimezone(userTz || "UTC");
  }, []);

  // Fetch available slots for the selected date. `silent` skips the loader and
  // preserves the current list on error — used by the background auto-sync so it
  // never flashes a spinner or wipes the grid on a transient hiccup.
  const fetchSlots = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!selectedDate) return;
      if (!silent) setIsLoadingSlots(true);
      try {
        const dateString = format(selectedDate, "yyyy-MM-dd");
        const data = await getSlots(eventType.id, dateString);
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error(err);
        if (!silent) setAvailableSlots([]);
      } finally {
        if (!silent) setIsLoadingSlots(false);
      }
    },
    [selectedDate, eventType.id],
  );

  // On date change: reset any prior slot choice and load with the loader shown.
  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    fetchSlots();
  }, [selectedDate, fetchSlots]);

  // Auto-sync availability against the host's live calendar — no manual refresh.
  // Polls every 30s and refetches the instant the guest returns to the tab.
  // Pauses while the tab is hidden or the guest is filling the form (slot chosen).
  useEffect(() => {
    if (!selectedDate || selectedSlot) return;

    const SYNC_INTERVAL_MS = 30_000;
    const syncIfVisible = () => {
      if (document.visibilityState === "visible") {
        fetchSlots({ silent: true });
      }
    };

    const interval = setInterval(syncIfVisible, SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", syncIfVisible);
    window.addEventListener("focus", syncIfVisible);
    // Refetch when the connection comes back, so guests on flaky networks
    // aren't left staring at a stale list captured before they dropped offline.
    window.addEventListener("online", syncIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("focus", syncIfVisible);
      window.removeEventListener("online", syncIfVisible);
    };
  }, [selectedDate, selectedSlot, fetchSlots]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(val)) {
      setEmailError(null);
    } else {
      setEmailError("Please enter a valid email address.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await createBooking({
        name,
        email,
        topic,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedSlot,
        eventTypeId: eventType.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to create booking");
      }

      // Redirect to confirmation page
      router.push(
        `/book/${eventType.id}/confirmed?startTime=${encodeURIComponent(selectedSlot)}&meetLink=${encodeURIComponent(data.meetLink || "")}&timezone=${encodeURIComponent(selectedTimezone)}`,
      );
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
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to meeting types
      </Link>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12">
        {/* Left Side Panel - Event Info (col-span-3) */}
        <div className="p-6 md:p-8 md:col-span-3 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--muted)]/30 flex flex-col justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-2">
              {eventType.title}
            </h1>
            <div className="flex items-center text-[var(--muted-foreground)] mb-3 space-x-2 text-xs md:text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{eventType.duration} minutes</span>
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed break-words whitespace-normal text-xs md:text-sm">
              {eventType.description}
            </p>
          </div>

          {selectedDate && selectedSlot && (
            <div className="mt-8 p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">
                Selected Time
              </p>
              <p className="font-semibold text-sm md:text-base">
                {formatInTimeZone(
                  new Date(selectedSlot),
                  selectedTimezone,
                  "EEEE, MMMM d, yyyy",
                )}
              </p>
              <p className="text-[var(--primary)] font-bold text-sm md:text-base mt-0.5">
                {formatInTimeZone(
                  new Date(selectedSlot),
                  selectedTimezone,
                  "h:mm a",
                )}
              </p>
            </div>
          )}
        </div>

        {/* Right Side Panel - Interactive Widget (col-span-9) */}
        <div className="p-6 md:p-8 md:col-span-9 flex flex-col justify-center">
          {!selectedSlot ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-start">
              {/* Left inside: Calendar (col-span-7) */}
              <div className="sm:col-span-7 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <CalendarIcon className="mr-2 w-4 h-4 text-[var(--muted-foreground)]" />{" "}
                    Select a Date
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentMonth(subMonths(currentMonth, 1))
                      }
                      disabled={isBefore(currentMonth, startOfMonth(today))}
                      className="p-1.5 rounded-full hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-medium min-w-[90px] text-center text-xs md:text-sm">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentMonth(addMonths(currentMonth, 1))
                      }
                      disabled={isAfter(currentMonth, maxDate)}
                      className="p-1.5 rounded-full hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-xs font-semibold text-[var(--muted-foreground)] py-1 uppercase"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map((empty) => (
                    <div key={`empty-${empty}`} className="p-2" />
                  ))}

                  {daysInMonth.map((date) => {
                    const isDisabled =
                      isBefore(date, today) || isAfter(date, maxDate);
                    const isSelected =
                      selectedDate && isSameDay(date, selectedDate);
                    const isCurrentDay = isSameDay(date, today);

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => !isDisabled && setSelectedDate(date)}
                        disabled={isDisabled}
                        className={`
                          p-2 rounded-xl text-center text-sm font-medium transition-all
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

              {/* Right inside: Slots & Timezone (col-span-5) */}
              <div className="sm:col-span-5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-6 sm:pt-0 sm:pl-6 flex flex-col justify-between h-full min-h-[320px]">
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">
                    {selectedDate
                      ? `Available Time for ${format(selectedDate, "MMM d")}`
                      : "Select a Time"}
                  </h3>

                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                      Loading...
                    </div>
                  ) : selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className="w-full py-2.5 px-3 rounded-xl border border-[var(--border)] text-center font-medium hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-all outline-none text-xs"
                          >
                            {formatInTimeZone(
                              new Date(slot),
                              selectedTimezone,
                              "h:mm a",
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-[var(--muted)] rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                        No available times.
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center bg-[var(--muted)]/50 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                      Pick a date from the calendar.
                    </div>
                  )}
                </div>

                {/* Timezone picker */}
                <div className="pt-4 border-t border-[var(--border)] mt-4">
                  <label className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center mb-2 uppercase">
                    <Globe className="w-3.5 h-3.5 mr-1.5" /> Timezone
                  </label>
                  <select
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                  >
                    {timezoneList.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")} (GMT
                        {formatInTimeZone(new Date(), tz, "xxx")})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                <h2 className="text-xl font-bold">Your Details</h2>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="mt-2 sm:mt-0 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors"
                >
                  Change time
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="name"
                    className="text-xs font-semibold text-[var(--muted-foreground)]"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow text-sm"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold text-[var(--muted-foreground)]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border bg-[var(--background)] focus:outline-none focus:ring-2 transition-shadow text-sm ${
                      emailError
                        ? "border-red-500 focus:ring-red-500/50"
                        : "border-[var(--border)] focus:ring-[var(--primary)]"
                    }`}
                    placeholder="jane@example.com"
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1 font-medium">
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="topic"
                    className="text-xs font-semibold text-[var(--muted-foreground)]"
                  >
                    Topic / Reason for meeting
                  </label>
                  <textarea
                    id="topic"
                    required
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none transition-shadow text-sm"
                    placeholder="What would you like to discuss?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-5 mt-4 rounded-xl font-bold text-[var(--primary-foreground)] bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-sm text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Confirming...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>

                <p className="text-center text-[10px] text-[var(--muted-foreground)] mt-4">
                  By confirming, you will receive an email invitation with a
                  Google Meet link.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
