"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PackingListResponse } from "../api/packing-list/route";

interface WeatherSummary {
  tempMin: number;
  tempMax: number;
  precipTotal: number;
  windMax: number;
  hasSnow: boolean;
}

interface Props {
  tripName: string;
  distanceKm: number | null;
  difficulty: string;
  lat: number;
  lon: number;
  onListChange?: (list: PackingListResponse | null) => void;
}

function ParticipantStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Færre deltakere"
        className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm leading-none hover:bg-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-medium text-gray-800">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        aria-label="Flere deltakere"
        className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm leading-none hover:bg-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
      >
        +
      </button>
    </div>
  );
}

function DayStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Færre dager"
        className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm leading-none hover:bg-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-medium text-gray-800">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(14, value + 1))}
        aria-label="Flere dager"
        className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm leading-none hover:bg-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
      >
        +
      </button>
    </div>
  );
}

export default function PackingList({
  tripName,
  distanceKm,
  difficulty,
  lat,
  lon,
  onListChange,
}: Props) {
  const [participants, setParticipants] = useState(2);
  const [days, setDays] = useState(1);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [list, setList] = useState<PackingListResponse | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);

  // Fetch weather for this trip location (same as WeatherForecast does)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const timeseries: {
          time: string;
          data: {
            instant: {
              details: { air_temperature: number; wind_speed: number };
            };
            next_6_hours?: {
              details: { precipitation_amount: number };
              summary: { symbol_code: string };
            };
          };
        }[] = data?.properties?.timeseries ?? [];

        const relevant = timeseries.slice(0, days * 8); // 3-hour steps, 8 per day
        if (!relevant.length) return;

        const temps = relevant.map(
          (s) => s.data.instant.details.air_temperature,
        );
        const winds = relevant.map((s) => s.data.instant.details.wind_speed);
        const precip = relevant.reduce(
          (sum, s) =>
            sum + (s.data.next_6_hours?.details.precipitation_amount ?? 0),
          0,
        );
        const symbols = relevant
          .map((s) => s.data.next_6_hours?.summary.symbol_code ?? "")
          .filter(Boolean);
        const hasSnow = symbols.some(
          (s) => s.includes("snow") || s.includes("sleet"),
        );

        setWeather({
          tempMin: Math.min(...temps),
          tempMax: Math.max(...temps),
          precipTotal: Math.round(precip * 10) / 10,
          windMax: Math.max(...winds),
          hasSnow,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lat, lon, days]);

  // Stable key so we don't refetch on every keystroke
  const fetchKey = useMemo(
    () =>
      `${participants}-${days}-${weather ? JSON.stringify(weather) : "noweather"}`,
    [participants, days, weather],
  );
  const lastFetchedKey = useRef<string | null>(null);

  function generate() {
    if (lastFetchedKey.current === fetchKey) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setList(null);
    lastFetchedKey.current = fetchKey;

    fetch("/api/packing-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripName,
        distanceKm,
        difficulty,
        participants,
        days,
        weather,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: PackingListResponse) => {
        setList(data);
        setChecked(new Set());
        setStatus("idle");
        onListChange?.(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("error");
      });
  }

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="bg-green-50 rounded-lg mx-1 mb-2 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-2 pb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-green-700">🧠 AI-pakkeliste</p>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-600 font-medium">
              👥 Deltakere
            </span>
            <ParticipantStepper
              value={participants}
              onChange={(v) => {
                setParticipants(v);
                lastFetchedKey.current = null;
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-600 font-medium">
              📅 Dager
            </span>
            <DayStepper
              value={days}
              onChange={(v) => {
                setDays(v);
                lastFetchedKey.current = null;
              }}
            />
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={status === "loading"}
            className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-70 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 outline-none transition-colors"
            aria-busy={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <svg
                  className="animate-spin w-3 h-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
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
                Genererer…
              </>
            ) : list ? (
              "Oppdater"
            ) : (
              "Generer"
            )}
          </button>
        </div>
      </div>

      {/* Weather summary strip */}
      {weather && (
        <div className="px-3 pb-1.5 flex gap-3 text-[10px] text-gray-600">
          <span>
            🌡️ {Math.round(weather.tempMin)}–{Math.round(weather.tempMax)} °C
          </span>
          <span>💧 {weather.precipTotal} mm</span>
          <span>💨 {Math.round(weather.windMax)} m/s</span>
          {weather.hasSnow && <span>❄️ Snø/is</span>}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <p className="px-3 pb-2 text-xs text-red-500">
          Kunne ikke generere pakkeliste. Prøv igjen.
        </p>
      )}

      {/* Skeleton while loading */}
      {status === "loading" && (
        <div
          className="divide-y divide-green-100 px-3 py-2 space-y-3"
          aria-label="Genererer pakkeliste…"
        >
          {[5, 4, 3].map((lines, gi) => (
            <div key={gi} className="pt-2 first:pt-0">
              {/* Category heading skeleton */}
              <div className="h-2.5 w-20 rounded bg-green-200 animate-pulse mb-2" />
              <ul className="space-y-1.5">
                {Array.from({ length: lines }).map((_, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded shrink-0 bg-green-200 animate-pulse" />
                    <div
                      className="h-2 rounded bg-green-100 animate-pulse"
                      style={{ width: `${55 + ((i * 17 + gi * 11) % 35)}%` }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Packing list */}
      {list && (
        <div className="divide-y divide-green-100">
          {list.categories.map((cat) => (
            <div key={cat.category} className="px-3 py-2">
              <p className="text-[10px] font-semibold text-green-800 uppercase tracking-wide mb-1">
                {cat.emoji} {cat.category}
              </p>
              <ul className="space-y-0.5">
                {cat.items.map((item) => {
                  const key = `${cat.category}:${item}`;
                  const done = checked.has(key);
                  return (
                    <li key={key}>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleItem(key)}
                          className="mt-0.5 accent-green-600 shrink-0"
                          aria-label={item}
                        />
                        <span
                          className={`text-xs ${done ? "line-through text-gray-400" : "text-gray-700"}`}
                        >
                          {item}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {list.tips.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-green-800 uppercase tracking-wide mb-1">
                💡 Tips
              </p>
              <ul className="space-y-0.5">
                {list.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Prompt to generate */}
      {!list && status === "idle" && (
        <p className="px-3 pb-3 text-xs text-gray-500">
          Sett antall deltakere og dager, trykk deretter «Generer» for en
          tilpasset pakkeliste basert på turen og været.
        </p>
      )}
    </div>
  );
}
