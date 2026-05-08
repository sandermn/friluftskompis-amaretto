"use client";

import { useState, useEffect, useMemo } from "react";
import MapLoader from "./components/MapLoader";
import TurforslaggerList from "./components/TurforslaggerList";
import SearchBar from "./components/SearchBar";
import AreaFilter from "./components/AreaFilter";
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

  const [season, setSeason] = useState<string>(getCurrentSeason());
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data.routes ?? []);
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
    <div className="group/app flex flex-col h-full">
      {/* Hidden radio inputs drive all tab switching — no JS state needed */}
      <input
        type="radio"
        id="view-list"
        name="view"
        defaultChecked
        className="sr-only"
      />
      <input type="radio" id="view-map" name="view" className="sr-only" />

      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <span className="text-2xl" aria-hidden="true">
          ⛰️
        </span>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
            Friluftskompis
          </h1>
          <p className="text-xs text-gray-500">DNT-hytter i Norge</p>
        </div>

        {/* View tab switcher in header */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <label
            htmlFor="view-list"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors text-gray-500 hover:text-gray-700 group-has-[#view-list:checked]/app:bg-white group-has-[#view-list:checked]/app:text-green-700 group-has-[#view-list:checked]/app:shadow-sm"
          >
            <TabIcon />
            Turer
          </label>
          <label
            htmlFor="view-map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors text-gray-500 hover:text-gray-700 group-has-[#view-map:checked]/app:bg-white group-has-[#view-map:checked]/app:text-green-700 group-has-[#view-map:checked]/app:shadow-sm"
          >
            <MapTabIcon />
            Kart
          </label>
        </div>
      </header>

      {/* Search + area */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
        <AreaFilter
          selectedId={selectedArea?.id ?? null}
          onChange={handleAreaChange}
        />
        <SearchBar onSelect={setSelectedLocation} />
      </div>

      {/* Trip filters – horizontally scrollable on mobile */}
      <div className="shrink-0 bg-gray-50 border-b border-gray-100 overflow-x-auto">
        <div className="flex items-center gap-x-5 gap-y-1.5 px-4 py-2 min-w-max">
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
      </div>

      <main className="flex-1 overflow-hidden">
        {/* List panel: visible by default, hidden when map tab is active */}
        <div className="h-full group-has-[#view-map:checked]/app:hidden">
          <TurforslaggerList
            routes={displayedRoutes}
            loading={routesLoading}
            error={routesError}
            season={season}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>

        {/* Map panel: hidden by default, shown when map tab is active */}
        <div className="h-full relative hidden group-has-[#view-map:checked]/app:block">
          <MapLoader
            routes={displayedRoutes}
            selectedLocation={selectedLocation}
            selectedAreaId={selectedArea?.id ?? null}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      </main>
    </div>
  );
}

function TabIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MapTabIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
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
