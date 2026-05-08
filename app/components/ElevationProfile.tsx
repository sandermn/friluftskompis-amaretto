"use client";

import { useMemo } from "react";
import type { Route } from "../page";

const DIFFICULTY_COLOR: Record<string, string> = {
  Enkel: "#16a34a",
  Middels: "#ca8a04",
  Krevende: "#dc2626",
  Ukjent: "#9ca3af",
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractCoords(geojson: Route["geojson"]): [number, number, number][] {
  if (!geojson) return [];
  if (geojson.type === "LineString") {
    return geojson.coordinates as [number, number, number][];
  }
  if (geojson.type === "MultiLineString") {
    return (geojson.coordinates as [number, number, number][][]).flat();
  }
  return [];
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

export default function ElevationProfile({ route }: { route: Route }) {
  const profile = useMemo(() => {
    const coords = extractCoords(route.geojson);
    if (coords.length < 2) return null;

    const hasAlt = coords.some(([, , alt]) => alt > 0);
    if (!hasAlt) return null;

    // Build cumulative distance + elevation series
    type Point = { dist: number; elev: number };
    const points: Point[] = [];
    let cumDist = 0;

    for (let i = 0; i < coords.length; i++) {
      const [lon, lat, alt = 0] = coords[i];
      if (i > 0) {
        const [lon0, lat0] = coords[i - 1];
        cumDist += haversineKm(lat0, lon0, lat, lon);
      }
      points.push({ dist: cumDist, elev: alt });
    }

    const totalDist = points[points.length - 1].dist;
    const elevs = points.map((p) => p.elev);
    const minElev = Math.min(...elevs);
    const maxElev = Math.max(...elevs);
    const elevRange = maxElev - minElev || 1;

    // Ascent / descent and Naismith's rule
    let ascent = 0;
    let descent = 0;
    for (let i = 1; i < points.length; i++) {
      const diff = points[i].elev - points[i - 1].elev;
      if (diff > 0) ascent += diff;
      else descent += Math.abs(diff);
    }
    const estimatedHours = totalDist / 5 + ascent / 600;

    // Downsample to ≤ 300 points for SVG performance
    const step = Math.max(1, Math.floor(points.length / 300));
    const sampled = points.filter(
      (_, i) => i % step === 0 || i === points.length - 1,
    );

    const W = 280;
    const H = 56;
    const pad = 4;

    const svgPoints = sampled
      .map((p) => {
        const x = (p.dist / totalDist) * W;
        const y = H - pad - ((p.elev - minElev) / elevRange) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const fillPoints = `0,${H} ${svgPoints} ${W},${H}`;

    return {
      totalDist,
      minElev: Math.round(minElev),
      maxElev: Math.round(maxElev),
      ascent: Math.round(ascent),
      descent: Math.round(descent),
      estimatedHours,
      svgPoints,
      fillPoints,
      W,
      H,
    };
  }, [route]);

  if (!profile) return null;

  const color = DIFFICULTY_COLOR[route.vanskelighet] ?? DIFFICULTY_COLOR.Ukjent;
  const colorOpaque = color + "33"; // ~20% opacity fill

  return (
    <div className="px-4 pt-3 pb-4 border-t border-gray-100 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          Høydeprofil
        </span>
        <span className="text-[10px] text-gray-400">
          {profile.minElev}–{profile.maxElev} moh
        </span>
      </div>

      {/* Chart */}
      <div className="w-full rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
        <svg
          viewBox={`0 0 ${profile.W} ${profile.H}`}
          className="w-full"
          preserveAspectRatio="none"
        >
          <polygon points={profile.fillPoints} fill={colorOpaque} />
          <polyline
            points={profile.svgPoints}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-2.5">
        <Stat label="Oppstigning" value={`↑ ${profile.ascent} m`} />
        <Stat label="Nedstigning" value={`↓ ${profile.descent} m`} />
        <Stat label="Est. tid" value={formatTime(profile.estimatedHours)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
