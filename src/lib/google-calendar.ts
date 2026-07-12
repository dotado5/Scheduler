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

export async function getFreeBusy(timeMin: Date, timeMax: Date) {
  const calendarId = process.env.HOST_CALENDAR_ID;
  
  if (!calendarId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.log("⚠️ Google credentials not fully set. Using mock busy periods.");
    const year = timeMin.getFullYear();
    const month = String(timeMin.getMonth() + 1).padStart(2, '0');
    const day = String(timeMin.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Return mock busy hours in UTC/offset to simulate booked slots (10:00-11:00 and 14:00-15:00)
    return [
      {
        start: `${dateStr}T10:00:00Z`,
        end: `${dateStr}T11:00:00Z`,
      },
      {
        start: `${dateStr}T14:00:00Z`,
        end: `${dateStr}T15:00:00Z`,
      },
    ];
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
  
  if (!calendarId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.log("⚠️ Google credentials not fully set. Using mock calendar event creation.");
    return {
      id: `mock-event-${Date.now()}`,
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      htmlLink: "https://calendar.google.com",
    };
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
