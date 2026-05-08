import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PackingCategory {
  category: string;
  emoji: string;
  items: string[];
}

export interface PackingListResponse {
  categories: PackingCategory[];
  tips: string[];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    tripName,
    distanceKm,
    difficulty,
    participants,
    days,
    weather,
  }: {
    tripName: string;
    distanceKm: number | null;
    difficulty: string;
    participants: number;
    days: number;
    weather: {
      tempMin: number;
      tempMax: number;
      precipTotal: number;
      windMax: number;
      hasSnow: boolean;
    } | null;
  } = body;

  const weatherDesc = weather
    ? `Temperatur: ${weather.tempMin}–${weather.tempMax} °C. ` +
      `Nedbør: ${weather.precipTotal} mm totalt. ` +
      `Maks vind: ${weather.windMax} m/s. ` +
      (weather.hasSnow ? "Snø eller is forventet." : "Ingen snø forventet.")
    : "Værdata ikke tilgjengelig.";

  const prompt = `Du er en erfaren norsk turplanlegger. Generer en praktisk pakkeliste for følgende tur:

Tur: ${tripName}
Distanse: ${distanceKm ? `${distanceKm} km` : "ukjent"}
Vanskelighetsgrad: ${difficulty}
Antall deltakere: ${participants}
Antall dager: ${days}
Vær: ${weatherDesc}

Returner KUN gyldig JSON (ingen markdown, ingen forklaring) i dette formatet:
{
  "categories": [
    {
      "category": "Klær",
      "emoji": "🧥",
      "items": ["Regnjakke", "Ullundertøy", ...]
    },
    ...
  ],
  "tips": ["Kort praktisk tips 1", "Kort praktisk tips 2"]
}

Kategorier: Klær, Mat og drikke, Utstyr, Førstehjelp, Navigasjon.
Tilpass mengder til ${participants} person${participants > 1 ? "er" : ""} og ${days} dag${days > 1 ? "er" : ""}.
Vær konkret og norsk (f.eks. "Turbukse, 1 per person" ikke generiske lister).
Maks 7 items per kategori, maks 3 tips. Hold det kort og handlingsrettet.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any markdown fences Claude might add despite instructions
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed: PackingListResponse = JSON.parse(cleaned);

    return Response.json(parsed);
  } catch (err) {
    console.error("Packing list error:", err);
    return Response.json(
      { error: "Kunne ikke generere pakkeliste" },
      { status: 500 },
    );
  }
}
