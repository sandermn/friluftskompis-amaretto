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
    gradingAb: string | null; // enum: EASY | MODERATE | TOUGH | VERY_TOUGH
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

const GRADING_ORDER: Record<string, number> = {
  EASY: 1,
  MODERATE: 2,
  TOUGH: 3,
  VERY_TOUGH: 4,
};

/** Extract centroid [lat, lon] from LineString or MultiLineString geojson */
function centroid(
  geojson: RouteEdge["node"]["geojson"],
): [number, number] | null {
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

/** Map DNT grading enum to Norwegian label */
function gradingLabel(grading: string | null): string {
  if (!grading) return "Ukjent";
  if (grading === "EASY") return "Enkel";
  if (grading === "MODERATE") return "Middels";
  return "Krevende"; // TOUGH | VERY_TOUGH
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
        query: `{ routes(paging: { first: 30 }) { edges { node { ${FIELDS} } } } }`,
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("DNT fetch failed");

    const json = await res.json();
    const edges: RouteEdge[] = json?.data?.routes?.edges ?? [];

    const routes = edges
      .filter((e) => e.node.distance && e.node.distance > 0)
      .map((e) => {
        const node = e.node;
        const center = centroid(node.geojson);
        return {
          id: node.id,
          name: node.name,
          beskrivelse: node.descriptionAb?.slice(0, 200) ?? null,
          vanskelighet: gradingLabel(node.gradingAb),
          gradingRaw: GRADING_ORDER[node.gradingAb ?? ""] ?? 0,
          distanceKm: node.distance ? Math.round(node.distance / 1000) : null,
          omrade: node.counties?.[0]?.name ?? null,
          lat: center?.[0] ?? null,
          lon: center?.[1] ?? null,
          geojson: node.geojson ?? null,
        };
      })
      .filter((route) => route.lat !== null && route.name);

    return Response.json({ routes });
  } catch {
    return Response.json({ error: "Failed to fetch routes" }, { status: 502 });
  }
}
