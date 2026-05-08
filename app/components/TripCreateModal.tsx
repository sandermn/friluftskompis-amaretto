"use client";

import { useEffect, useRef, useState } from "react";
import PackingList from "./PackingList";
import type { PackingListResponse } from "../api/packing-list/route";
import type { Route } from "../page";

interface Props {
  route: Route;
  onClose: () => void;
  onCreated: (tripId: string) => void;
}

export default function TripCreateModal({ route, onClose, onCreated }: Props) {
  const [tripTitle, setTripTitle] = useState(`Tur: ${route.name}`);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [packingList, setPackingList] = useState<PackingListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: route.id,
          routeName: route.name,
          routeDistanceKm: route.distanceKm,
          routeVanskelighet: route.vanskelighet,
          routeLat: route.lat,
          routeLon: route.lon,
          tripTitle,
          date,
          description,
          packingList,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      const saved = JSON.parse(
        localStorage.getItem("friluftskompis:trips") ?? "{}",
      );
      saved[data.tripId] = data.adminToken;
      localStorage.setItem("friluftskompis:trips", JSON.stringify(saved));
      onCreated(data.tripId);
    } catch {
      setError("Kunne ikke opprette tur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 overflow-y-auto py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              id="modal-title"
              className="text-base font-semibold text-gray-900"
            >
              Planlegg tur
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{route.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="trip-title"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Turstitel
            </label>
            <input
              id="trip-title"
              ref={firstInputRef}
              type="text"
              value={tripTitle}
              onChange={(e) => setTripTitle(e.target.value)}
              maxLength={80}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="trip-date"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Dato
            </label>
            <input
              id="trip-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="trip-desc"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Beskrivelse (valgfritt)
            </label>
            <textarea
              id="trip-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Møtested, utstyr, annen info…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Packing list generator */}
          <div className="-mx-6 border-t border-gray-100">
            <div className="px-6 pt-3 pb-1">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Pakkeliste (valgfritt)
              </p>
              {packingList ? (
                <p className="text-xs text-green-700 font-medium">
                  ✓ Pakkeliste generert ({packingList.categories.length}{" "}
                  kategorier) — lagres med turen
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Ikke generert ennå — deltakere kan fortsatt se turen uten
                  pakkeliste.
                </p>
              )}
            </div>
            <PackingList
              tripName={route.name}
              distanceKm={route.distanceKm}
              difficulty={route.vanskelighet}
              lat={route.lat}
              lon={route.lon}
              onListChange={setPackingList}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-60"
            >
              {loading ? "Oppretter…" : "Opprett og del"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
