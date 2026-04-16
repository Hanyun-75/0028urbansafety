let gridData = null;

export async function loadLAEIData() {
  if (gridData) return gridData;

  const res = await fetch("/data/laei2022_camden_compact.json");
  if (!res.ok) {
    throw new Error(`Failed to load LAEI 2022 data: ${res.status}`);
  }

  gridData = await res.json();
  return gridData;
}

function euclideanDistanceSquared(lon1, lat1, lon2, lat2) {
  const dx = lon1 - lon2;
  const dy = lat1 - lat2;
  return dx * dx + dy * dy;
}

function findNearestGridPoint(lon, lat, points) {
  let best = null;
  let bestDist = Infinity;

  for (const p of points) {
    const d = euclideanDistanceSquared(lon, lat, p.lng, p.lat);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;
}

const NO2_HIGH_THRESHOLD = 40;  // μg/m³ — EU/UK annual limit (Dir 2008/50/EC)
const PM25_HIGH_THRESHOLD = 15; // μg/m³ — WHO 2021 AQG 24-hour guideline

export function scoreRoute(coords) {
  if (!gridData || !Array.isArray(coords) || coords.length === 0) {
    return {
      avgNO2: null,
      avgPM25: null,
      dataCoverage: 0,
      highPollutionPoints: [],
    };
  }

  const STEP = 8;
  const sampleIndices = [];
  for (let i = 0; i < coords.length; i += STEP) sampleIndices.push(i);
  if ((coords.length - 1) % STEP !== 0) sampleIndices.push(coords.length - 1);

  let no2Sum = 0;
  let pm25Sum = 0;
  let matched = 0;
  const isHigh = [];

  for (const idx of sampleIndices) {
    const [lon, lat] = coords[idx];
    const nearest = findNearestGridPoint(lon, lat, gridData);
    if (nearest) {
      const no2 = Number(nearest.no2);
      const pm25 = Number(nearest.pm25);
      no2Sum += no2;
      pm25Sum += pm25;
      matched += 1;
      isHigh.push(no2 > NO2_HIGH_THRESHOLD || pm25 > PM25_HIGH_THRESHOLD);
    } else {
      isHigh.push(false);
    }
  }

  if (matched === 0) {
    return {
      avgNO2: null,
      avgPM25: null,
      dataCoverage: 0,
      highPollutionPoints: [],
    };
  }

  // Collect every sampled point that exceeds thresholds
  const highPollutionPoints = [];
  for (let s = 0; s < sampleIndices.length; s++) {
    if (isHigh[s]) highPollutionPoints.push(coords[sampleIndices[s]]);
  }

  return {
    avgNO2: Number((no2Sum / matched).toFixed(1)),
    avgPM25: Number((pm25Sum / matched).toFixed(1)),
    dataCoverage: Math.round((matched / sampleIndices.length) * 100),
    highPollutionPoints,
  };
}