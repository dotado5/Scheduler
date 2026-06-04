export const AVAILABILITY = {
  timezone: "Africa/Lagos", // Default timezone for the host
  bufferBetweenMeetings: 15, // Minutes between back-to-back meetings
  minNoticeHours: 1, // Minimum hours of notice before a booking
  maxDaysAhead: 30, // How far into the future guests can book
  weeklySchedule: {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Using simple HH:mm strings in 24-hour format
    1: [{ start: "09:00", end: "17:00" }], // Monday
    2: [{ start: "09:00", end: "17:00" }], // Tuesday
    3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }], // Wednesday (with lunch break)
    4: [{ start: "09:00", end: "17:00" }], // Thursday
    5: [{ start: "09:00", end: "15:00" }], // Friday
    6: [], // Saturday
    0: [], // Sunday
  } as Record<number, { start: string; end: string }[]>,
};
