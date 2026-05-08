const DNT_GQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const FIELDS = `
  id
  name
  descriptionAb
  gradingAb
  distance
  counties { name }
  geojson
`;

interface RouteEdge {
  node: {
    id: number;
    name: string;
    descriptionAb: string | null;
    gradingAb: number | null;
    distance: number | null;
    counties: { name: string }[];
    geojson: {
      type: string;
      // LineString: [lon, lat, alt?][]
      // MultiLineString: [lon, lat, alt?][][]
      coordinates: unknown;
    } | null;
  };
}

/** Extract centroid [lat, lon] from LineString or MultiLineString geojson */
function centroid(geojson: RouteEdge["node"]["geojson"]): [number, number] | null {
  if (!geojson) return null;

  if (geojson.type === "LineString") {
    const coords = geojson.coordinates as [number, number, number?][];
    if (!coords?.length) return null;
    const mid = coords[Math.floor(coords.length / 2)];
    return [mid[1], mid[0]];
  }

  if (geojson.type === "MultiLineString") {
    const lines = geojson.coordinates as [number, number, number?][][];
    const first = lines?.[0];
    if (!first?.length) return null;
    const mid = first[Math.floor(first.length / 2)];
    return [mid[1], mid[0]];
  }

  return null;
}

/** Map DNT grading (1–5 scale) to a label */
function gradingLabel(grading: number | null): string {
  if (grading === null || grading === undefined) return "Ukjent";
  if (grading <= 1) return "Enkel";
  if (grading <= 3) return "Middels";
  return "Krevende";
}

export async function GET() {
  try {
    const res = await fetch(DNT_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://ut.no",
      },
      body: JSON.stringify({
        query: `{ routes(paging: { first: 100 }) { edges { node { ${FIELDS} } } } }`,
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("DNT fetch failed");

    const json = await res.json();
    const edges: RouteEdge[] = json?.data?.routes?.edges ?? [];

    const routes = edges
      .map((e) => {
        const n = e.node;
        const center = centroid(n.geojson);
        return {
          id: n.id,
          name: n.name,
          beskrivelse: n.descriptionAb?.slice(0, 200) ?? null,
          vanskelighet: gradingLabel(n.gradingAb),
          gradingRaw: n.gradingAb ?? 0,
          distanceKm: n.distance ? Math.round(n.distance / 1000) : null,
          omrade: n.counties?.[0]?.name ?? null,
          lat: center?.[0] ?? null,
          lon: center?.[1] ?? null,
        };
      })
      .filter((r) => r.lat !== null && r.name);

    return Response.json({ routes });
  } catch {
    return Response.json({ error: "Failed to fetch routes" }, { status: 502 });
  }
}
