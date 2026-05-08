"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "./SearchBar";
import type { SearchResult } from "../api/search/route";

const DntMap = dynamic(() => import("./DntMap"), { ssr: false });

export default function MapLoader() {
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full px-4">
        <SearchBar onSelect={setSelectedLocation} />
      </div>
      <DntMap selectedLocation={selectedLocation} />
    </div>
  );
}
