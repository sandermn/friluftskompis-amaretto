import { NextRequest } from "next/server";
import { db } from "../../lib/db";
import { trips } from "../../lib/schema";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      routeId,
      routeName,
      routeDistanceKm,
      routeVanskelighet,
      routeLat,
      routeLon,
      tripTitle,
      date,
      startTime,
      description,
      packingList,
    } = body;

    if (
      !routeId ||
      !routeName ||
      !tripTitle?.trim() ||
      !date ||
      !routeLat ||
      !routeLon
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (tripTitle.trim().length > 80) {
      return Response.json({ error: "Tittel er for lang" }, { status: 400 });
    }

    const id = nanoid(10);
    const adminToken = nanoid(21);

    await db.insert(trips).values({
      id,
      adminToken,
      routeId: Number(routeId),
      routeName: String(routeName),
      routeDistanceKm: routeDistanceKm ? Number(routeDistanceKm) : null,
      routeVanskelighet: String(routeVanskelighet),
      routeLat: String(routeLat),
      routeLon: String(routeLon),
      tripTitle: tripTitle.trim().slice(0, 80),
      date: String(date),
      startTime: startTime ? String(startTime).slice(0, 5) : null,
      description: String(description ?? "").slice(0, 500),
      packingList: packingList ?? null,
    });

    return Response.json({ tripId: id, adminToken });
  } catch {
    return Response.json({ error: "Kunne ikke opprette tur" }, { status: 500 });
  }
}
