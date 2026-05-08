"use client";

import { useState } from "react";
import AiBadge from "./AiBadge";
import type { Route } from "../page";
import type { RouteAssessmentResponse } from "../api/route-assess/route";

const EXPERIENCE_OPTIONS = [
  { key: "Nybegynner", label: "Nybegynner" },
  { key: "Middels erfaren", label: "Middels" },
  { key: "Erfaren", label: "Erfaren" },
];

const VERDICT_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Realistisk: {
    bg: "bg-green-50",
    text: "text-green-900",
    border: "border-green-200",
  },
  Krevende: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  "Ikke anbefalt": {
    bg: "bg-red-50",
    text: "text-red-900",
    border: "border-red-200",
  },
};

interface RouteAssessmentProps {
  route: Route;
  season: string;
}

export default function RouteAssessment({
  route,
  season,
}: RouteAssessmentProps) {
  const [open, setOpen] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [experience, setExperience] = useState("Middels erfaren");
  const [result, setResult] = useState<RouteAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function assess() {
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch("/api/route-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeName: route.name,
          distanceKm: route.distanceKm,
          difficulty: route.vanskelighet,
          area: route.omrade,
          season,
          groupSize,
          experience,
        }),
      });
      if (!res.ok) throw new Error();
      const data: RouteAssessmentResponse = await res.json();
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const styles = result
    ? (VERDICT_STYLES[result.verdict] ?? VERDICT_STYLES["Krevende"])
    : null;

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) {
            setResult(null);
            setError(false);
          }
        }}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-violet-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-medium text-violet-700 flex items-center gap-1.5">
          <SparkleIcon />
          AI-vurdering for gruppen din
        </span>
        <span className="ml-auto text-[10px] text-gray-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-white">
          {/* Group inputs */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">Antall:</span>
              <button
                type="button"
                onClick={() => setGroupSize((s) => Math.max(1, s - 1))}
                className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors font-bold"
                aria-label="Færre deltakere"
              >
                −
              </button>
              <span
                className="w-6 text-center text-xs font-semibold tabular-nums"
                aria-live="polite"
              >
                {groupSize}
              </span>
              <button
                type="button"
                onClick={() => setGroupSize((s) => Math.min(12, s + 1))}
                className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors font-bold"
                aria-label="Flere deltakere"
              >
                +
              </button>
            </div>

            <div
              className="flex gap-1"
              role="group"
              aria-label="Erfaringsnivå"
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setExperience(opt.key)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                    experience === opt.key
                      ? "bg-violet-700 text-white border-violet-700"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                  aria-pressed={experience === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={assess}
            disabled={loading}
            className="w-full py-1.5 rounded-lg text-xs font-semibold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60 transition-colors mb-3"
          >
            {loading ? "Vurderer…" : "Vurder ruten for gruppen min"}
          </button>

          {error && (
            <p className="text-xs text-red-500 mb-2">
              Kunne ikke hente vurdering. Prøv igjen.
            </p>
          )}

          {result && styles && (
            <div
              className={`rounded-xl border p-3 ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base" aria-hidden="true">
                  {result.emoji}
                </span>
                <span className={`text-xs font-semibold ${styles.text}`}>
                  {result.verdict}
                </span>
                <span className="ml-auto">
                  <AiBadge />
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${styles.text} mb-2`}>
                {result.summary}
              </p>
              {result.tips.length > 0 && (
                <ul className="space-y-1">
                  {result.tips.map((tip, i) => (
                    <li
                      key={i}
                      className={`text-[11px] ${styles.text} opacity-80 flex gap-1.5`}
                    >
                      <span aria-hidden="true">→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
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
