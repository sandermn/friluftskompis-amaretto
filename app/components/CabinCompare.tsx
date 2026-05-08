"use client";

import { useState } from "react";
import AiBadge from "./AiBadge";
import type { SearchResult } from "../api/search/route";
import type { CabinCompareResponse, CabinInput } from "../api/cabin-compare/route";

const MAX_CABINS = 5;
const RADIUS_DEG = 1.2; // ~80–130 km

const SERVICE_LABELS: Record<string, string> = {
  STAFFED: "Betjent",
  SELF_SERVICE: "Selvbetjent",
  NO_SERVICE: "Ubetjent",
  NO_SERVICE_NO_BEDS: "Dagshytte",
  RENTAL: "Utleie",
};

interface RawCabin {
  id: number;
  name: string;
  serviceLevel: string;
  geojson: { type: string; coordinates: [number, number, number?] };
  bedsStaffed: number;
  bedsSelfService: number;
  bedsNoService: number;
  bedsWinter: number;
  elevationCustom: number | null;
}

interface CabinCompareProps {
  season: string;
  selectedLocation: SearchResult | null;
}

export default function CabinCompare({ season, selectedLocation }: CabinCompareProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CabinCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [usedLocation, setUsedLocation] = useState<string | null>(null);

  async function compare() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/cabins");
      if (!res.ok) throw new Error();
      const json = await res.json();
      const edges: { node: RawCabin }[] = json.data?.cabins?.edges ?? [];

      let cabins: RawCabin[] = edges.map((e) => e.node);

      if (selectedLocation) {
        cabins = cabins.filter((c) => {
          const [lon, lat] = c.geojson?.coordinates ?? [0, 0];
          return (
            Math.abs(lat - selectedLocation.lat) <= RADIUS_DEG &&
            Math.abs(lon - selectedLocation.lon) <= RADIUS_DEG
          );
        });
      }

      // Prefer staffed/self-service, then sort by total beds desc
      cabins.sort((a, b) => {
        const order: Record<string, number> = { STAFFED: 0, SELF_SERVICE: 1, RENTAL: 2, NO_SERVICE: 3, NO_SERVICE_NO_BEDS: 4 };
        const diff = (order[a.serviceLevel] ?? 5) - (order[b.serviceLevel] ?? 5);
        if (diff !== 0) return diff;
        const bedsA = a.bedsStaffed + a.bedsSelfService + a.bedsNoService + a.bedsWinter;
        const bedsB = b.bedsStaffed + b.bedsSelfService + b.bedsNoService + b.bedsWinter;
        return bedsB - bedsA;
      });

      const top = cabins.slice(0, MAX_CABINS);
      if (top.length < 2) throw new Error("too-few");

      const payload: CabinInput[] = top.map((c) => ({
        id: c.id,
        name: c.name,
        serviceLevel: c.serviceLevel,
        totalBeds: c.bedsStaffed + c.bedsSelfService + c.bedsNoService + c.bedsWinter,
        bedsWinter: c.bedsWinter,
        elevationM: c.elevationCustom,
      }));

      const compareRes = await fetch("/api/cabin-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabins: payload, season }),
      });
      if (!compareRes.ok) throw new Error();
      const data: CabinCompareResponse = await compareRes.json();
      setResult(data);
      setUsedLocation(selectedLocation?.name ?? null);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !result) compare();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-violet-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold text-violet-700 flex items-center gap-1.5">
          <SparkleIcon />
          Sammenlign hytter i området med AI
        </span>
        <span className="ml-auto text-[10px] text-gray-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-violet-50 border-t border-violet-100">
          {loading && (
            <p className="py-4 text-center text-xs text-violet-600 animate-pulse">
              Analyserer hytter…
            </p>
          )}

          {error && (
            <div className="py-3 flex items-center gap-2">
              <p className="text-xs text-red-500">
                Kunne ikke sammenligne — for lite data i dette området.
              </p>
              <button
                type="button"
                onClick={compare}
                className="text-xs text-violet-700 underline"
              >
                Prøv igjen
              </button>
            </div>
          )}

          {result && (
            <div className="pt-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {result.overview}
                  </p>
                  {usedLocation && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Hytter nær {usedLocation}
                    </p>
                  )}
                </div>
                <AiBadge />
              </div>

              <div className="space-y-2">
                {result.cabins.map((cabin) => (
                  <div
                    key={cabin.id}
                    className="bg-white rounded-xl border border-violet-100 p-3"
                  >
                    <p className="text-xs font-semibold text-gray-900 mb-1.5">
                      {cabin.name}
                    </p>
                    <div className="grid grid-cols-2 gap-x-2 mb-1.5">
                      <div className="space-y-0.5">
                        {cabin.pros.map((p, i) => (
                          <p key={i} className="text-[10px] text-green-700 flex gap-1">
                            <span aria-hidden="true">✓</span>
                            {p}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        {cabin.cons.map((c, i) => (
                          <p key={i} className="text-[10px] text-red-600 flex gap-1">
                            <span aria-hidden="true">✗</span>
                            {c}
                          </p>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      {cabin.bestFor}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-violet-100 rounded-lg px-3 py-2">
                <p className="text-xs text-violet-900 font-medium">
                  💡 {result.recommendation}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  compare();
                }}
                className="text-[10px] text-violet-600 hover:text-violet-800 transition-colors"
              >
                Oppdater sammenligning
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg
      className="w-3 h-3 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l2.09 6.41L20.5 10l-6.41 2.09L12 18.5l-2.09-6.41L3.5 10l6.41-2.09z" />
    </svg>
  );
}

