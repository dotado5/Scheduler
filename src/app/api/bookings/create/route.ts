import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";
import { EVENT_TYPES } from "@/config/event-types";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, topic, date, startTime, eventTypeId, timezone } = body;

    if (!name || !email || !topic || !date || !startTime || !eventTypeId || !timezone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);
    if (!eventType) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // 1. Re-validate slot availability to prevent race conditions
    const slots = await getAvailableSlots(date, eventType.duration);
    if (!slots.includes(startTime)) {
      return NextResponse.json({ error: "This time slot is no longer available. Please select another time." }, { status: 409 });
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

    const meetLink = gcalEvent.hangoutLink;
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

    // 4. Return success to client
    return NextResponse.json({ 
      success: true, 
      meetLink, 
      startTime: startTime,
      eventId: gcalEvent.id
    });

  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "An error occurred while creating the booking" }, { status: 500 });
  }
}
