"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import WeatherForecast from "../../components/WeatherForecast";
import type { Route } from "../../page";

const MapLoader = dynamic(() => import("../../components/MapLoader"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
      Laster kart…
    </div>
  ),
});

interface Participant {
  id: number;
  name: string;
  joinedAt: string | Date;
}

interface TripData {
  id: string;
  routeId: number;
  routeName: string;
  routeDistanceKm: number | null;
  routeVanskelighet: string;
  routeLat: string;
  routeLon: string;
  tripTitle: string;
  date: string;
  description: string;
}

interface Props {
  trip: TripData;
  initialParticipants: Participant[];
}

function buildRoute(trip: TripData): Route {
  return {
    id: trip.routeId,
    name: trip.routeName,
    beskrivelse: null,
    vanskelighet: trip.routeVanskelighet,
    gradingRaw: 0,
    distanceKm: trip.routeDistanceKm,
    omrade: null,
    lat: Number(trip.routeLat),
    lon: Number(trip.routeLon),
    geojson: null,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatJoined(iso: string | Date) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvitePageClient({ trip, initialParticipants }: Props) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const key = `friluftskompis:joined:${trip.id}`;
    if (!hasJoinedRef.current && sessionStorage.getItem(key)) {
      hasJoinedRef.current = true;
      setHasJoined(true);
    }
  }, [trip.id]);

  // Poll participant list every 10s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/trips/${trip.id}`);
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.participants ?? []);
        }
      } catch {
        // ignore poll errors
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [trip.id]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    setJoining(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Noe gikk galt");
        return;
      }
      setParticipants(data.participants ?? []);
      setHasJoined(true);
      sessionStorage.setItem(`friluftskompis:joined:${trip.id}`, "1");
    } catch {
      setJoinError("Kunne ikke melde på");
    } finally {
      setJoining(false);
    }
  }

  const route = buildRoute(trip);
  const selectedLocation = {
    id: `route-${trip.routeId}`,
    name: trip.routeName,
    category: "route" as const,
    lat: Number(trip.routeLat),
    lon: Number(trip.routeLon),
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm px-5 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              ⛰️
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">
                {trip.tripTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {trip.routeName}
                {trip.routeDistanceKm ? ` · ${trip.routeDistanceKm} km` : ""}
                {trip.routeVanskelighet !== "Ukjent"
                  ? ` · ${trip.routeVanskelighet}`
                  : ""}
              </p>
            </div>
            <Link
              href="/"
              className="text-xs text-green-700 hover:underline shrink-0 mt-1"
            >
              Friluftskompis
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-700">
            <span className="font-medium">📅 {formatDate(trip.date)}</span>
            {trip.description && (
              <span className="text-gray-500">{trip.description}</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Map */}
          <section className="rounded-xl overflow-hidden border border-gray-200 h-64 bg-gray-100">
            <MapLoader
              routes={[route]}
              selectedLocation={selectedLocation}
              selectedAreaId={null}
              onSelectLocation={() => {}}
            />
          </section>

          {/* Weather */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Vær ved startpunktet
              </p>
            </div>
            <WeatherForecast
              lat={Number(trip.routeLat)}
              lon={Number(trip.routeLon)}
            />
          </section>

          {/* Participants */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Deltakere ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className="text-xs text-gray-400">
                Ingen har meldt seg på enda. Vær den første!
              </p>
            ) : (
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-800 font-medium">
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatJoined(p.joinedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Join form */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            {hasJoined ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-sm font-semibold text-green-800">
                  Du er påmeldt!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Del lenken med andre som vil bli med.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Meld deg på
                </h2>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    required
                    placeholder="Ditt navn"
                    aria-label="Ditt navn"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="submit"
                    disabled={joining}
                    className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {joining ? "Melder på…" : "Meld meg på"}
                  </button>
                </form>
                {joinError && (
                  <p className="text-xs text-red-600 mt-2">{joinError}</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
