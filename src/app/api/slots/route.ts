import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";
import { EVENT_TYPES } from "@/config/event-types";

export const dynamic = "force-dynamic"; // Do not cache this route

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const eventTypeId = searchParams.get("eventTypeId");

    if (!date || !eventTypeId) {
      return NextResponse.json({ error: "Missing date or eventTypeId parameter" }, { status: 400 });
    }

    const eventType = EVENT_TYPES.find((e) => e.id === eventTypeId);
    if (!eventType) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Fetch slots
    const slots = await getAvailableSlots(date, eventType.duration);

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
