"use client";

import { useMemo, Fragment } from "react";
import type { Route } from "../page";

const SLOPE_GREEN = "#16a34a";
const SLOPE_YELLOW = "#ca8a04";
const SLOPE_RED = "#dc2626";

function slopeColor(altDiff: number, distKm: number): string {
  if (distKm < 0.0001) return SLOPE_GREEN;
  const grade = Math.abs(altDiff) / (distKm * 1000);
  if (grade < 0.1) return SLOPE_GREEN;
  if (grade < 0.2) return SLOPE_YELLOW;
  return SLOPE_RED;
}

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

function extractStages(
  geojson: Route["geojson"],
): [number, number, number][][] {
  if (!geojson) return [];
  if (geojson.type === "LineString")
    return [geojson.coordinates as [number, number, number][]];
  if (geojson.type === "MultiLineString")
    return geojson.coordinates as [number, number, number][][];
  return [];
}

function formatTime(hours: number): string {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

interface StageInfo {
  startDist: number;
  endDist: number;
  midLat: number;
  midLon: number;
  distance: number;
  ascent: number;
  estimatedHours: number;
}

interface Props {
  route: Route;
  onStageClick?: (lat: number, lon: number) => void;
}

export default function ElevationProfile({ route, onStageClick }: Props) {
  const profile = useMemo(() => {
    const stages = extractStages(route.geojson);
    if (stages.length === 0 || stages[0].length < 2) return null;

    const hasAlt = stages.flat().some(([, , alt]) => alt != null);
    if (!hasAlt) return null;

    type Point = { dist: number; elev: number };
    const allPoints: Point[] = [];
    const stageInfos: StageInfo[] = [];
    let cumDist = 0;
    let totalAscent = 0;
    let totalDescent = 0;

    for (const stageCoords of stages) {
      const stageStartDist = cumDist;
      let stageAscent = 0;

      for (let i = 0; i < stageCoords.length; i++) {
        const [lon, lat, alt = 0] = stageCoords[i];
        if (i > 0) {
          const [lon0, lat0] = stageCoords[i - 1];
          cumDist += haversineKm(lat0, lon0, lat, lon);
          const diff = alt - (stageCoords[i - 1][2] ?? 0);
          if (diff > 0) {
            stageAscent += diff;
            totalAscent += diff;
          } else totalDescent += Math.abs(diff);
        }
        allPoints.push({ dist: cumDist, elev: alt });
      }

      const stageDist = cumDist - stageStartDist;
      const mid = stageCoords[Math.floor(stageCoords.length / 2)];
      stageInfos.push({
        startDist: stageStartDist,
        endDist: cumDist,
        midLat: mid[1],
        midLon: mid[0],
        distance: Math.round(stageDist * 10) / 10,
        ascent: Math.round(stageAscent),
        estimatedHours: stageDist / 5 + stageAscent / 600,
      });
    }

    const totalDist = cumDist;
    const elevs = allPoints.map((p) => p.elev);
    const minElev = Math.min(...elevs);
    const maxElev = Math.max(...elevs);
    const elevRange = maxElev - minElev || 1;

    // Downsample for SVG
    const step = Math.max(1, Math.floor(allPoints.length / 300));
    const sampled = allPoints.filter(
      (_, i) => i % step === 0 || i === allPoints.length - 1,
    );

    const W = 280;
    const H = 56;
    const pad = 4;

    const toX = (dist: number) => (dist / totalDist) * W;
    const toY = (elev: number) =>
      H - pad - ((elev - minElev) / elevRange) * (H - pad * 2);

    const svgPts = sampled.map((p) => ({
      x: toX(p.dist),
      y: toY(p.elev),
      elev: p.elev,
      dist: p.dist,
    }));

    type ColorRun = { points: { x: number; y: number }[]; color: string };
    const colorRuns: ColorRun[] = [];
    for (let i = 0; i < svgPts.length - 1; i++) {
      const color = slopeColor(
        svgPts[i + 1].elev - svgPts[i].elev,
        svgPts[i + 1].dist - svgPts[i].dist,
      );
      const last = colorRuns[colorRuns.length - 1];
      if (last?.color === color) {
        last.points.push({ x: svgPts[i + 1].x, y: svgPts[i + 1].y });
      } else {
        colorRuns.push({
          points: [
            { x: svgPts[i].x, y: svgPts[i].y },
            { x: svgPts[i + 1].x, y: svgPts[i + 1].y },
          ],
          color,
        });
      }
    }

    return {
      totalDist,
      minElev: Math.round(minElev),
      maxElev: Math.round(maxElev),
      ascent: Math.round(totalAscent),
      descent: Math.round(totalDescent),
      estimatedHours: totalDist / 5 + totalAscent / 600,
      colorRuns,
      stageInfos,
      toX,
      W,
      H,
    };
  }, [route]);

  if (!profile) return null;

  const multiStage = profile.stageInfos.length > 1;

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
          {profile.colorRuns.map((run, i) => {
            const strokePts = run.points
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ");
            const first = run.points[0];
            const last = run.points[run.points.length - 1];
            const fillPts = `${first.x.toFixed(1)},${profile.H} ${strokePts} ${last.x.toFixed(1)},${profile.H}`;
            return (
              <Fragment key={i}>
                <polygon points={fillPts} fill={run.color + "33"} />
                <polyline
                  points={strokePts}
                  fill="none"
                  stroke={run.color}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </Fragment>
            );
          })}

          {/* Stage dividers */}
          {multiStage &&
            profile.stageInfos
              .slice(0, -1)
              .map((s, i) => (
                <line
                  key={i}
                  x1={profile.toX(s.endDist)}
                  y1={0}
                  x2={profile.toX(s.endDist)}
                  y2={profile.H}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="3,2"
                />
              ))}

          {/* Clickable stage regions */}
          {onStageClick &&
            multiStage &&
            profile.stageInfos.map((s, i) => (
              <rect
                key={i}
                x={profile.toX(s.startDist)}
                y={0}
                width={profile.toX(s.endDist) - profile.toX(s.startDist)}
                height={profile.H}
                fill="transparent"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onStageClick(s.midLat, s.midLon);
                }}
              />
            ))}
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-2.5">
        <Stat label="Oppstigning" value={`↑ ${profile.ascent} m`} />
        <Stat label="Nedstigning" value={`↓ ${profile.descent} m`} />
        <Stat label="Est. tid" value={formatTime(profile.estimatedHours)} />
      </div>

      {/* Per-stage breakdown */}
      {multiStage && onStageClick && (
        <div className="mt-2.5 space-y-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            Etapper — trykk for å zoome
          </p>
          {profile.stageInfos.map((s, i) => (
            <button
              key={i}
              onClick={() => onStageClick(s.midLat, s.midLon)}
              className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-green-700 hover:bg-green-50 rounded px-2 py-1 transition-colors text-left"
            >
              <span className="font-medium">Etappe {i + 1}</span>
              <span className="text-gray-400">
                {s.distance} km · ↑{s.ascent} m · {formatTime(s.estimatedHours)}
              </span>
            </button>
          ))}
        </div>
      )}
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
