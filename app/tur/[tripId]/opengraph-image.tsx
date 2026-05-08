import { ImageResponse } from "next/og";
import { db } from "../../lib/db";
import { trips, participants } from "../../lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });

  if (!trip) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0fdf4",
          fontSize: 48,
          color: "#166534",
          fontFamily: "sans-serif",
        }}
      >
        ⛰️ Friluftskompis
      </div>,
      { ...size },
    );
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

  const meta = [
    trip.routeDistanceKm ? `${trip.routeDistanceKm} km` : null,
    trip.routeVanskelighet !== "Ukjent" ? trip.routeVanskelighet : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)",
        padding: "60px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Top: site name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 40,
        }}
      >
        <span style={{ fontSize: 32 }}>⛰️</span>
        <span
          style={{
            fontSize: 24,
            color: "#bbf7d0",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          Friluftskompis
        </span>
      </div>

      {/* Trip title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1.1,
          marginBottom: 24,
          maxWidth: 900,
        }}
      >
        {trip.tripTitle}
      </div>

      {/* Route name */}
      <div
        style={{
          fontSize: 32,
          color: "#86efac",
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        {trip.routeName}
        {meta ? `  ·  ${meta}` : ""}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom row: date + participants */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: 28,
        }}
      >
        <div style={{ fontSize: 28, color: "#d1fae5", fontWeight: 500 }}>
          📅 {date}
        </div>
        {memberCount > 0 && (
          <div
            style={{
              fontSize: 24,
              color: "#bbf7d0",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 999,
              padding: "8px 24px",
            }}
          >
            👥 {memberCount} påmeldt
          </div>
        )}
      </div>
    </div>,
    { ...size },
  );
}
