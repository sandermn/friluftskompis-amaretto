"use client";

import { useState, useEffect } from "react";
import MapLoader from "./components/MapLoader";
import TurforslaggerList from "./components/TurforslaggerList";
import type { SearchResult } from "./api/search/route";

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

  const displayedRoutes = routes.slice(0, 20);

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
            onSelectLocation={setSelectedLocation}
          />
        </div>
      </main>
    </div>
  );
}
