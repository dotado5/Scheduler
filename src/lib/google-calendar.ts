import { google } from "googleapis";

// Initialize the OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Set the refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Initialize the Calendar API client
export const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

/**
 * Helper to fetch free/busy information for a specific time range.
 */
export async function getFreeBusy(timeMin: Date, timeMax: Date) {
  const calendarId = process.env.HOST_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error("HOST_CALENDAR_ID is not defined in environment variables.");
  }

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
      timeZone: process.env.HOST_TIMEZONE || "UTC",
    },
  });

  return response.data.calendars?.[calendarId]?.busy || [];
}

/**
 * Helper to create a calendar event with a Google Meet link.
 */
export async function createCalendarEvent({
  summary,
  description,
  startTime,
  endTime,
  guestEmail,
}: {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  guestEmail: string;
}) {
  const calendarId = process.env.HOST_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error("HOST_CALENDAR_ID is not defined in environment variables.");
  }

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1, // Required to generate Meet link
    requestBody: {
      summary,
      description,
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      attendees: [
        { email: guestEmail },
        { email: calendarId }, // The host
      ],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`, // Unique ID for the Meet link creation request
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  return response.data;
}
