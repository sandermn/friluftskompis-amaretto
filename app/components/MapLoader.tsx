"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "./SearchBar";
import AreaFilter from "./AreaFilter";
import type { SearchResult } from "../api/search/route";
import type { DntArea } from "../api/areas/route";

const DntMap = dynamic(() => import("./DntMap"), { ssr: false });

interface MapLoaderProps {
  selectedLocation: SearchResult | null;
  onSelectLocation: (location: SearchResult | null) => void;
}

export default function MapLoader({ selectedLocation, onSelectLocation }: MapLoaderProps) {
  const [selectedArea, setSelectedArea] = useState<DntArea | null>(null);

  function handleAreaChange(area: DntArea | null) {
    setSelectedArea(area);
    if (area) {
      onSelectLocation({
        id: `area-${area.id}`,
        name: area.name,
        category: "area",
        lat: area.centerLat,
        lon: area.centerLon,
      });
    }
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-4 right-4 z-[1000] flex items-start gap-2">
        <AreaFilter
          selectedId={selectedArea?.id ?? null}
          onChange={handleAreaChange}
        />
        <div className="flex-1">
          <SearchBar onSelect={onSelectLocation} />
        </div>
      </div>
      <DntMap selectedLocation={selectedLocation} selectedAreaId={selectedArea?.id ?? null} />
    </div>
  );
}
