"use client";

import { useState, useEffect, useMemo } from "react";
import MapLoader from "./components/MapLoader";
import TurforslaggerList from "./components/TurforslaggerList";
import SearchBar from "./components/SearchBar";
import AreaFilter from "./components/AreaFilter";
import Link from "next/link";
import type { SearchResult } from "./api/search/route";
import type { DntArea } from "./api/areas/route";

export interface Route {
  id: number;
  name: string;
  beskrivelse: string | null;
  vanskelighet: string;
  gradingRaw: number;
  distanceKm: number | null;
  omrade: string | null;
  lat: number;
  lon: number;
  geojson: { type: string; coordinates: unknown } | null;
  isFallback?: boolean;
}

type Difficulty = "Enkel" | "Middels" | "Krevende";
type Duration = "kort" | "middels" | "lang";

const SEASONS = [
  { key: "vinter", label: "❄️ Vinter" },
  { key: "vår", label: "🌱 Vår" },
  { key: "sommer", label: "☀️ Sommer" },
  { key: "høst", label: "🍂 Høst" },
];

const DURATIONS: {
  key: Duration;
  label: string;
  min?: number;
  max?: number;
}[] = [
  { key: "kort", label: "< 10 km", max: 10 },
  { key: "middels", label: "10–25 km", min: 10, max: 25 },
  { key: "lang", label: "> 25 km", min: 25 },
];

function getCurrentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "vår";
  if (m >= 6 && m <= 8) return "sommer";
  if (m >= 9 && m <= 11) return "høst";
  return "vinter";
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(
    null,
  );
  const [selectedArea, setSelectedArea] = useState<DntArea | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState(false);
  const [routesFallback, setRoutesFallback] = useState(false);

  const [season, setSeason] = useState<string>(getCurrentSeason());
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data.routes ?? []);
        setRoutesFallback(data.fallback === true);
        setRoutesLoading(false);
      })
      .catch(() => {
        setRoutesError(true);
        setRoutesLoading(false);
      });
  }, []);

  function handleAreaChange(area: DntArea | null) {
    setSelectedArea(area);
    if (area) {
      setSelectedLocation({
        id: `area-${area.id}`,
        name: area.name,
        category: "area",
        lat: area.centerLat,
        lon: area.centerLon,
      });
    }
  }

  const displayedRoutes = useMemo(() => {
    let result = routes.filter(
      (r) => r.distanceKm !== null && r.distanceKm > 0,
    );

    // Area / location filter
    const center = selectedArea
      ? { lat: selectedArea.centerLat, lon: selectedArea.centerLon }
      : selectedLocation?.category === "area"
        ? { lat: selectedLocation.lat, lon: selectedLocation.lon }
        : null;
    if (center) {
      result = result.filter(
        (r) =>
          Math.abs(r.lat - center.lat) <= 1.5 &&
          Math.abs(r.lon - center.lon) <= 1.5,
      );
    }

    // Season filter: winter hides demanding routes
    if (season === "vinter") {
      result = result.filter((r) => r.vanskelighet !== "Krevende");
    }

    // Difficulty filter
    if (difficulty) {
      result = result.filter((r) => r.vanskelighet === difficulty);
    }

    // Duration filter
    const dur = DURATIONS.find((d) => d.key === duration);
    if (dur) {
      result = result.filter((r) => {
        if (r.distanceKm === null) return true;
        if (dur.min !== undefined && r.distanceKm < dur.min) return false;
        if (dur.max !== undefined && r.distanceKm > dur.max) return false;
        return true;
      });
    }

    // Season-based popularity sort
    result = [...result].sort((a, b) => {
      if (season === "sommer") {
        // Summer: most challenging / popular routes first
        return (b.gradingRaw ?? 0) - (a.gradingRaw ?? 0);
      }
      if (season === "vinter") {
        // Winter: easiest routes first (safer)
        return (a.gradingRaw ?? 0) - (b.gradingRaw ?? 0);
      }
      // Spring / autumn: shorter routes first (shoulder season)
      return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
    });

    return result.slice(0, 20);
  }, [routes, selectedArea, selectedLocation, season, difficulty, duration]);

  function toggleDifficulty(d: Difficulty) {
    setDifficulty((prev) => (prev === d ? null : d));
  }

  function toggleDuration(d: Duration) {
    setDuration((prev) => (prev === d ? null : d));
  }

  function toggleSeason(s: string) {
    setSeason((prev) => (prev === s ? getCurrentSeason() : s));
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <span className="text-2xl" aria-hidden="true">
          ⛰️
        </span>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
            Friluftskompis
          </h1>
          <p className="text-xs text-gray-500">DNT-hytter i Norge</p>
        </div>
        <Link
          href="/status"
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Systemstatus"
          title="Systemstatus"
        >
          Status
        </Link>
      </header>

      {/* Search + area */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
        <AreaFilter
          selectedId={selectedArea?.id ?? null}
          onChange={handleAreaChange}
        />
        <SearchBar onSelect={setSelectedLocation} />
      </div>

      {/* Trip filters */}
      <div className="shrink-0 bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-x-5 overflow-x-auto">
        <FilterGroup label="Sesong">
          {SEASONS.map(({ key, label }) => (
            <FilterChip
              key={key}
              active={season === key}
              onClick={() => toggleSeason(key)}
              color="green"
            >
              {label}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Vanskelighet">
          {(["Enkel", "Middels", "Krevende"] as Difficulty[]).map((d) => (
            <FilterChip
              key={d}
              active={difficulty === d}
              onClick={() => toggleDifficulty(d)}
              color="blue"
            >
              {d}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Varighet">
          {DURATIONS.map(({ key, label }) => (
            <FilterChip
              key={key}
              active={duration === key}
              onClick={() => toggleDuration(key)}
              color="purple"
            >
              {label}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden md:flex-row">
        {/* Map: top on mobile, right side on desktop */}
        <div className="order-first h-52 shrink-0 relative md:order-last md:h-auto md:flex-1">
          <MapLoader
            routes={displayedRoutes}
            selectedLocation={selectedLocation}
            selectedAreaId={selectedArea?.id ?? null}
            onSelectLocation={setSelectedLocation}
          />
        </div>
        <TurforslaggerList
          routes={displayedRoutes}
          loading={routesLoading}
          error={routesError}
          fallback={routesFallback}
          season={season}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </main>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-600 font-medium shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: "green" | "blue" | "purple";
  children: React.ReactNode;
}) {
  const activeClass =
    color === "green"
      ? "bg-green-700 text-white border-green-800"
      : color === "blue"
        ? "bg-blue-700 text-white border-blue-800"
        : "bg-purple-700 text-white border-purple-800";

  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap focus:ring-2 focus:ring-offset-1 focus:ring-green-600 outline-none ${
        active
          ? activeClass
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
