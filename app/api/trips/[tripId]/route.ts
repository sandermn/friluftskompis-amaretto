import { NextRequest } from "next/server";
import { db } from "../../../lib/db";
import { trips, participants } from "../../../lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!trip) {
      return Response.json({ error: "Tur ikke funnet" }, { status: 404 });
    }

    const members = await db.query.participants.findMany({
      where: eq(participants.tripId, tripId),
      orderBy: (p, { asc }) => [asc(p.joinedAt)],
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminToken: _adminToken, ...tripPublic } = trip;

    return Response.json({ trip: tripPublic, participants: members });
  } catch {
    return Response.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
