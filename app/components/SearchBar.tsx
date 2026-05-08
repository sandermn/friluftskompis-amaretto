"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../api/search/route";

const CATEGORY_CONFIG = {
  area: { label: "Område", icon: "🗺️" },
  cabin: { label: "Hytte", icon: "🏠" },
  peak: { label: "Fjelltopp", icon: "⛰️" },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Props {
  onSelect: (result: SearchResult) => void;
}

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    const controller = new AbortController();

    if (debouncedQuery.length < 3) {
      // schedule as microtask to avoid synchronous setState in effect body
      Promise.resolve().then(() => {
        setResults([]);
        setOpen(false);
      });
      return () => controller.abort();
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: SearchResult[]) => {
        setResults(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(result: SearchResult) {
    setQuery(result.name);
    setOpen(false);
    onSelect(result);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-white rounded-xl shadow-md border border-gray-200 px-3 py-2">
        {loading ? (
          <svg
            className="animate-spin w-4 h-4 text-green-600 shrink-0"
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
        ) : (
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Søk på hytte, område eller fjelltopp…"
          className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="search-listbox"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Tøm søk"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <ul
          id="search-listbox"
          role="listbox"
          className="absolute top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[2000]"
        >
          {results.map((r, i) => {
            const cfg = CATEGORY_CONFIG[r.category];
            return (
              <li
                key={r.id}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={() => handleSelect(r)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  i === activeIdx ? "bg-green-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="text-base w-5 text-center shrink-0">
                  {cfg.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {r.name}
                  </p>
                  {r.subtitle && (
                    <p className="text-xs text-gray-500 truncate">
                      {r.subtitle}
                    </p>
                  )}
                </div>
                <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wide shrink-0">
                  {cfg.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
