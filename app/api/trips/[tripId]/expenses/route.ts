import { NextRequest } from "next/server";
import { db } from "../../../../lib/db";
import { expenses, participants } from "../../../../lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const rows = await db.query.expenses.findMany({
    where: eq(expenses.tripId, tripId),
    orderBy: (e, { asc }) => [asc(e.createdAt)],
  });
  return Response.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const body = await req.json();
  const { paidBy, description, amountOre } = body;

  if (
    !paidBy?.trim() ||
    !description?.trim() ||
    typeof amountOre !== "number" ||
    amountOre <= 0
  ) {
    return Response.json({ error: "Ugyldig utlegg" }, { status: 400 });
  }

  const member = await db.query.participants.findFirst({
    where: eq(participants.tripId, tripId),
  });
  if (!member) {
    return Response.json(
      { error: "Ingen deltakere på turen" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(expenses)
    .values({
      tripId,
      paidBy: String(paidBy).trim().slice(0, 40),
      description: String(description).trim().slice(0, 100),
      amountOre: Math.round(amountOre),
    })
    .returning();

  return Response.json(row, { status: 201 });
}
