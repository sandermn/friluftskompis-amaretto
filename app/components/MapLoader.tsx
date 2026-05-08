"use client";

import dynamic from "next/dynamic";
import SearchBar from "./SearchBar";
import type { SearchResult } from "../api/search/route";

const DntMap = dynamic(() => import("./DntMap"), { ssr: false });

interface MapLoaderProps {
  selectedLocation: SearchResult | null;
  onSelectLocation: (location: SearchResult | null) => void;
}

export default function MapLoader({ selectedLocation, onSelectLocation }: MapLoaderProps) {

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full px-4">
        <SearchBar onSelect={onSelectLocation} />
      </div>
      <DntMap selectedLocation={selectedLocation} />
    </div>
  );
}
