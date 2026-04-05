const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const TILESET_ID = (import.meta.env.VITE_MAPBOX_NOISE_TILESET || "").replace(
  "mapbox://",
  ""
);

// Map NoiseClass strings to midpoint dB values
const NOISE_CLASS_TO_DB = {
  "<45.0":    42.5,
  "45.0-49.9":47.5,
  "50.0-54.9":52.5,
  "55.0-59.9":57.5,
  "60.0-64.9":62.5,
  "65.0-69.9":67.5,
  "70.0-74.9":72.5,
  ">=75.0":   77.5,
};

async function queryNoiseAtPoint(lon, lat) {
  const url =
    `https://api.mapbox.com/v4/${TILESET_ID}/tilequery/${lon},${lat}.json` +
    `?radius=50&limit=1&access_token=${MAPBOX_TOKEN}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.properties?.NoiseClass ?? null;
  } catch {
    return null;
  }
}

export async function scoreRouteNoise(coords) {
  if (!MAPBOX_TOKEN || !TILESET_ID || !Array.isArray(coords) || coords.length === 0) {
    return null;
  }

  // Sample every 10th point to limit API calls (~20 requests per route)
  const sampled = coords.filter(
    (_, i) => i % 10 === 0 || i === coords.length - 1
  );

  const classes = await Promise.all(
    sampled.map(([lon, lat]) => queryNoiseAtPoint(lon, lat))
  );

  const values = classes
    .filter(Boolean)
    .map((cls) => NOISE_CLASS_TO_DB[cls])
    .filter((v) => v != null);

  if (values.length === 0) return null;

  const avgNoise = Number(
    (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
  );
  const dangerPct = Math.round(
    (values.filter((v) => v >= 75).length / values.length) * 100
  );

  return { avgNoise, dangerPct };
}
