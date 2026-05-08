const DNT_GQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const FIELDS = `
  id
  name
  serviceLevel
  geojson
  bedsStaffed
  bedsSelfService
  bedsNoService
  bedsWinter
  elevationCustom
  areaIds
`;

async function fetchPage(after?: string) {
  const paging = after
    ? `paging: { first: 1000, after: "${after}" }`
    : `paging: { first: 1000 }`;

  const res = await fetch(DNT_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://ut.no",
    },
    body: JSON.stringify({
      query: `{ cabins(${paging}) { edges { node { ${FIELDS} } } pageInfo { hasNextPage endCursor } } }`,
    }),
  });

  if (!res.ok) throw new Error("DNT fetch failed");
  return res.json();
}

export async function GET() {
  try {
    const page1 = await fetchPage();
    const edges = [...page1.data.cabins.edges];
    const { hasNextPage, endCursor } = page1.data.cabins.pageInfo;

    if (hasNextPage && endCursor) {
      const page2 = await fetchPage(endCursor);
      edges.push(...page2.data.cabins.edges);
    }

    return Response.json({ data: { cabins: { edges } } });
  } catch {
    return Response.json({ error: "Failed to fetch cabins" }, { status: 502 });
  }
}
