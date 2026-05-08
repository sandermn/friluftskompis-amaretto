"use client";

import { useEffect, useRef, useState } from "react";
import type { DntArea } from "../api/areas/route";

interface Props {
  selectedId: number | null;
  onChange: (area: DntArea | null) => void;
}

export default function AreaFilter({ selectedId, onChange }: Props) {
  const [areas, setAreas] = useState<DntArea[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then(setAreas)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(area: DntArea | null) {
    onChange(area);
    setOpen(false);
    setQuery("");
  }

  const filtered = query
    ? areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    : areas;

  const selectedArea = areas.find((a) => a.id === selectedId) ?? null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <div className="flex items-center shadow-md rounded-xl">
        <button
          onClick={open ? () => setOpen(false) : handleOpen}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border transition-colors whitespace-nowrap ${
            selectedId
              ? "bg-green-600 text-white border-green-700 hover:bg-green-700 rounded-l-xl"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl"
          }`}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {selectedArea ? selectedArea.name : "Område"}
        </button>
        {selectedId && (
          <button
            aria-label="Fjern filter"
            onClick={() => handleSelect(null)}
            className="px-2 py-2 rounded-r-xl text-sm font-medium border border-l-0 bg-green-600 text-white border-green-700 hover:bg-green-700 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[2000]">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer områder…"
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-green-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Ingen treff
              </li>
            )}
            {filtered.map((area) => (
              <li
                key={area.id}
                onMouseDown={() => handleSelect(area)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  area.id === selectedId
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {area.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
