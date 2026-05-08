"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WeatherForecast from "./WeatherForecast";
import ElevationProfile from "./ElevationProfile";
import type { SearchResult } from "../api/search/route";
import type { Route } from "../page";

const SAVED_KEY = "friluftskompis-saved-trips";

const VANSKELIGHET_COLOR: Record<string, string> = {
  Enkel: "bg-green-100 text-green-900",
  Middels: "bg-yellow-100 text-yellow-900",
  Krevende: "bg-red-100 text-red-900",
  Ukjent: "bg-gray-100 text-gray-700",
};

const SEASON_LABEL: Record<string, string> = {
  vår: "🌱 Vår",
  sommer: "☀️ Sommer",
  høst: "🍂 Høst",
  vinter: "❄️ Vinter",
};

const SEASON_SORT_LABEL: Record<string, string> = {
  sommer: "mest krevende først",
  vinter: "enklest først",
  vår: "kortest først",
  høst: "kortest først",
};

interface TurforslaggerListProps {
  routes: Route[];
  loading: boolean;
  error: boolean;
  season: string;
  onSelectLocation: (location: SearchResult | null) => void;
  selectedLocation: SearchResult | null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isCoordinateMatch(route: Route, location: SearchResult): boolean {
  const tolerance = 0.001;
  return (
    Math.abs(route.lat - location.lat) <= tolerance &&
    Math.abs(route.lon - location.lon) <= tolerance
  );
}

export default function TurforslaggerList({
  routes,
  loading,
  error,
  season,
  onSelectLocation,
  selectedLocation,
}: TurforslaggerListProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profileOpenForId, setProfileOpenForId] = useState<number | null>(null);
  const lastScrolledLocationIdRef = useRef<string | null>(null);

  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  const [savingId, setSavingId] = useState<number | null>(null);

  const swReady = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return "serviceWorker" in navigator;
  }, []);

  async function handleSaveOffline(
    e: React.MouseEvent,
    tur: Route,
  ): Promise<void> {
    e.stopPropagation();
    if (savingId !== null) return;

    setSavingId(tur.id);
    const weatherUrl = `/api/weather?lat=${tur.lat.toFixed(4)}&lon=${tur.lon.toFixed(4)}`;

    try {
      const reg = await navigator.serviceWorker.ready;
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (ev) => {
          if (ev.data?.type === "TRIP_CACHED" && ev.data.routeId === tur.id) {
            resolve();
          }
        };
        reg.active?.postMessage(
          { type: "CACHE_TRIP", routeId: tur.id, weatherUrl },
          [channel.port2],
        );
        setTimeout(reject, 10_000);
      });
    } catch {
      // Fallback: cache via Cache API directly if SW message fails
      if ("caches" in window) {
        const cache = await caches.open("friluftskompis-trips-v1");
        await Promise.all([cache.add("/api/routes"), cache.add(weatherUrl)]);
      }
    }

    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(tur.id);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage might be unavailable
      }
      return next;
    });
    setSavingId(null);
  }

  function handleTripClick(tur: Route, isSelected: boolean) {
    const nextSelectedId = isSelected ? null : tur.id;
    setSelectedId(nextSelectedId);
    setProfileOpenForId(null); // hide profile when switching trips

    if (nextSelectedId === null) {
      onSelectLocation(null);
      return;
    }

    onSelectLocation({
      id: `route-${tur.id}`,
      name: tur.name,
      category: "route",
      subtitle: tur.omrade ?? undefined,
      lat: tur.lat,
      lon: tur.lon,
    });
  }

  const matchedRoute = selectedLocation
    ? routes.find((route) => {
        if (selectedLocation.id === `route-${route.id}`) return true;
        if (selectedLocation.id === `dnt-g-${route.id}`) return true;
        if (isCoordinateMatch(route, selectedLocation)) return true;
        return normalize(route.name) === normalize(selectedLocation.name);
      })
    : undefined;
  const effectiveSelectedId = matchedRoute?.id ?? selectedId;
  // Profile is shown only when explicitly opened for the currently selected route
  const showProfile =
    profileOpenForId === effectiveSelectedId && effectiveSelectedId !== null;

  useEffect(() => {
    if (!selectedLocation || !matchedRoute) return;
    if (selectedLocation.id === lastScrolledLocationIdRef.current) return;

    const item = document.getElementById(`trip-${matchedRoute.id}`);
    item?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    lastScrolledLocationIdRef.current = selectedLocation.id;
  }, [selectedLocation, matchedRoute]);

  useEffect(() => {
    if (!selectedLocation) {
      lastScrolledLocationIdRef.current = null;
    }
  }, [selectedLocation]);

  return (
    <aside className="w-full h-full overflow-y-auto bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {SEASON_LABEL[season]} · {routes.length} turer
        </p>
        <p className="text-[11px] text-gray-600 mt-0.5">
          Sortert etter popularitet · {SEASON_SORT_LABEL[season]}
        </p>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-600 animate-pulse">
          Henter turer fra DNT…
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-xs text-red-400 px-4 text-center">
          Kunne ikke laste turer fra DNT
        </div>
      )}

      {!loading && !error && (
        <ul className="flex-1 divide-y divide-gray-50">
          {routes.map((tur) => {
            const isSelected = effectiveSelectedId === tur.id;
            return (
              <li key={tur.id} id={`trip-${tur.id}`}>
                {/* Main trip card button */}
                <button
                  className={`w-full text-left px-4 py-4 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 outline-none ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => handleTripClick(tur, isSelected)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900 leading-snug">
                      {tur.name}
                    </p>
                    {tur.distanceKm !== null && (
                      <span className="text-xs text-gray-600 shrink-0">
                        {tur.distanceKm} km
                      </span>
                    )}
                  </div>
                  {tur.omrade && (
                    <p className="text-xs text-gray-500 mb-1">{tur.omrade}</p>
                  )}
                  {tur.beskrivelse && (
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed line-clamp-2">
                      {tur.beskrivelse}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {tur.vanskelighet !== "Ukjent" && (
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${VANSKELIGHET_COLOR[tur.vanskelighet]}`}
                      >
                        {tur.vanskelighet}
                      </span>
                    )}
                    <span className="text-xs text-blue-700 ml-auto">
                      {isSelected ? "Lukk ↑" : "Mer ↓"}
                    </span>
                  </div>
                </button>

                {/* Offline download — sibling button, never nested */}
                {isSelected && swReady && (
                  <button
                    onClick={(e) => handleSaveOffline(e, tur)}
                    disabled={savingId === tur.id}
                    className={`w-full flex items-center gap-1.5 px-4 py-1.5 text-xs border-t border-gray-100 transition-colors ${
                      savedIds.has(tur.id)
                        ? "bg-green-50 text-green-700"
                        : "text-gray-400 hover:text-green-700 hover:bg-green-50"
                    }`}
                    aria-label={
                      savedIds.has(tur.id)
                        ? "Tur lagret for offline bruk"
                        : "Last ned for offline bruk"
                    }
                  >
                    {savingId === tur.id ? (
                      <DownloadSpinner />
                    ) : savedIds.has(tur.id) ? (
                      <CheckIcon />
                    ) : (
                      <DownloadIcon />
                    )}
                    {savingId === tur.id
                      ? "Lagrer…"
                      : savedIds.has(tur.id)
                        ? "Lagret for offline"
                        : "Last ned for offline"}
                  </button>
                )}

                {/* Elevation profile toggle — sibling button, never nested */}
                {isSelected && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-white">
                    <button
                      onClick={() =>
                        setProfileOpenForId((prev) =>
                          prev === tur.id ? null : tur.id,
                        )
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        showProfile
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-white text-green-700 border-green-600 hover:bg-green-700 hover:text-white"
                      }`}
                      aria-label={
                        showProfile ? "Skjul høydeprofil" : "Vis høydeprofil"
                      }
                    >
                      <ProfileIcon />
                      {showProfile ? "Skjul høydeprofil" : "Høydeprofil"}
                    </button>
                  </div>
                )}

                {isSelected && showProfile && (
                  <ElevationProfile
                    route={tur}
                    onStageClick={(lat, lon) =>
                      onSelectLocation({
                        id: `route-${tur.id}`,
                        name: tur.name,
                        category: "route",
                        subtitle: tur.omrade ?? undefined,
                        lat,
                        lon,
                      })
                    }
                  />
                )}

                {isSelected && (
                  <WeatherForecast
                    key={`${tur.lat},${tur.lon}`}
                    lat={tur.lat}
                    lon={tur.lon}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadSpinner() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
