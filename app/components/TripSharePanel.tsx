"use client";

import { useState } from "react";

interface Props {
  tripId: string;
  onClose: () => void;
}

export default function TripSharePanel({ tripId, onClose }: Props) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/tur/${tripId}`
      : `/tur/${tripId}`;

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
      const input = document.getElementById(
        "share-url-input",
      ) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
      >
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🎉</div>
          <h2
            id="share-title"
            className="text-base font-semibold text-gray-900"
          >
            Turen er opprettet!
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Del lenken med deltakerne
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            id="share-url-input"
            type="text"
            readOnly
            value={url}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors whitespace-nowrap"
          >
            {copied ? "Kopiert ✓" : "Kopier"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Lukk
        </button>
      </div>
    </div>
  );
}
