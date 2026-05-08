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
  media { id uri type }
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
    media: { id: number; uri: string; type: string }[];
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

/** Static fallback routes served when the DNT API is unavailable (S2) */
const FALLBACK_ROUTES = [
  {
    id: 9001,
    name: "Besseggen",
    beskrivelse:
      "Norges mest kjente dagstur. Smal rygg med Gjende på den ene siden og Bessvatnet på den andre.",
    vanskelighet: "Krevende",
    gradingRaw: 3,
    distanceKm: 20,
    omrade: "Jotunheimen",
    lat: 61.5245,
    lon: 8.6983,
    geojson: null,
    isFallback: true,
  },
  {
    id: 9002,
    name: "Preikestolen",
    beskrivelse:
      "Spektakulær fjellplatå 604 meter over Lysefjorden. En av Norges mest besøkte naturattraksjoner.",
    vanskelighet: "Middels",
    gradingRaw: 2,
    distanceKm: 8,
    omrade: "Rogaland",
    lat: 58.9866,
    lon: 6.1889,
    geojson: null,
    isFallback: true,
  },
  {
    id: 9003,
    name: "Galdhøpiggen",
    beskrivelse:
      "Norges høyeste fjell (2469 moh). Krever isøks og stigning, men gir en unik opplevelse.",
    vanskelighet: "Krevende",
    gradingRaw: 4,
    distanceKm: 18,
    omrade: "Jotunheimen",
    lat: 61.6365,
    lon: 8.3122,
    geojson: null,
    isFallback: true,
  },
  {
    id: 9004,
    name: "Romsdalseggen",
    beskrivelse:
      "Spektakulær eggevandring i Romsdalen med eventyrlig utsikt over Romsdalsfjorden og Romsdalshornet.",
    vanskelighet: "Krevende",
    gradingRaw: 3,
    distanceKm: 10,
    omrade: "Møre og Romsdal",
    lat: 62.3974,
    lon: 7.8397,
    geojson: null,
    isFallback: true,
  },
  {
    id: 9005,
    name: "Trolltunga",
    beskrivelse:
      "Den berømte klippetunga 700 meter over Ringedalsvatnet. En av Norges vakreste og mest dramatiske turer.",
    vanskelighet: "Krevende",
    gradingRaw: 3,
    distanceKm: 28,
    omrade: "Hardangervidda",
    lat: 60.1242,
    lon: 6.7397,
    geojson: null,
    isFallback: true,
  },
];

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
          imageUrl: node.media?.[0]?.uri
            ? `https://res.cloudinary.com/ntb/image/upload/w_800,h_400,c_fill/${node.media[0].uri}`
            : null,
          isFallback: false,
        };
      })
      .filter((route) => route.lat !== null && route.name);

    return Response.json({ routes });
  } catch {
    // S2: serve static fallback routes when DNT is unavailable
    return Response.json(
      { routes: FALLBACK_ROUTES, fallback: true },
      { status: 200 },
    );
  }
}
