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

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(
    null,
  );
  const [selectedArea, setSelectedArea] = useState<DntArea | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState(false);

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
    const base = routes.slice(0, 20);
    const center = selectedArea
      ? { lat: selectedArea.centerLat, lon: selectedArea.centerLon }
      : selectedLocation?.category === "area"
        ? { lat: selectedLocation.lat, lon: selectedLocation.lon }
        : null;
    if (!center) return base;
    return base.filter(
      (r) =>
        Math.abs(r.lat - center.lat) <= 1.5 &&
        Math.abs(r.lon - center.lon) <= 1.5,
    );
  }, [routes, selectedArea, selectedLocation]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <span className="text-2xl">⛰️</span>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
            Friluftskompis
          </h1>
          <p className="text-xs text-gray-500">DNT-hytter i Norge</p>
        </div>
      </header>

      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
        <AreaFilter
          selectedId={selectedArea?.id ?? null}
          onChange={handleAreaChange}
        />
        <SearchBar onSelect={setSelectedLocation} />
      </div>

      <main className="flex-1 flex overflow-hidden">
        <TurforslaggerList
          routes={displayedRoutes}
          loading={routesLoading}
          error={routesError}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
        <div className="flex-1 relative">
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
