"use client";

import { useEffect, useRef, useState } from "react";
import WeatherForecast from "./WeatherForecast";
import ElevationProfile from "./ElevationProfile";
import TripCreateModal from "./TripCreateModal";
import TripSharePanel from "./TripSharePanel";
import { KildeBadge } from "./AiBadge";
import CabinCompare from "./CabinCompare";
import RouteAssessment from "./RouteAssessment";
import type { SearchResult } from "../api/search/route";
import type { Route } from "../page";

const VANSKELIGHET_COLOR: Record<string, string> = {
  Enkel: "bg-[#e8f0e4] text-[#3d5a3e]",
  Middels: "bg-[#f5eedd] text-[#7a6830]",
  Krevende: "bg-[#f5e0dc] text-[#8a3a30]",
  Ukjent: "bg-[#f3f1ec] text-[#7a7a72]",
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
      <aside className="w-full h-full min-h-0 overflow-y-auto bg-[#faf9f6] flex flex-col">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] text-[#8a8a80] font-medium uppercase tracking-[0.1em]">
            {SEASON_LABEL[season]} · {routes.length} turer
          </p>
          <p className="text-[11px] text-[#a0a098] mt-0.5">
            Sortert etter popularitet · {SEASON_SORT_LABEL[season]}
          </p>
        </div>

        {!loading && !error && (
          <CabinCompare season={season} selectedLocation={selectedLocation} />
        )}

        {fallback && (
          <div className="mx-5 mb-3 flex items-center gap-2 px-4 py-2.5 bg-[#f5eedd] rounded-xl">
            <svg
              className="w-3.5 h-3.5 text-[#7a6830] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-[11px] text-[#7a6830]">
              DNT API er utilgjengelig — viser eksempel-turer
            </p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center text-xs text-[#8a8a80] animate-pulse">
            Henter turer fra DNT…
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center text-xs text-[#8a3a30] px-4 text-center">
            Kunne ikke laste turer fra DNT
          </div>
        )}

        {!loading && !error && (
          <ul className="flex-1 px-4 pb-4 space-y-3">
            {routes.map((tur) => {
              const isSelected = effectiveSelectedId === tur.id;
              return (
                <li
                  key={tur.id}
                  id={`trip-${tur.id}`}
                  className={`rounded-2xl bg-white border transition-all ${
                    isSelected
                      ? "border-[#3d5a3e]/20 shadow-md"
                      : "border-[#e8e5dd] shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Main trip card button */}
                  <button
                    className="w-full text-left px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#3d5a3e]/40 focus-visible:ring-offset-2 rounded-2xl"
                    onClick={() => handleTripClick(tur, isSelected)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="font-semibold text-[15px] text-[#2c2c2c] leading-snug">
                        {tur.name}
                      </p>
                      {tur.distanceKm !== null && (
                        <span className="text-xs text-[#8a8a80] shrink-0 mt-0.5">
                          {tur.distanceKm} km
                        </span>
                      )}
                    </div>
                    {tur.omrade && (
                      <p className="text-xs text-[#8a8a80] mb-1.5">
                        {tur.omrade}
                      </p>
                    )}
                    {tur.beskrivelse && (
                      <p className="text-[13px] text-[#5a5a52] mb-2.5 leading-relaxed line-clamp-2">
                        {tur.beskrivelse}
                      </p>
                    )}
                    {tur.beskrivelse && !tur.isFallback && (
                      <div className="mb-2">
                        <KildeBadge label="DNT" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {tur.vanskelighet !== "Ukjent" && (
                        <span
                          className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-medium ${VANSKELIGHET_COLOR[tur.vanskelighet]}`}
                        >
                          {tur.vanskelighet}
                        </span>
                      )}
                      <span className="text-[11px] text-[#3d5a3e] font-medium ml-auto">
                        {isSelected ? "Lukk" : "Se mer"}
                      </span>
                    </div>
                  </button>

                  {/* Trip image */}
                  {isSelected && tur.imageUrl && (
                    <div className="w-full h-40 overflow-hidden border-t border-[#f3f1ec]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tur.imageUrl}
                        alt={`Bilde fra ${tur.name}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Action buttons — siblings, never nested */}
                  {isSelected && (
                    <div className="px-5 py-3 border-t border-[#f3f1ec] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setProfileOpenForId((prev) =>
                            prev === tur.id ? null : tur.id,
                          )
                        }
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all ${
                          showProfile
                            ? "bg-[#3d5a3e] text-white shadow-sm"
                            : "bg-[#f3f1ec] text-[#3d5a3e] hover:bg-[#e8e5dd]"
                        }`}
                        aria-label={
                          showProfile ? "Skjul høydeprofil" : "Vis høydeprofil"
                        }
                      >
                        <ProfileIcon />
                        {showProfile ? "Skjul" : "Høydeprofil"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanningRoute(tur)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-medium bg-[#f3f1ec] text-[#3d5a3e] hover:bg-[#e8e5dd] transition-all"
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
                    <WeatherForecast
                      key={`weather-${tur.lat},${tur.lon}`}
                      lat={tur.lat}
                      lon={tur.lon}
                    />
                  )}

                  {isSelected && (
                    <RouteAssessment route={tur} season={season} />
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
