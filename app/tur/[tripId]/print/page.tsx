import { notFound } from "next/navigation";
import { db } from "../../../lib/db";
import { trips, participants } from "../../../lib/schema";
import { eq } from "drizzle-orm";
import RouteSvgMap from "../../../components/RouteSvgMap";
import PrintButton from "../../../components/PrintButton";
import type { PackingListResponse } from "../../../api/packing-list/route";

export default async function TripPrintPage({
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

  const date = new Date(trip.date).toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const SPEED: Record<string, number> = { Enkel: 4, Middels: 3, Krevende: 2 };
  const kmh = SPEED[trip.routeVanskelighet] ?? 3;
  const start = trip.startTime ?? "09:00";
  const durationMin = trip.routeDistanceKm
    ? Math.round((trip.routeDistanceKm / kmh) * 60)
    : null;

  function addMinutes(hhmm: string, mins: number) {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  const packingList = trip.packingList as PackingListResponse | null;
  const geojson = trip.routeGeojson as {
    type: string;
    coordinates: unknown;
  } | null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        body { font-family: sans-serif; color: #111; background: white; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <a
          href={`/tur/${tripId}`}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Tilbake
        </a>
        <PrintButton />
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
            Friluftskompis · Turinfo
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{trip.tripTitle}</h1>
          <p className="text-gray-600 mt-1">
            {trip.routeName}
            {trip.routeDistanceKm ? ` · ${trip.routeDistanceKm} km` : ""}
            {trip.routeVanskelighet !== "Ukjent"
              ? ` · ${trip.routeVanskelighet}`
              : ""}
          </p>
          <p className="text-green-700 font-medium mt-1">📅 {date}</p>
          {trip.description && (
            <p className="text-gray-500 text-sm mt-2">{trip.description}</p>
          )}
        </div>

        {/* SVG Route map */}
        {geojson && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Rute
            </h2>
            <RouteSvgMap geojson={geojson} width={560} height={280} />
            <p className="text-xs text-gray-400 mt-1">
              Koordinater: {Number(trip.routeLat).toFixed(4)}° N,{" "}
              {Number(trip.routeLon).toFixed(4)}° Ø
            </p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Tidslinje
          </h2>
          <ol className="space-y-2 border-l-2 border-green-200 pl-4">
            <li>
              <span className="font-semibold text-sm">{start}</span>
              <span className="text-gray-600 text-sm ml-2">🚶 Avreise</span>
            </li>
            {durationMin && (
              <li>
                <span className="font-semibold text-sm">
                  {addMinutes(start, Math.round(durationMin / 2))}
                </span>
                <span className="text-gray-600 text-sm ml-2">🏔️ Halvveis</span>
              </li>
            )}
            {durationMin && (
              <li>
                <span className="font-semibold text-sm">
                  {addMinutes(start, durationMin)}
                </span>
                <span className="text-gray-600 text-sm ml-2">
                  🏁 Estimert ankomst
                </span>
              </li>
            )}
          </ol>
        </div>

        {/* Participants */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Deltakere ({members.length})
          </h2>
          {members.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen påmeldte enda.</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="text-sm text-gray-800">
                  · {m.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Packing list */}
        {packingList && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              🎒 Pakkeliste
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {packingList.categories.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    {cat.emoji} {cat.category}
                  </p>
                  <ul className="space-y-0.5">
                    {cat.items.map((item) => (
                      <li
                        key={item}
                        className="text-xs text-gray-600 flex items-start gap-1.5"
                      >
                        <span className="mt-0.5 w-3 h-3 border border-gray-400 rounded-sm shrink-0 inline-block" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {packingList.tips.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  💡 Tips
                </p>
                <ul className="space-y-0.5">
                  {packingList.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      · {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 flex justify-between">
          <span>friluftskompis.no/tur/{tripId}</span>
          <span>Generert {new Date().toLocaleDateString("nb-NO")}</span>
        </div>
      </div>
    </>
  );
}
