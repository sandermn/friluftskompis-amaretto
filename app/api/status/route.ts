import { NextResponse } from "next/server";

export interface ApiStatus {
  key: string;
  name: string;
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}

export interface StatusResponse {
  status: "ok" | "degraded";
  timestamp: string;
  apis: ApiStatus[];
  version: string;
}

async function checkApi(
  key: string,
  name: string,
  fn: (signal: AbortSignal) => Promise<Response>,
): Promise<ApiStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const start = Date.now();
  try {
    const res = await fn(controller.signal);
    clearTimeout(timeout);
    return { key, name, ok: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    clearTimeout(timeout);
    return {
      key,
      name,
      ok: false,
      latencyMs: null,
      error:
        e instanceof Error
          ? e.name === "AbortError"
            ? "Tidsavbrudd (>5s)"
            : e.message
          : "Ukjent feil",
    };
  }
}

export async function GET() {
  const [dnt, yr, geonorge] = await Promise.all([
    checkApi("dnt", "DNT / UT.no GraphQL", (signal) =>
      fetch(
        "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://ut.no",
          },
          body: JSON.stringify({ query: "{ __typename }" }),
          signal,
        },
      ),
    ),
    checkApi("yr", "Yr / MET Værvarsling", (signal) =>
      fetch(
        "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75",
        {
          headers: { "User-Agent": "friluftskompis/1.0 status-check" },
          signal,
        },
      ),
    ),
    checkApi("geonorge", "Geonorge Stedsnavn", (signal) =>
      fetch(
        "https://ws.geonorge.no/stedsnavn/v1/navn?sok=oslo&treffPerSide=1",
        {
          headers: { "User-Agent": "friluftskompis/1.0 status-check" },
          signal,
        },
      ),
    ),
  ]);

  const apis = [dnt, yr, geonorge];
  const allOk = apis.every((a) => a.ok);

  const body: StatusResponse = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    apis,
    version: "1.0.0",
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
