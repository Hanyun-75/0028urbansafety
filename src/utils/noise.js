const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const TILESET_ID = (import.meta.env.VITE_MAPBOX_NOISE_TILESET || "").replace(
  "mapbox://",
  ""
);

// Map NoiseClass strings to midpoint dB values
const NOISE_CLASS_TO_DB = {
  "<45.0": 42.5,
  "45.0-49.9": 47.5,
  "50.0-54.9": 52.5,
  "55.0-59.9": 57.5,
  "60.0-64.9": 62.5,
  "65.0-69.9": 67.5,
  "70.0-74.9": 72.5,
  ">=75.0": 77.5,
};

async function queryNoiseAtPoint(lon, lat) {
  const url =
    `https://api.mapbox.com/v4/${TILESET_ID}/tilequery/${lon},${lat}.json` +
    `?radius=0&limit=1&access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return data.features?.[0]?.properties?.NoiseClass ?? null;
  } catch {
    return null;
  }
}

const NOISE_HIGH_THRESHOLD = 75; // dB — hearing damage risk threshold

export async function scoreRouteNoise(coords) {
  if (!MAPBOX_TOKEN || !TILESET_ID || !Array.isArray(coords) || coords.length === 0) {
    return {
      avgNoise: null,
      dangerPct: null,
      dataCoverage: 0,
      highNoisePoints: [],
    };
  }

  const STEP = 10;
  const sampleIndices = [];
  for (let i = 0; i < coords.length; i += STEP) sampleIndices.push(i);
  if ((coords.length - 1) % STEP !== 0) sampleIndices.push(coords.length - 1);

  const classes = await Promise.all(
    sampleIndices.map((idx) => queryNoiseAtPoint(coords[idx][0], coords[idx][1]))
  );

  const dbValues = classes.map((cls) =>
    cls ? (NOISE_CLASS_TO_DB[cls] ?? null) : null
  );

  const validValues = dbValues.filter((v) => v != null);

  const highNoisePoints = [];
  for (let s = 0; s < sampleIndices.length; s++) {
    if (dbValues[s] != null && dbValues[s] >= NOISE_HIGH_THRESHOLD) {
      highNoisePoints.push(coords[sampleIndices[s]]);
    }
  }

  if (validValues.length === 0) {
    return {
      avgNoise: null,
      dangerPct: null,
      dataCoverage: 0,
      highNoisePoints: [],
    };
  }

  const avgNoise = Number(
    (validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(1)
  );

  const dangerPct = Math.round(
    (validValues.filter((v) => v >= NOISE_HIGH_THRESHOLD).length / validValues.length) * 100
  );

  const dataCoverage = Math.round(
    (validValues.length / sampleIndices.length) * 100
  );

  return {
    avgNoise,
    dangerPct,
    dataCoverage,
    highNoisePoints,
  };
}