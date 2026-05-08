import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "../../lib/db";
import { trips, participants } from "../../lib/schema";
import { eq } from "drizzle-orm";
import InvitePageClient from "./InvitePageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) {
    return { title: "Tur ikke funnet" };
  }

  const memberCount = await db.$count(
    participants,
    eq(participants.tripId, tripId),
  );

  const date = new Date(trip.date).toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const description = [
    `${trip.routeName}`,
    trip.routeDistanceKm ? `${trip.routeDistanceKm} km` : null,
    trip.routeVanskelighet !== "Ukjent" ? trip.routeVanskelighet : null,
    `📅 ${date}`,
    memberCount > 0
      ? `👥 ${memberCount} påmeldt`
      : "Bli den første til å melde deg på!",
  ]
    .filter(Boolean)
    .join(" · ");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://friluftskompis.no";
  const url = `${baseUrl}/tur/${tripId}`;

  return {
    title: trip.tripTitle,
    description,
    openGraph: {
      title: trip.tripTitle,
      description,
      url,
      siteName: "Friluftskompis",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: trip.tripTitle,
      description,
    },
  };
}

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
