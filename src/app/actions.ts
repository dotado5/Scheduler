"use server";

import { getAvailableSlots } from "@/lib/slots";
import { EVENT_TYPES } from "@/config/event-types";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";

/**
 * Returns available time slots for an event type on a given date.
 * Replaces the former GET /api/slots route.
 */
export async function getSlots(
  eventTypeId: string,
  date: string
): Promise<{ slots: string[]; error?: string }> {
  const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);
  if (!eventType) {
    return { slots: [], error: "Invalid event type" };
  }

  try {
    const slots = await getAvailableSlots(date, eventType.duration);
    return { slots };
  } catch (error) {
    console.error("Error fetching slots:", error);
    return { slots: [], error: "Failed to fetch availability" };
  }
}

export interface CreateBookingInput {
  name: string;
  email: string;
  topic: string;
  date: string;
  startTime: string;
  eventTypeId: string;
  timezone: string;
}

export type CreateBookingResult =
  | { success: true; meetLink: string | null; startTime: string; eventId?: string | null }
  | { success: false; error: string; code?: "slot_taken" | "invalid" };

/**
 * Creates a booking: re-validates the slot, inserts the Google Calendar event
 * (with a Meet link), and sends the guest + host emails.
 * Replaces the former POST /api/bookings/create route.
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  try {
    const { name, email, topic, date, startTime, eventTypeId, timezone } = input;

    if (!name || !email || !topic || !date || !startTime || !eventTypeId || !timezone) {
      return { success: false, error: "Missing required fields", code: "invalid" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);
    if (!eventType) {
      return { success: false, error: "Invalid event type", code: "invalid" };
    }

    // 1. Re-validate slot availability to prevent race conditions
    const slots = await getAvailableSlots(date, eventType.duration);
    if (!slots.includes(startTime)) {
      return {
        success: false,
        error: "This time slot is no longer available. Please select another time.",
        code: "slot_taken",
      };
    }

    // 2. Create Google Calendar Event
    const startObj = new Date(startTime);
    const endObj = new Date(startObj.getTime() + eventType.duration * 60000);

    const eventSummary = `${eventType.title} with ${name}`;
    const eventDescription = `Guest: ${name} (${email})\nTopic: ${topic}\n\nBooked via Personal Scheduler.`;

    const gcalEvent = await createCalendarEvent({
      summary: eventSummary,
      description: eventDescription,
      startTime: startObj,
      endTime: endObj,
      guestEmail: email,
    });

    const meetLink = gcalEvent.hangoutLink ?? null;
    if (!meetLink) {
      console.warn("Google Meet link was not generated. Ensure conferenceDataVersion is set and scopes are correct.");
    }

    // 3. Send Emails
    const hostEmail = process.env.HOST_EMAIL || process.env.SMTP_USER || "Host";
    const hostName = process.env.HOST_NAME || "Your Host";
    const formattedStartTime = format(startObj, "PPpp"); // e.g. Apr 29, 2026, 9:00 AM

    // Email to Guest
    await sendEmail({
      to: email,
      subject: `Your ${eventType.title} is confirmed ✓`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your meeting is confirmed!</h2>
          <p>Hi ${name},</p>
          <p>Your <strong>${eventType.title}</strong> with ${hostName} is confirmed for:</p>
          <p style="font-size: 1.1em; background: #f4f4f5; padding: 12px; border-radius: 8px;">
            <strong>${formattedStartTime}</strong>
          </p>
          ${meetLink ? `
          <div style="margin: 24px 0;">
            <a href="${meetLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Join Google Meet
            </a>
          </div>
          ` : ""}
          <p>Topic: ${topic}</p>
          <p>Looking forward to it!</p>
        </div>
      `,
    });

    // Email to Host
    await sendEmail({
      to: hostEmail,
      subject: `New booking: ${name} — ${eventType.title}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>New Booking Confirmed</h2>
          <p><strong>Guest:</strong> ${name} (${email})</p>
          <p><strong>Event:</strong> ${eventType.title}</p>
          <p><strong>Time:</strong> ${formattedStartTime}</p>
          <p><strong>Topic:</strong> ${topic}</p>
          <p><strong>Meet Link:</strong> <a href="${meetLink}">${meetLink || "N/A"}</a></p>
          <p><a href="${gcalEvent.htmlLink}">View in Google Calendar</a></p>
        </div>
      `,
    });

    // 4. Return success
    return {
      success: true,
      meetLink,
      startTime,
      eventId: gcalEvent.id,
    };
  } catch (error) {
    console.error("Booking error:", error);
    return { success: false, error: "An error occurred while creating the booking" };
  }
}
