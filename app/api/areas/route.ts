const DNT_GQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

export interface DntArea {
  id: number;
  name: string;
  centerLat: number;
  centerLon: number;
}

export async function GET() {
  const res = await fetch(DNT_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({
      query: `{
        areas(
          paging: { first: 200 }
          filter: { areaType: { eq: DNT_AREA } }
          sorting: [{ field: name, direction: ASC }]
        ) {
          edges {
            node {
              id
              name
              centerPointGeojson
            }
          }
        }
      }`,
    }),
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch areas" }, { status: 502 });
  }

  const data = await res.json();
  const areas: DntArea[] = (data?.data?.areas?.edges ?? [])
    .map((e: { node: { id: number; name: string; centerPointGeojson: { coordinates: [number, number] } } }) => ({
      id: e.node.id,
      name: e.node.name,
      centerLat: e.node.centerPointGeojson?.coordinates?.[1] ?? 0,
      centerLon: e.node.centerPointGeojson?.coordinates?.[0] ?? 0,
    }))
    .filter((a: DntArea) => a.name !== "Papirkart 1"); // exclude internal placeholder

  return Response.json(areas);
}
