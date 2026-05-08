"use client";

import { useState } from "react";
import MapLoader from "./components/MapLoader";
import TurforslaggerList from "./components/TurforslaggerList";
import type { SearchResult } from "./api/search/route";

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);

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
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
        <div className="flex-1 relative">
          <MapLoader
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      </main>
    </div>
  );
}
