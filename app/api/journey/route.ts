export const dynamic = "force-dynamic";
export const maxDuration = 90;
import { NextRequest, NextResponse } from "next/server";
import { ensureInit } from "@/lib/init";
import { JourneyError, planJourney } from "@/lib/journey";

const connectors = ["CCS2", "Type 2", "CHAdeMO"];

// POST /api/journey — plan a real route with charging stops anywhere in India
export async function POST(req: NextRequest) {
  ensureInit();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const source = typeof body?.source === "string" ? body.source.trim() : "";
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const battery = Number(body?.battery);
  if (!source || !destination || source.length > 120 || destination.length > 120)
    return NextResponse.json({ error: "Add a starting point and destination." }, { status: 400 });
  if (!Number.isFinite(battery) || battery < 5 || battery > 100)
    return NextResponse.json({ error: "Battery must be between 5 and 100%." }, { status: 400 });
  if (!connectors.includes(body?.connector))
    return NextResponse.json({ error: "Choose a supported connector." }, { status: 400 });
  try {
    const route = await planJourney({
      source,
      destination,
      battery,
      connector: body.connector,
      preference: body.preference === "fastest" ? "fastest" : "charging",
      car: body.car && typeof body.car === "object" ? body.car : undefined,
      bookedStops: Array.isArray(body.bookedStops)
        ? body.bookedStops
            .filter(
              (b: any) =>
                b && typeof b.stationId === "string" && typeof b.chargerId === "string" &&
                Number.isFinite(b.minutes) && b.minutes >= 10 && b.minutes <= 240,
            )
            .slice(0, 10)
        : undefined,
    });
    return NextResponse.json({ route });
  } catch (e) {
    if (e instanceof JourneyError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[journey]", e);
    return NextResponse.json({ error: "We couldn’t plan this journey. Please try again." }, { status: 500 });
  }
}
