import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RouteAssessmentResponse {
  verdict: "Realistisk" | "Krevende" | "Ikke anbefalt";
  emoji: "✅" | "⚠️" | "🔴";
  summary: string;
  tips: string[];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    routeName,
    distanceKm,
    difficulty,
    area,
    season,
    groupSize,
    experience,
  }: {
    routeName: string;
    distanceKm: number | null;
    difficulty: string;
    area: string | null;
    season: string;
    groupSize: number;
    experience: string;
  } = body;

  const prompt = `Du er en erfaren norsk turguide. Vurder om denne ruten er realistisk for gruppen.

Tur: ${routeName}
Område: ${area ?? "ukjent"}
Distanse: ${distanceKm ? `${distanceKm} km` : "ukjent"}
Vanskelighetsgrad: ${difficulty}
Sesong: ${season}
Gruppe: ${groupSize} person${groupSize > 1 ? "er" : ""}, erfaringsnivå: ${experience}

Returner KUN gyldig JSON (ingen markdown, ingen forklaring):
{
  "verdict": "Realistisk" | "Krevende" | "Ikke anbefalt",
  "emoji": "✅" | "⚠️" | "🔴",
  "summary": "1-2 setninger om vurderingen",
  "tips": ["Konkret råd 1", "Konkret råd 2"]
}

Vær ærlig men konstruktiv. Norsk språk. Maks 2 tips.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed: RouteAssessmentResponse = JSON.parse(cleaned);

    return Response.json(parsed);
  } catch (err) {
    console.error("Route assessment error:", err);
    return Response.json(
      { error: "Kunne ikke vurdere ruten" },
      { status: 500 },
    );
  }
}
