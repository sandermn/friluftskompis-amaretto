"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchResult } from "../api/search/route";
import type { Route } from "../page";

type ServiceLevel =
  | "STAFFED"
  | "SELF_SERVICE"
  | "NO_SERVICE"
  | "NO_SERVICE_NO_BEDS"
  | "RENTAL"
  | string;

interface Cabin {
  id: number;
  name: string;
  serviceLevel: ServiceLevel;
  geojson: { type: string; coordinates: [number, number, number] };
  bedsStaffed: number;
  bedsSelfService: number;
  bedsNoService: number;
  bedsWinter: number;
  elevationCustom: number | null;
  areaIds: number[];
}

const SERVICE_COLORS: Record<string, string> = {
  STAFFED: "#16a34a",
  SELF_SERVICE: "#2563eb",
  NO_SERVICE: "#dc2626",
  NO_SERVICE_NO_BEDS: "#9ca3af",
  RENTAL: "#d97706",
};

const SERVICE_LABELS: Record<string, string> = {
  STAFFED: "Betjent",
  SELF_SERVICE: "Selvbetjent",
  NO_SERVICE: "Ubetjent",
  NO_SERVICE_NO_BEDS: "Dagshytte",
  RENTAL: "Utleie",
};

function totalBeds(cabin: Cabin) {
  return (
    cabin.bedsStaffed +
    cabin.bedsSelfService +
    cabin.bedsNoService +
    cabin.bedsWinter
  );
}

function routeToPositions(geojson: {
  type: string;
  coordinates: unknown;
}): [number, number][][] {
  if (geojson.type === "LineString") {
    const coords = geojson.coordinates as [number, number][];
    return [coords.map(([lon, lat]) => [lat, lon])];
  }
  if (geojson.type === "MultiLineString") {
    const lines = geojson.coordinates as [number, number][][];
    return lines.map((line) => line.map(([lon, lat]) => [lat, lon]));
  }
  return [];
}

function FlyToController({ target }: { target: SearchResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const zoom =
      target.category === "cabin"
        ? 14
        : target.category === "peak"
          ? 13
          : target.category === "route"
            ? 12
            : 10;
    map.flyTo([target.lat, target.lon], zoom, { duration: 1.2 });
  }, [target, map]);
  return null;
}

function SelectedLocationMarker({ target }: { target: SearchResult | null }) {
  if (!target || target.category === "route") return null;

  const styleByCategory: Record<
    SearchResult["category"],
    { color: string; label: string }
  > = {
    area: { color: "#0ea5e9", label: "Område" },
    cabin: { color: "#16a34a", label: "Hytte" },
    peak: { color: "#ea580c", label: "Fjelltopp" },
    route: { color: "#7c3aed", label: "Tur" },
  };
  const style = styleByCategory[target.category];

  return (
    <CircleMarker
      center={[target.lat, target.lon]}
      radius={10}
      pathOptions={{
        fillColor: style.color,
        color: "#ffffff",
        weight: 3,
        fillOpacity: 0.9,
      }}
    >
      <Popup>
        <div className="min-w-[160px]">
          <p className="text-sm font-semibold text-gray-900">{target.name}</p>
          <p className="text-xs text-gray-600">{style.label}</p>
          {target.subtitle && (
            <p className="text-xs text-gray-500 mt-1">{target.subtitle}</p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

interface DntMapProps {
  routes: Route[];
  selectedLocation: SearchResult | null;
  selectedAreaId: number | null;
  onSelectLocation: (location: SearchResult | null) => void;
}

export default function DntMap({
  routes,
  selectedLocation,
  selectedAreaId,
  onSelectLocation,
}: DntMapProps) {
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cabins")
      .then((r) => r.json())
      .then((data) => {
        const nodes: Cabin[] = (data?.data?.cabins?.edges ?? []).map(
          (e: { node: Cabin }) => e.node,
        );
        setCabins(nodes.filter((c) => c.geojson?.type === "Point"));
        setLoading(false);
      })
      .catch(() => {
        setError("Kunne ikke laste hytter");
        setLoading(false);
      });
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[63.5, 13]}
        zoom={5}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"
          attribution='&copy; <a href="https://www.kartverket.no">Kartverket</a>'
          maxZoom={18}
        />
        <FlyToController target={selectedLocation} />
        <SelectedLocationMarker target={selectedLocation} />

        {routes.map((route) => {
          if (!route.geojson) return null;
          const isSelected = selectedLocation?.id === `route-${route.id}`;
          const segments = routeToPositions(route.geojson);
          return segments.map((positions, i) => (
            <Polyline
              key={`${route.id}-${i}`}
              positions={positions}
              pathOptions={{
                color: isSelected ? "#7c3aed" : "#a78bfa",
                weight: isSelected ? 5 : 2,
                opacity: isSelected ? 1 : 0.55,
              }}
              eventHandlers={{
                click: () =>
                  onSelectLocation({
                    id: `route-${route.id}`,
                    name: route.name,
                    category: "route",
                    subtitle: route.omrade ?? undefined,
                    lat: route.lat,
                    lon: route.lon,
                  }),
              }}
            >
              <Popup>
                <div className="min-w-[180px] font-sans">
                  <p className="font-semibold text-sm text-gray-900 mb-1 leading-snug">
                    {route.name}
                  </p>
                  {route.omrade && (
                    <p className="text-xs text-gray-500 mb-1">{route.omrade}</p>
                  )}
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {route.distanceKm && (
                      <p>
                        <span className="font-medium">Lengde:</span>{" "}
                        {route.distanceKm} km
                      </p>
                    )}
                    {route.vanskelighet !== "Ukjent" && (
                      <p>
                        <span className="font-medium">Vanskelighet:</span>{" "}
                        {route.vanskelighet}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          ));
        })}

        {cabins
          .filter((c) => !selectedAreaId || c.areaIds?.includes(selectedAreaId))
          .map((cabin) => {
            const [lon, lat] = cabin.geojson.coordinates;
            const elevation =
              cabin.elevationCustom ?? cabin.geojson.coordinates[2];
            const color =
              SERVICE_COLORS[cabin.serviceLevel] ?? SERVICE_COLORS.NO_SERVICE;
            const beds = totalBeds(cabin);

            return (
              <CircleMarker
                key={cabin.id}
                center={[lat, lon]}
                radius={6}
                pathOptions={{
                  fillColor: color,
                  color: "#fff",
                  weight: 1.5,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="min-w-[180px] font-sans">
                    <p className="font-semibold text-sm text-gray-900 mb-1 leading-snug">
                      {cabin.name}
                    </p>
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full text-white font-medium mb-2"
                      style={{ backgroundColor: color }}
                    >
                      {SERVICE_LABELS[cabin.serviceLevel] ?? cabin.serviceLevel}
                    </span>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {beds > 0 && (
                        <p>
                          <span className="font-medium">Senger:</span> {beds}
                        </p>
                      )}
                      {elevation > 0 && (
                        <p>
                          <span className="font-medium">Høyde:</span>{" "}
                          {Math.round(elevation)} moh
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-[1000] bg-white rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">
          Hyttetype
        </p>
        {selectedAreaId && (
          <p className="text-[10px] text-green-700 font-medium mb-2">
            {cabins.filter((c) => c.areaIds?.includes(selectedAreaId)).length}{" "}
            hytter i området
          </p>
        )}
        {Object.entries(SERVICE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: SERVICE_COLORS[key] }}
            />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <span
            className="w-6 h-0.5 flex-shrink-0 rounded"
            style={{ backgroundColor: "#a78bfa" }}
          />
          <span className="text-gray-600">Tursti</span>
        </div>
      </div>

      {/* Loading / error overlays */}
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <svg
              className="animate-spin w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <span className="text-sm font-medium">Laster DNT-hytter…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
