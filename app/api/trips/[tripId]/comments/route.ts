import { NextRequest } from "next/server";
import { db } from "../../../../lib/db";
import { comments } from "../../../../lib/schema";
import { and, eq, gt } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceId = sinceParam ? Number(sinceParam) : 0;

  const where = sinceId
    ? and(eq(comments.tripId, tripId), gt(comments.id, sinceId))
    : eq(comments.tripId, tripId);

  const rows = await db.query.comments.findMany({
    where,
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return Response.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const body = await req.json();
  const { authorName, body: commentBody } = body;

  if (!authorName?.trim() || !commentBody?.trim()) {
    return Response.json(
      { error: "Navn og kommentar er påkrevd" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(comments)
    .values({
      tripId,
      authorName: String(authorName).trim().slice(0, 40),
      body: String(commentBody).trim().slice(0, 500),
    })
    .returning();

  return Response.json(row, { status: 201 });
}
