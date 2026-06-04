import { addMinutes, isBefore, isAfter, addHours, addDays, parseISO } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { AVAILABILITY } from "@/config/availability";
import { getFreeBusy } from "@/lib/google-calendar";

export async function getAvailableSlots(dateString: string, eventDuration: number) {
  const { timezone, bufferBetweenMeetings, minNoticeHours, maxDaysAhead, weeklySchedule } = AVAILABILITY;

  // 1. Parse the requested date in the host's timezone
  // dateString is expected to be 'YYYY-MM-DD'
  const timeMin = toDate(`${dateString}T00:00:00`, { timeZone: timezone });
  const timeMax = toDate(`${dateString}T23:59:59`, { timeZone: timezone });

  const now = new Date();
  
  // 2. Validate maxDaysAhead
  const maxDate = addDays(now, maxDaysAhead);
  if (isAfter(timeMin, maxDate)) {
    return [];
  }

  // 3. Get the day of the week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = parseInt(formatInTimeZone(timeMin, timezone, 'i'), 10) % 7; // 'i' is 1-7 for Mon-Sun
  const dailySchedule = weeklySchedule[dayOfWeek];

  if (!dailySchedule || dailySchedule.length === 0) {
    return [];
  }

  // 4. Fetch busy periods from Google Calendar
  const busyPeriods = await getFreeBusy(timeMin, timeMax);

  const availableSlots: string[] = [];
  const minNoticeTime = addHours(now, minNoticeHours);

  // 5. Generate slots for each configured block in the day
  for (const block of dailySchedule) {
    // Parse block start/end times in the host timezone
    const blockStart = toDate(`${dateString}T${block.start}:00`, { timeZone: timezone });
    const blockEnd = toDate(`${dateString}T${block.end}:00`, { timeZone: timezone });

    let currentSlotStart = blockStart;

    // Increment by 15 minutes until the slot can no longer fit in the block
    while (isBefore(addMinutes(currentSlotStart, eventDuration), blockEnd) || currentSlotStart.getTime() + eventDuration * 60000 === blockEnd.getTime()) {
      const currentSlotEnd = addMinutes(currentSlotStart, eventDuration);

      // Check min notice
      if (isBefore(currentSlotStart, minNoticeTime)) {
        currentSlotStart = addMinutes(currentSlotStart, 15);
        continue;
      }

      // Check for overlap with Google Calendar busy periods (including buffers)
      const hasOverlap = busyPeriods.some((busy: { start?: string | null; end?: string | null }) => {
        const busyStart = parseISO(busy.start || "");
        const busyEnd = parseISO(busy.end || "");
        
        // Expand busy period by the buffer
        const busyStartWithBuffer = addMinutes(busyStart, -bufferBetweenMeetings);
        const busyEndWithBuffer = addMinutes(busyEnd, bufferBetweenMeetings);

        // Overlap condition:
        // Slot start is before busy end AND slot end is after busy start
        return isBefore(currentSlotStart, busyEndWithBuffer) && isAfter(currentSlotEnd, busyStartWithBuffer);
      });

      if (!hasOverlap) {
        availableSlots.push(currentSlotStart.toISOString());
      }

      // Move forward by 15 minutes
      currentSlotStart = addMinutes(currentSlotStart, 15);
    }
  }

  return availableSlots;
}
