import Link from "next/link";
import { runStatusChecks } from "../lib/statusChecks";
import type { StatusResponse } from "../lib/statusChecks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    return await runStatusChecks();
  } catch {
    return null;
  }
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ok ? "bg-green-500" : "bg-red-500"}`}
      aria-hidden="true"
    />
  );
}

export default async function StatusPage() {
  const data = await fetchStatus();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Tilbake til forsiden"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
            Systemstatus
          </h1>
          <p className="text-xs text-gray-500">Friluftskompis · API-helse</p>
        </div>
        {data && (
          <span
            className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
              data.status === "ok"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {data.status === "ok" ? "Alle systemer operative" : "Delvis nede"}
          </span>
        )}
      </header>

      <main className="flex-1 px-4 py-8 max-w-xl mx-auto w-full">
        {!data ? (
          <p className="text-sm text-red-500">
            Kunne ikke hente statusdata. Prøv igjen om litt.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Overall status banner */}
            <div
              className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                data.status === "ok"
                  ? "bg-green-50 border border-green-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <StatusDot ok={data.status === "ok"} />
              <div>
                <p
                  className={`text-sm font-semibold ${data.status === "ok" ? "text-green-800" : "text-yellow-800"}`}
                >
                  {data.status === "ok"
                    ? "Alle eksterne API-er svarer"
                    : "Ett eller flere API-er er utilgjengelige"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sist sjekket:{" "}
                  {new Date(data.timestamp).toLocaleString("nb-NO")}
                </p>
              </div>
            </div>

            {/* API table */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Eksterne API-er
              </h2>
              <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {data.apis.map((api) => (
                  <li
                    key={api.key}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <StatusDot ok={api.ok} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {api.name}
                      </p>
                      {api.error && (
                        <p className="text-xs text-red-500 truncate">
                          {api.error}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-semibold ${api.ok ? "text-green-700" : "text-red-600"}`}
                      >
                        {api.ok ? "OK" : "Nede"}
                      </p>
                      {api.latencyMs !== null && (
                        <p className="text-[10px] text-gray-400">
                          {api.latencyMs} ms
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Data sources legend */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Datakilde-forklaring
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 shrink-0 mt-0.5">
                    ✦ AI-generert
                  </span>
                  <p className="text-xs text-gray-600">
                    Innhold laget av en stor språkmodell.
                    Kan inneholde unøyaktigheter — bruk skjønn.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 shrink-0 mt-0.5">
                    ✓ Faktisk data
                  </span>
                  <p className="text-xs text-gray-600">
                    Hentet direkte fra offisielle kilder: DNT/UT.no, Yr/MET
                    eller Geonorge.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
