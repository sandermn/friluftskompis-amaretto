import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (
    isNaN(latNum) || isNaN(lonNum) ||
    latNum < -90 || latNum > 90 ||
    lonNum < -180 || lonNum > 180
  ) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latNum.toFixed(4)}&lon=${lonNum.toFixed(4)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "friluftskompis/1.0 github.com/friluftskompis",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return Response.json({ error: "Yr API error" }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch weather" }, { status: 502 });
  }
}
