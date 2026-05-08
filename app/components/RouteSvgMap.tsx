interface Geojson {
  type: string;
  coordinates: unknown;
}

interface Props {
  geojson: Geojson;
  width?: number;
  height?: number;
}

function mercatorY(lat: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + r / 2));
}

function extractCoords(geojson: Geojson): [number, number][] {
  if (geojson.type === "LineString") {
    return (geojson.coordinates as number[][]).map(
      ([lon, lat]) => [lon, lat] as [number, number],
    );
  }
  if (geojson.type === "MultiLineString") {
    return (geojson.coordinates as number[][][]).flatMap((line) =>
      line.map(([lon, lat]) => [lon, lat] as [number, number]),
    );
  }
  return [];
}

export default function RouteSvgMap({
  geojson,
  width = 600,
  height = 300,
}: Props) {
  const coords = extractCoords(geojson);
  if (coords.length < 2) return null;

  const lons = coords.map(([lon]) => lon);
  const lats = coords.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const minY = mercatorY(minLat);
  const maxY = mercatorY(maxLat);

  const pad = 20;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  function project([lon, lat]: [number, number]): [number, number] {
    const x = pad + ((lon - minLon) / (maxLon - minLon || 1)) * innerW;
    const y =
      pad + innerH - ((mercatorY(lat) - minY) / (maxY - minY || 1)) * innerH;
    return [x, y];
  }

  // Build polyline points string, split at segment boundaries for MultiLineString
  const segments: [number, number][][] = [];
  if (geojson.type === "LineString") {
    segments.push(
      (geojson.coordinates as number[][]).map(
        ([lon, lat]) => [lon, lat] as [number, number],
      ),
    );
  } else if (geojson.type === "MultiLineString") {
    for (const line of geojson.coordinates as number[][][]) {
      segments.push(line.map(([lon, lat]) => [lon, lat] as [number, number]));
    }
  }

  const start = project(coords[0]);
  const end = project(coords[coords.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#f0fdf4", borderRadius: 8 }}
    >
      {segments.map((seg, si) => {
        const points = seg
          .map((c) => project(c as [number, number]).join(","))
          .join(" ");
        return (
          <polyline
            key={si}
            points={points}
            fill="none"
            stroke="#16a34a"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
      {/* Start marker */}
      <circle
        cx={start[0]}
        cy={start[1]}
        r={6}
        fill="#16a34a"
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={start[0] + 9}
        y={start[1] + 4}
        fontSize={11}
        fill="#166534"
        fontFamily="sans-serif"
      >
        Start
      </text>
      {/* End marker */}
      <circle
        cx={end[0]}
        cy={end[1]}
        r={6}
        fill="#dc2626"
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={end[0] + 9}
        y={end[1] + 4}
        fontSize={11}
        fill="#991b1b"
        fontFamily="sans-serif"
      >
        Slutt
      </text>
    </svg>
  );
}
