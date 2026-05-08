"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import WeatherForecast from "../../components/WeatherForecast";
import TripTimeline from "../../components/TripTimeline";
import ExpenseTracker from "../../components/ExpenseTracker";
import type { PackingListResponse } from "../../api/packing-list/route";
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

interface Expense {
  id: number;
  paidBy: string;
  description: string;
  amountOre: number;
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
  startTime: string | null;
  description: string;
  packingList: PackingListResponse | null;
}

interface Props {
  trip: TripData;
  initialParticipants: Participant[];
  initialExpenses: Expense[];
}

const OFFLINE_KEY = (id: string) => `friluftskompis:offline:${id}`;

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

export default function InvitePageClient({
  trip,
  initialParticipants,
  initialExpenses,
}: Props) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Detect online/offline
  useEffect(() => {
    const sync = () => setIsOffline(!navigator.onLine);
    sync();
    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  // Cache trip data for offline use (F8)
  useEffect(() => {
    try {
      localStorage.setItem(
        OFFLINE_KEY(trip.id),
        JSON.stringify({ trip, participants }),
      );
    } catch {
      // storage full — ignore
    }
  }, [trip, participants]);

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
      if (document.hidden || isOffline) return;
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
  }, [trip.id, isOffline]);

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
      {/* Offline banner (F8) */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 px-4 shrink-0">
          Du er offline — viser lagret turinfo
        </div>
      )}

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
            {trip.startTime && (
              <span className="text-gray-500">🕘 {trip.startTime}</span>
            )}
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

          {/* Timeline (F7) */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <TripTimeline
              startTime={trip.startTime}
              distanceKm={trip.routeDistanceKm}
              vanskelighet={trip.routeVanskelighet}
              date={trip.date}
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

          {/* Packing list */}
          {trip.packingList && (
            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  🎒 Pakkeliste
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {trip.packingList.categories.map((cat) => (
                  <StoredPackingCategory key={cat.category} category={cat} />
                ))}
                {trip.packingList.tips.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      💡 Tips
                    </p>
                    <ul className="space-y-1">
                      {trip.packingList.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-gray-600">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

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

          {/* Expense tracker (F9) */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <ExpenseTracker
              tripId={trip.id}
              participantNames={participants.map((p) => p.name)}
              initialExpenses={initialExpenses}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function StoredPackingCategory({
  category,
}: {
  category: PackingListResponse["categories"][number];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {category.emoji} {category.category}
      </p>
      <ul className="space-y-1">
        {category.items.map((item) => (
          <li key={item}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked.has(item)}
                onChange={() => toggle(item)}
                className="mt-0.5 accent-green-600 shrink-0"
                aria-label={item}
              />
              <span
                className={`text-xs ${checked.has(item) ? "line-through text-gray-400" : "text-gray-700"}`}
              >
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
