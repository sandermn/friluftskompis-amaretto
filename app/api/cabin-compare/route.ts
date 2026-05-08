import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CabinSummary {
  id: number;
  name: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}

export interface CabinCompareResponse {
  overview: string;
  cabins: CabinSummary[];
  recommendation: string;
}

export interface CabinInput {
  id: number;
  name: string;
  serviceLevel: string;
  totalBeds: number;
  bedsWinter: number;
  elevationM: number | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    cabins,
    season,
  }: {
    cabins: CabinInput[];
    season: string;
  } = body;

  const SERVICE_LABELS: Record<string, string> = {
    STAFFED: "Betjent",
    SELF_SERVICE: "Selvbetjent",
    NO_SERVICE: "Ubetjent",
    NO_SERVICE_NO_BEDS: "Dagshytte",
    RENTAL: "Utleie",
  };

  const cabinList = cabins
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} — ${SERVICE_LABELS[c.serviceLevel] ?? c.serviceLevel}, ${c.totalBeds} senger totalt (${c.bedsWinter} vinterbred)${c.elevationM ? `, ${c.elevationM} moh` : ""}`,
    )
    .join("\n");

  const prompt = `Du er en erfaren norsk turplanlegger. Sammenlign disse DNT-hyttene og gi en kortfattet oversikt.

Sesong: ${season}
Hytter:
${cabinList}

Returner KUN gyldig JSON (ingen markdown):
{
  "overview": "1 setning som oppsummerer utvalget",
  "cabins": [
    {
      "id": <nummer fra listen>,
      "name": "<navn>",
      "pros": ["fordel 1", "fordel 2"],
      "cons": ["ulempe 1"],
      "bestFor": "kort beskrivelse av hvem passer best"
    }
  ],
  "recommendation": "1 setning — hvilken hytte anbefales og til hvem?"
}

Vær konkret og norsk. Maks 2 pros og 2 cons per hytte.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed: CabinCompareResponse = JSON.parse(cleaned);

    return Response.json(parsed);
  } catch (err) {
    console.error("Cabin compare error:", err);
    return Response.json(
      { error: "Kunne ikke sammenligne hytter" },
      { status: 500 },
    );
  }
}
