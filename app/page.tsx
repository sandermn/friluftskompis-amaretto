"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  imageUrl?: string | null;
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
  const [started, setStarted] = useState(false);
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
      setStarted(true);
    }
  }

  function handleSearchSelect(result: SearchResult) {
    setSelectedLocation(result);
    setStarted(true);
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
        return (b.gradingRaw ?? 0) - (a.gradingRaw ?? 0);
      }
      if (season === "vinter") {
        return (a.gradingRaw ?? 0) - (b.gradingRaw ?? 0);
      }
      return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
    });

    return result.slice(0, 20);
  }, [routes, selectedArea, selectedLocation, season, difficulty, duration]);

  // ── Resizable split ──
  const [listPercent, setListPercent] = useState(65);
  const mainRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const isMd = window.matchMedia("(min-width: 768px)").matches;
    if (isMd) {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setListPercent(Math.min(Math.max(pct, 25), 80));
    } else {
      // Mobile: map is at the top, dragging changes its height
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      const mapPct = Math.min(Math.max(pct, 15), 60);
      setListPercent(100 - mapPct);
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  function toggleDifficulty(d: Difficulty) {
    setDifficulty((prev) => (prev === d ? null : d));
  }

  function toggleDuration(d: Duration) {
    setDuration((prev) => (prev === d ? null : d));
  }

  function toggleSeason(s: string) {
    setSeason((prev) => (prev === s ? getCurrentSeason() : s));
  }

  // ── Start screen ──
  if (!started) {
    return (
      <div className="relative flex flex-col h-full bg-[#2e4430] text-white overflow-auto">
        {/* Atmospheric gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c2e1e]/90 via-[#2e4430]/70 to-[#3d5a3e]/50" />

        <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-6 pt-14 pb-10 md:pt-24 md:justify-center">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-16 md:mb-20">
            <span className="text-lg opacity-80" aria-hidden="true">
              ⛰️
            </span>
            <span className="text-sm font-medium tracking-wide text-white/70">
              Friluftskompis
            </span>
            <Link
              href="/status"
              className="ml-auto text-[11px] text-white/30 hover:text-white/60 transition-colors"
              aria-label="Systemstatus"
            >
              Status
            </Link>
          </div>

          {/* Heading */}
          <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] mb-4">
            Finn din neste tur
          </p>
          <h1 className="text-[2.5rem] md:text-5xl font-semibold leading-[1.08] tracking-tight mb-4">
            Hva leter
            <br />
            du etter?
          </h1>
          <p className="text-[15px] text-white/40 leading-relaxed mb-12">
            Turer, hytter og fjelltopper i hele Norge
          </p>

          {/* Search */}
          <div className="mb-4">
            <SearchBar onSelect={handleSearchSelect} />
          </div>

          {/* Area filter */}
          <div className="mb-10">
            <AreaFilter
              selectedId={selectedArea?.id ?? null}
              onChange={handleAreaChange}
            />
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full py-4 rounded-2xl bg-white/95 text-[#2e4430] text-sm font-semibold tracking-wide hover:bg-white transition-all focus:ring-2 focus:ring-white/40 outline-none shadow-lg shadow-black/10"
          >
            Utforsk alle turer
          </button>

          {/* Season pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-10">
            {SEASONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  toggleSeason(key);
                  setStarted(true);
                }}
                className="text-[11px] px-4 py-2 rounded-full font-medium border border-white/15 bg-white/8 text-white/70 hover:bg-white/15 hover:text-white/90 transition-all whitespace-nowrap backdrop-blur-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main app view ──
  return (
    <div className="flex flex-col h-full bg-[#faf9f6]">
      {/* Header */}
      <header className="shrink-0 bg-white/80 backdrop-blur-md border-b border-[#e8e5dd] px-5 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="Tilbake til startsiden"
          >
            <span className="text-base" aria-hidden="true">
              ⛰️
            </span>
            <span className="text-sm font-semibold text-[#2e4430] hidden sm:inline group-hover:opacity-70 transition-opacity">
              Friluftskompis
            </span>
          </button>
          <div className="flex-1 max-w-sm">
            <SearchBar onSelect={handleSearchSelect} />
          </div>
          <AreaFilter
            selectedId={selectedArea?.id ?? null}
            onChange={handleAreaChange}
          />
        </div>
      </header>

      {/* Filters */}
      <div className="shrink-0 bg-white/60 backdrop-blur-sm border-b border-[#e8e5dd]/60 px-5 py-2.5 flex items-center gap-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
          {SEASONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSeason(key)}
              className={`text-[11px] px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap outline-none ${
                season === key
                  ? "bg-[#3d5a3e] text-white shadow-sm"
                  : "bg-[#f3f1ec] text-[#5a5a52] hover:bg-[#e8e5dd]"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-4 bg-[#e8e5dd] shrink-0 mx-1" />
          {(["Enkel", "Middels", "Krevende"] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDifficulty(d)}
              className={`text-[11px] px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap outline-none ${
                difficulty === d
                  ? "bg-[#3d5a3e] text-white shadow-sm"
                  : "bg-[#f3f1ec] text-[#5a5a52] hover:bg-[#e8e5dd]"
              }`}
            >
              {d}
            </button>
          ))}
          <span className="w-px h-4 bg-[#e8e5dd] shrink-0 mx-1" />
          {DURATIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleDuration(key)}
              className={`text-[11px] px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap outline-none ${
                duration === key
                  ? "bg-[#3d5a3e] text-white shadow-sm"
                  : "bg-[#f3f1ec] text-[#5a5a52] hover:bg-[#e8e5dd]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content: resizable split */}
      <main
        ref={mainRef}
        className="flex-1 flex flex-col overflow-hidden md:flex-row select-none"
      >
        {/* Map (top on mobile, right on desktop) */}
        <div
          className="order-first relative md:order-last md:p-3 min-h-0 min-w-0"
          style={{ flex: `0 0 ${100 - listPercent}%` }}
        >
          <div className="h-full w-full md:rounded-2xl md:overflow-hidden md:shadow-sm md:border md:border-[#e8e5dd]">
            <MapLoader
              routes={displayedRoutes}
              selectedLocation={selectedLocation}
              selectedAreaId={selectedArea?.id ?? null}
              onSelectLocation={setSelectedLocation}
            />
          </div>
        </div>

        {/* Drag handle */}
        <div
          className="order-2 shrink-0 flex items-center justify-center md:order-2 md:w-3 md:cursor-col-resize cursor-row-resize z-10 group"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          role="separator"
          aria-orientation="vertical"
          aria-label="Dra for å endre størrelse"
          style={{ touchAction: "none" }}
        >
          {/* Mobile: horizontal bar */}
          <div className="md:hidden w-10 h-1 rounded-full bg-[#d4d1c9] group-hover:bg-[#b0ada5] transition-colors my-1.5" />
          {/* Desktop: vertical bar */}
          <div className="hidden md:block h-10 w-1 rounded-full bg-[#d4d1c9] group-hover:bg-[#b0ada5] transition-colors" />
        </div>

        {/* Trip list */}
        <div
          className="order-3 min-h-0 min-w-0 overflow-hidden md:order-1"
          style={{ flex: `0 0 ${listPercent}%` }}
        >
          <TurforslaggerList
            routes={displayedRoutes}
            loading={routesLoading}
            error={routesError}
            fallback={routesFallback}
            season={season}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      </main>
    </div>
  );
}
