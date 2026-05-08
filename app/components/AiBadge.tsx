"use client";

/** Visual badge that clearly marks content as AI-generated (S3).
 *  Place next to any text or section produced by an LLM. */
export default function AiBadge() {
  return (
    <span
      title="Dette innholdet er generert av kunstig intelligens og kan inneholde unøyaktigheter"
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 select-none"
    >
      <svg
        className="w-2.5 h-2.5 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Simple sparkle icon */}
        <path d="M12 2l2.09 6.41L20.5 10l-6.41 2.09L12 18.5l-2.09-6.41L3.5 10l6.41-2.09z" />
      </svg>
      AI-generert
    </span>
  );
}

/** Visual badge that marks content as coming from a verified external data source (S3). */
export function KildeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 select-none">
      <svg
        className="w-2.5 h-2.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      {label}
    </span>
  );
}
