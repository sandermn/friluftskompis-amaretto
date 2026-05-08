"use client";

interface Props {
  startTime: string | null;
  distanceKm: number | null;
  vanskelighet: string;
  date: string;
}

const SPEED: Record<string, number> = {
  Enkel: 4,
  Middels: 3,
  Krevende: 2,
};

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function TripTimeline({
  startTime,
  distanceKm,
  vanskelighet,
  date,
}: Props) {
  const start = startTime ?? "09:00";
  const kmh = SPEED[vanskelighet] ?? 3;
  const durationMin = distanceKm ? Math.round((distanceKm / kmh) * 60) : null;

  const midTime = durationMin
    ? addMinutes(start, Math.round(durationMin / 2))
    : null;
  const endTime = durationMin ? addMinutes(start, durationMin) : null;

  const dateLabel = new Date(date).toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const steps = [
    { time: start, label: "Avreise", icon: "🚶" },
    ...(midTime ? [{ time: midTime, label: "Halvveis", icon: "🏔️" }] : []),
    ...(endTime
      ? [
          {
            time: endTime,
            label: `Estimert ankomst${distanceKm ? ` (${distanceKm} km)` : ""}`,
            icon: "🏁",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-3 mb-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-3">
      <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide mb-2">
        🗓️ Tidslinje · {dateLabel}
      </p>
      <ol className="relative border-l border-blue-200 ml-2 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="ml-4">
            <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-[10px]">
              {step.icon}
            </span>
            <p className="text-xs font-semibold text-blue-900">{step.time}</p>
            <p className="text-[11px] text-blue-700">{step.label}</p>
          </li>
        ))}
      </ol>
      {!distanceKm && (
        <p className="text-[10px] text-blue-500 mt-2">
          Legg til distanse på ruten for estimert ankomsttid.
        </p>
      )}
    </div>
  );
}
