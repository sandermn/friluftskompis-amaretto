import { NextRequest } from "next/server";

const DNT_GQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

export interface SearchResult {
  id: string;
  name: string;
  category: "cabin" | "area" | "peak";
  subtitle?: string;
  lat: number;
  lon: number;
}

// DNT result format: "type;id;lon,lat;name;extra"
function parseDntResults(raw: string[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const str of raw) {
    const parts = str.split(";");
    if (parts.length < 4) continue;

    const type = parts[0];
    const id = parts[1];
    const coords = parts[2].split(",").map(Number);
    if (coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) continue;

    const [lon, lat] = coords;
    const name = parts[3];

    if (type === "d") {
      results.push({ id: `dnt-d-${id}`, name, category: "cabin", lat, lon });
    } else if (type === "a" || type === "j") {
      results.push({ id: `dnt-a-${id}`, name, category: "area", lat, lon });
    }
    // skip g (routes) and h (generic places)
  }

  return results;
}

async function searchDnt(q: string): Promise<SearchResult[]> {
  const res = await fetch(DNT_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({
      query: `{ search(input: { searchString: ${JSON.stringify(q)} }) { result } }`,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const raw: string[] = data?.data?.search?.result ?? [];
  return parseDntResults(raw);
}

async function searchPeaks(q: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    sok: q,
    fuzzy: "true",
    utkoordsys: "4326",
    treffPerSide: "8",
  });
  const res = await fetch(
    `https://ws.geonorge.no/stedsnavn/v1/navn?${params}`,
    { headers: { "User-Agent": "friluftskompis/1.0" } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  const PEAK_TYPES = new Set(["Fjell", "Fjelltopp", "Topp", "Fjellkjede"]);
  return (data.navn ?? [])
    .filter((n: { navneobjekttype: string }) =>
      PEAK_TYPES.has(n.navneobjekttype)
    )
    .map(
      (n: {
        stedsnummer: number;
        skrivemåte: string;
        navneobjekttype: string;
        kommuner: { kommunenavn: string }[];
        representasjonspunkt: { nord: number; øst: number };
      }) => ({
        id: `geo-${n.stedsnummer}`,
        name: n.skrivemåte,
        category: "peak" as const,
        subtitle: n.kommuner?.[0]?.kommunenavn,
        lat: n.representasjonspunkt.nord,
        lon: n.representasjonspunkt.øst,
      })
    );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return Response.json([]);
  }

  const [dntResults, peakResults] = await Promise.all([
    searchDnt(q),
    searchPeaks(q),
  ]);

  // Merge: areas first, then peaks, then cabins — deduplicated by name
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const r of [...dntResults.filter(r => r.category === "area"), ...peakResults, ...dntResults.filter(r => r.category === "cabin")]) {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return Response.json(merged.slice(0, 12));
}
