"use client";

import dynamic from "next/dynamic";
import type { SearchResult } from "../api/search/route";
import type { Route } from "../page";

const DntMap = dynamic(() => import("./DntMap"), { ssr: false });

interface MapLoaderProps {
  routes: Route[];
  selectedLocation: SearchResult | null;
  selectedAreaId: number | null;
  onSelectLocation: (location: SearchResult | null) => void;
}

export default function MapLoader({
  routes,
  selectedLocation,
  selectedAreaId,
  onSelectLocation,
}: MapLoaderProps) {
  return (
    <div className="relative w-full h-full">
      <DntMap
        routes={routes}
        selectedLocation={selectedLocation}
        selectedAreaId={selectedAreaId}
        onSelectLocation={onSelectLocation}
      />
    </div>
  );
}
