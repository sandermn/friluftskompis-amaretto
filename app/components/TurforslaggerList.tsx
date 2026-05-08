"use client";

import { useEffect, useRef, useState } from "react";
import WeatherForecast from "./WeatherForecast";
import type { SearchResult } from "../api/search/route";

interface Route {
  id: number;
  name: string;
  beskrivelse: string | null;
  vanskelighet: string;
  gradingRaw: number;
  distanceKm: number | null;
  omrade: string | null;
  lat: number;
  lon: number;
}

function getSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "vår";
  if (month >= 6 && month <= 8) return "sommer";
  if (month >= 9 && month <= 11) return "høst";
  return "vinter";
}

/** Show all routes regardless of season (all difficulty levels available) */
function filterBySeason(routes: Route[]): Route[] {
  return routes;
}

const VANSKELIGHET_COLOR: Record<string, string> = {
  Enkel: "bg-green-100 text-green-800",
  Middels: "bg-yellow-100 text-yellow-800",
  Krevende: "bg-red-100 text-red-800",
  Ukjent: "bg-gray-100 text-gray-600",
};

const SEASON_LABEL: Record<string, string> = {
  vår: "🌱 Vår",
  sommer: "☀️ Sommer",
  høst: "🍂 Høst",
  vinter: "❄️ Vinter",
};

interface TurforslaggerListProps {
  onSelectLocation: (location: SearchResult | null) => void;
  selectedLocation: SearchResult | null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isCoordinateMatch(route: Route, location: SearchResult): boolean {
  const tolerance = 0.001;
  return (
    Math.abs(route.lat - location.lat) <= tolerance
    && Math.abs(route.lon - location.lon) <= tolerance
  );
}

export default function TurforslaggerList({ onSelectLocation, selectedLocation }: TurforslaggerListProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const lastScrolledLocationIdRef = useRef<string | null>(null);

  const season = getSeason();

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data.routes ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  function handleTripClick(tur: Route, isSelected: boolean) {
    const nextSelectedId = isSelected ? null : tur.id;
    setSelectedId(nextSelectedId);

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

  const anbefalte = filterBySeason(routes).slice(0, 20);
  const matchedRoute = selectedLocation
    ? anbefalte.find((route) => {
      if (isCoordinateMatch(route, selectedLocation)) return true;
      return normalize(route.name) === normalize(selectedLocation.name);
    })
    : undefined;
  const effectiveSelectedId = matchedRoute?.id ?? selectedId;

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
    <aside className="w-80 shrink-0 h-full overflow-y-auto bg-white border-r border-gray-100 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          Anbefalte turer · {SEASON_LABEL[season]}
        </p>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 animate-pulse">
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
          {anbefalte.map((tur) => {
            const isSelected = effectiveSelectedId === tur.id;
            return (
              <li key={tur.id} id={`trip-${tur.id}`}>
                <button
                  className={`w-full text-left px-4 py-4 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => handleTripClick(tur, isSelected)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900 leading-snug">
                      {tur.name}
                    </p>
                    {tur.distanceKm !== null && (
                      <span className="text-xs text-gray-400 shrink-0">
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
                    <span className="text-xs text-blue-500 ml-auto">
                      {isSelected ? "Skjul vær ↑" : "Vis vær ↓"}
                    </span>
                  </div>
                </button>
                {isSelected && <WeatherForecast key={`${tur.lat},${tur.lon}`} lat={tur.lat} lon={tur.lon} />}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

