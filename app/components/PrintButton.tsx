"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800"
    >
      Lagre som PDF
    </button>
  );
}
