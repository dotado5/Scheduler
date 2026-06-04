# Personal Scheduler — Product Requirements Document

**Version:** 2.0 (Simplified)
**Date:** June 2026
**Scope:** Lightweight guest-facing booking interface — no database, no auth, no dashboard.

---

## 1. Overview

A minimal personal scheduling tool. Guests visit a public page, pick a date and available time slot, fill in their details, and submit. On submission:

- A Google Calendar event is created on the host's calendar (with Google Meet link auto-generated).
- A confirmation email is sent to the guest.
- A notification email is sent to the host.

No login. No database. No admin panel. Everything is driven by environment variables and the Google Calendar API.

---

## 2. How It Works (End-to-End)

```
Guest visits /  →  Picks event type  →  Picks date & time slot
  →  Fills booking form  →  Submits
    →  Server creates Google Calendar event (+ Meet link)
    →  Server sends email to guest (confirmation)
    →  Server sends email to host (notification)
    →  Guest sees confirmation page
```

---

## 3. What Is Stored (And Where)

There is **no database**. All persistent state lives in two places:

| Data | Where it lives |
|---|---|
| Host availability (weekly schedule) | Environment variables / a static config file (`config/availability.ts`) |
| Event types | Static config file (`config/event-types.ts`) |
| Booked slots (to prevent double-booking) | Google Calendar — the source of truth. Slots are checked against existing Google Calendar events in real time. |
| Booking records | Google Calendar events (the event description stores guest name, email, topic) |

---

## 4. Event Types

Defined once in a static config file by the host. No UI to manage them.

**Example `config/event-types.ts`:**

```ts
export const EVENT_TYPES = [
  {
    id: "intro-call",
    title: "Intro Call",
    description: "A quick introduction and overview.",
    duration: 30, // minutes
    color: "#4F46E5",
  },
  {
    id: "deep-dive",
    title: "Deep Dive",
    description: "A longer working session.",
    duration: 60,
    color: "#0F766E",
  },
];
```

---

## 5. Availability Configuration

Defined once in a static config file. No UI to manage it.

**Example `config/availability.ts`:**

```ts
export const AVAILABILITY = {
  timezone: "Africa/Lagos",
  bufferBetweenMeetings: 15, // minutes
  minNoticeHours: 1,
  maxDaysAhead: 30,
  weeklySchedule: {
    monday:    [{ start: "09:00", end: "17:00" }],
    tuesday:   [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "12:00" }],
    thursday:  [{ start: "09:00", end: "17:00" }],
    friday:    [{ start: "09:00", end: "15:00" }],
    saturday:  [],
    sunday:    [],
  },
};
```

---

## 6. Slot Availability Logic

When a guest requests available slots for a given date, the server:

1. Reads the host's weekly schedule from the config file.
2. Calls **Google Calendar API** (`freebusy.query`) with the host's OAuth service account to fetch busy periods for that day.
3. Subtracts busy periods (existing calendar events + buffer time).
4. Filters out slots too close to now (based on `minNoticeHours`).
5. Filters out dates beyond `maxDaysAhead`.
6. Returns the remaining slots, split into `duration`-length windows at 15-minute intervals.

Google Calendar is the **single source of truth** for what's booked — no local state needed.

---

## 7. Booking Flow (Guest)

### Step 1 — Landing page `/`
Lists all event types as cards (title, duration, description, "Book" button).

### Step 2 — Booking page `/book/[eventTypeId]`
- Month calendar for date selection.
- On date click: fetches available slots for that date from `/api/slots?eventTypeId=...&date=YYYY-MM-DD`.
- Guest selects a time slot.
- Booking form appears with:
  - **Name** (required)
  - **Email** (required)
  - **Topic / Reason for meeting** (required)
  - **Timezone** (auto-detected via `Intl.DateTimeFormat`, guest can change)
- Guest submits form.

### Step 3 — Server processing (`POST /api/bookings/create`)
1. Re-fetch availability to guard against race conditions.
2. If slot is taken: return `409` — guest is prompted to pick another slot.
3. If slot is free:
   - Create Google Calendar event with `conferenceData` (generates Meet link).
   - Send confirmation email to guest.
   - Send notification email to host.
4. Return booking summary (Meet link, start time, etc.).

### Step 4 — Confirmation page `/book/[eventTypeId]/confirmed`
Shows:
- Event title, date & time (in guest's timezone).
- Google Meet link.
- "Add to Google Calendar" button (pre-filled `.ics` URL).
- Confirmation that emails have been sent.

---

## 8. Google Calendar Integration

- Authentication uses a **Google Service Account** with domain-wide delegation, OR the host runs a one-time OAuth consent flow to generate a refresh token stored in environment variables.
- The app calls `calendar.events.insert` on the host's primary calendar with:
  - `summary`: `[Event Title] with [Guest Name]`
  - `description`: Guest email, topic, and booking source.
  - `attendees`: Host email + guest email (Google sends attendee invites automatically).
  - `conferenceData.createRequest`: triggers Meet link generation.
- The `hangoutLink` from the response is returned to the guest and included in emails.

---

## 9. Email Notifications

No paid service required. The following **free npm packages** can handle email sending:

### Option A — Nodemailer (recommended)
- **Package:** `nodemailer`
- **How:** Use any free SMTP provider as the transport.
- **Free SMTP providers:**
  - **Gmail SMTP** — free with a Google account; use an App Password (not your main password). Limit: ~500 emails/day.
  - **Brevo (formerly Sendinblue)** — free tier: 300 emails/day. SMTP credentials provided.
  - **Mailersend** — free tier: 3,000 emails/month. SMTP supported.
  - **Resend** — free tier: 3,000 emails/month. Has an official `resend` npm package too.

```ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: `"Your Name" <you@example.com>`,
  to: guestEmail,
  subject: "Your meeting is confirmed",
  html: confirmationEmailHtml,
});
```

### Option B — Resend SDK
- **Package:** `resend`
- **How:** API-key based, no SMTP config needed. Clean developer experience.
- **Free tier:** 3,000 emails/month, 100/day.
- Requires a verified sending domain (free).

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "you@yourdomain.com",
  to: guestEmail,
  subject: "Your meeting is confirmed",
  html: confirmationEmailHtml,
});
```

### Recommendation
Use **Nodemailer + Gmail SMTP** if you want zero sign-ups. Use **Resend** if you want a cleaner setup and a proper sending domain. Both are free at this scale.

---

## 10. Emails Sent

### 10.1 Guest Confirmation Email

**Subject:** `Your [Event Title] is confirmed ✓`

Contents:
- Guest name, event title, duration.
- Date and time in the **guest's timezone**.
- Google Meet link (prominent).
- Host name and contact email.
- "Add to Google Calendar" link.

### 10.2 Host Notification Email

**Subject:** `New booking: [Guest Name] — [Event Title]`

Contents:
- Guest name, email, and topic.
- Date and time in the **host's timezone**.
- Google Meet link.
- The Google Calendar event link (so host can view/edit it directly).

---

## 11. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript throughout |
| Auth | None (no host login needed) |
| Database | None |
| Calendar | Google Calendar API v3 (`googleapis` npm package) |
| Email | `nodemailer` (free SMTP) or `resend` (free tier) |
| Styling | Tailwind CSS |
| Deployment | Vercel (free hobby tier is sufficient) |

---

## 12. Environment Variables

```env
# Google Calendar (Service Account or OAuth refresh token approach)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=       # one-time OAuth flow to get this
HOST_CALENDAR_ID=           # usually your Gmail address

# Host info
HOST_NAME=
HOST_EMAIL=
HOST_TIMEZONE=Africa/Lagos

# Email — pick one approach
SMTP_HOST=smtp.gmail.com    # if using Nodemailer + Gmail
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=                  # Gmail App Password
# OR
RESEND_API_KEY=             # if using Resend

# App
NEXT_PUBLIC_APP_URL=
```

---

## 13. API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/slots` | Returns available time slots. Query params: `eventTypeId`, `date` (YYYY-MM-DD). |
| POST | `/api/bookings/create` | Creates the booking: inserts Google Calendar event, sends emails, returns Meet link. |

Only two server endpoints. Everything else is static or client-side.

---

## 14. Project File Structure

```
/
├── config/
│   ├── availability.ts       # Weekly schedule, buffer, notice rules
│   └── event-types.ts        # All event type definitions
├── app/
│   ├── page.tsx              # Landing page — lists event types
│   ├── book/
│   │   └── [eventTypeId]/
│   │       ├── page.tsx      # Booking page (calendar + form)
│   │       └── confirmed/
│   │           └── page.tsx  # Post-booking confirmation page
│   └── api/
│       ├── slots/
│       │   └── route.ts      # GET — available slots
│       └── bookings/
│           └── create/
│               └── route.ts  # POST — create booking
├── lib/
│   ├── google-calendar.ts    # Google Calendar API wrapper
│   ├── email.ts              # Email sending (nodemailer or resend)
│   ├── slots.ts              # Slot generation logic
│   └── types.ts              # Shared TypeScript types
└── components/
    ├── CalendarPicker.tsx
    ├── SlotList.tsx
    ├── BookingForm.tsx
    └── EventTypeCard.tsx
```

---

## 15. Out of Scope (Kept Simple on Purpose)

- Host dashboard / admin panel
- Database / persistent booking records
- Authentication / login
- Cancellation or rescheduling flows
- SMS notifications
- Payments
- Multi-host support
- Reminder emails (no stored schedule to trigger against)

---

## 16. V1 Success Criteria

- [ ] Guest can visit the public page and see available event types.
- [ ] Guest can pick a date and see real-time available slots (Google Calendar conflict-aware).
- [ ] Guest fills out and submits the booking form.
- [ ] A Google Calendar event is created on the host's calendar with a Meet link.
- [ ] Guest receives a confirmation email with the Meet link.
- [ ] Host receives a notification email with guest details and Meet link.
- [ ] Two guests cannot book the same slot (race condition handled server-side).
- [ ] All times displayed correctly in each party's timezone.
