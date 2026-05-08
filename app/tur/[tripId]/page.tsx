import { notFound } from "next/navigation";
import { db } from "../../lib/db";
import { trips, participants } from "../../lib/schema";
import { eq } from "drizzle-orm";
import InvitePageClient from "./InvitePageClient";

export default async function TurPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) notFound();

  const members = await db.query.participants.findMany({
    where: eq(participants.tripId, tripId),
    orderBy: (p, { asc }) => [asc(p.joinedAt)],
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adminToken: _adminToken, ...tripPublic } = trip;

  return (
    <InvitePageClient
      trip={{
        ...tripPublic,
        routeLat: String(tripPublic.routeLat),
        routeLon: String(tripPublic.routeLon),
      }}
      initialParticipants={members}
    />
  );
}
