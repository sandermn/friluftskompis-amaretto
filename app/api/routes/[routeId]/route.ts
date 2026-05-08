import { NextRequest } from "next/server";

const DNT_GQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { routeId } = await params;
  const id = Number(routeId);

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid routeId" }, { status: 400 });
  }

  try {
    const res = await fetch(DNT_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://ut.no",
      },
      body: JSON.stringify({
        query: `{
          routes(filter: { ids: [${id}] }, paging: { first: 1 }) {
            edges { node { id geojson } }
          }
        }`,
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("DNT fetch failed");

    const json = await res.json();
    const node = json?.data?.routes?.edges?.[0]?.node;

    if (!node) {
      return Response.json({ geojson: null });
    }

    return Response.json({ geojson: node.geojson ?? null });
  } catch {
    return Response.json({ geojson: null });
  }
}
