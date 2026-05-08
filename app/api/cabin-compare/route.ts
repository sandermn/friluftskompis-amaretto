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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    routes,
    season,
  }: {
    routes: Array<{
      id: number;
      name: string;
      distanceKm: number | null;
      difficulty: string;
      area: string | null;
      beskrivelse: string | null;
    }>;
    season: string;
  } = body;

  const routeList = routes
    .map(
      (r, i) =>
        `${i + 1}. ${r.name} (${r.area ?? "ukjent område"}) — ${r.distanceKm ?? "?"} km, ${r.difficulty}${r.beskrivelse ? `. ${r.beskrivelse.slice(0, 100)}` : ""}`,
    )
    .join("\n");

  const prompt = `Du er en erfaren norsk turplanlegger. Sammenlign disse turrutene og gi en kortfattet oversikt.

Sesong: ${season}
Ruter:
${routeList}

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
  "recommendation": "1 setning — hvem anbefales til hva?"
}

Vær konkret og norsk. Maks 2 pros og 2 cons per rute.`;

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
