"use client";

import { useEffect, useState } from "react";

interface TimeStep {
  time: string;
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } };
    next_6_hours?: {
      details: { precipitation_amount: number };
      summary: { symbol_code: string };
    };
    next_12_hours?: { summary: { symbol_code: string } };
  };
}

interface DayForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  windMax: number;
  symbol: string;
}

function groupByDay(timeseries: TimeStep[]): DayForecast[] {
  const days: Record<string, { temps: number[]; precip: number; winds: number[]; symbol: string }> = {};

  for (const step of timeseries) {
    const date = step.time.slice(0, 10);
    if (!days[date]) days[date] = { temps: [], precip: 0, winds: [], symbol: "" };

    const temp = step.data.instant.details.air_temperature;
    const wind = step.data.instant.details.wind_speed;
    days[date].temps.push(temp);
    days[date].winds.push(wind);

    if (step.data.next_6_hours) {
      days[date].precip += step.data.next_6_hours.details.precipitation_amount;
      if (!days[date].symbol) {
        days[date].symbol = step.data.next_6_hours.summary.symbol_code;
      }
    }
  }

  return Object.entries(days)
    .slice(0, 7)
    .map(([date, d]) => ({
      date,
      tempMin: Math.min(...d.temps),
      tempMax: Math.max(...d.temps),
      precipitation: Math.round(d.precip * 10) / 10,
      windMax: Math.max(...d.winds),
      symbol: d.symbol,
    }));
}

const WEATHER_EMOJI: Record<string, string> = {
  clearsky: "☀️",
  fair: "🌤️",
  partlycloudy: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  rain: "🌧️",
  lightrain: "🌦️",
  heavyrain: "🌧️",
  rainshowers: "🌦️",
  snow: "❄️",
  lightsnow: "🌨️",
  sleet: "🌨️",
  thunder: "⛈️",
};

function weatherEmoji(symbol: string): string {
  for (const [key, emoji] of Object.entries(WEATHER_EMOJI)) {
    if (symbol.startsWith(key)) return emoji;
  }
  return "🌡️";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; days: DayForecast[] };

export default function WeatherForecast({ lat, lon }: { lat: number; lon: number }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const timeseries: TimeStep[] = data?.properties?.timeseries ?? [];
        setState({ status: "done", days: groupByDay(timeseries) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => { cancelled = true; };
  }, [lat, lon]);

  if (state.status === "loading") {
    return (
      <div className="px-3 py-3 text-xs text-gray-400 animate-pulse">
        Henter værvarsel…
      </div>
    );
  }

  if (state.status === "error" || state.days.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-red-400">
        Kunne ikke laste værvarsel
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg mx-1 mb-2 overflow-hidden">
      <p className="text-xs font-medium text-blue-700 px-3 pt-2 pb-1">
        Værvarsel (Yr)
      </p>
      <div className="divide-y divide-blue-100">
        {state.days.map((day) => (
          <div key={day.date} className="flex items-center gap-2 px-3 py-1.5 text-xs">
            <span className="text-base w-6 text-center">{weatherEmoji(day.symbol)}</span>
            <span className="w-24 text-gray-500 shrink-0">{formatDate(day.date)}</span>
            <span className="font-medium text-gray-800 w-20 shrink-0">
              {Math.round(day.tempMin)}–{Math.round(day.tempMax)} °C
            </span>
            <span className="text-blue-600 w-14 shrink-0">💧 {day.precipitation} mm</span>
            <span className="text-gray-500">💨 {Math.round(day.windMax)} m/s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
