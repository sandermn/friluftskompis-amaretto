import { NextRequest } from "next/server";
import { db } from "../../../../lib/db";
import { trips, participants } from "../../../../lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    const { name } = await req.json();

    const trimmed = String(name ?? "")
      .trim()
      .slice(0, 40);
    if (!trimmed) {
      return Response.json({ error: "Navn er påkrevd" }, { status: 400 });
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });
    if (!trip) {
      return Response.json({ error: "Tur ikke funnet" }, { status: 404 });
    }

    const existing = await db.query.participants.findMany({
      where: eq(participants.tripId, tripId),
    });

    const duplicate = existing.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      return Response.json(
        { error: "Dette navnet er allerede påmeldt" },
        { status: 409 },
      );
    }

    await db.insert(participants).values({ tripId, name: trimmed });

    const updated = await db.query.participants.findMany({
      where: eq(participants.tripId, tripId),
      orderBy: (p, { asc }) => [asc(p.joinedAt)],
    });

    return Response.json({ ok: true, participants: updated });
  } catch {
    return Response.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
