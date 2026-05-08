"use client";

import { useEffect, useRef, useState } from "react";
import WeatherForecast from "./WeatherForecast";
import ElevationProfile from "./ElevationProfile";
import TripCreateModal from "./TripCreateModal";
import TripSharePanel from "./TripSharePanel";
import { KildeBadge } from "./AiBadge";
import type { SearchResult } from "../api/search/route";
import type { Route } from "../page";

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
  fallback?: boolean;
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
  fallback = false,
  season,
  onSelectLocation,
  selectedLocation,
}: TurforslaggerListProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profileOpenForId, setProfileOpenForId] = useState<number | null>(null);
  const [planningRoute, setPlanningRoute] = useState<Route | null>(null);
  const [sharedTripId, setSharedTripId] = useState<string | null>(null);
  const lastScrolledLocationIdRef = useRef<string | null>(null);

  function handleTripClick(tur: Route, isSelected: boolean) {
    const nextSelectedId = isSelected ? null : tur.id;
    setSelectedId(nextSelectedId);
    setProfileOpenForId(null);

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
    <>
      {planningRoute && !sharedTripId && (
        <TripCreateModal
          route={planningRoute}
          onClose={() => setPlanningRoute(null)}
          onCreated={(tripId) => {
            setPlanningRoute(null);
            setSharedTripId(tripId);
          }}
        />
      )}
      {sharedTripId && (
        <TripSharePanel
          tripId={sharedTripId}
          onClose={() => setSharedTripId(null)}
        />
      )}
      <aside className="w-full flex-1 min-h-0 overflow-y-auto bg-white border-t border-gray-100 md:border-t-0 md:border-r md:w-80 md:shrink-0 md:flex-none flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {SEASON_LABEL[season]} · {routes.length} turer
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Sortert etter popularitet · {SEASON_SORT_LABEL[season]}
          </p>
        </div>

        {fallback && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <svg
              className="w-3.5 h-3.5 text-amber-600 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-amber-800">
              DNT API er utilgjengelig — viser eksempel-turer
            </p>
          </div>
        )}

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
                    {tur.beskrivelse && !tur.isFallback && (
                      <div className="mb-1.5">
                        <KildeBadge label="DNT" />
                      </div>
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

                  {/* Elevation profile + invite buttons — siblings, never nested */}
                  {isSelected && (
                    <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-2">
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
                      <button
                        onClick={() => setPlanningRoute(tur)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-600 text-blue-700 bg-white hover:bg-blue-700 hover:text-white transition-colors"
                        aria-label="Inviter deltakere"
                      >
                        <InviteIcon />
                        Inviter
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
                    <>
                      <WeatherForecast
                        key={`weather-${tur.lat},${tur.lon}`}
                        lat={tur.lat}
                        lon={tur.lon}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </>
  );
}

function InviteIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
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
