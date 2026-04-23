let gridData = null;
let gridBounds = null;

export async function loadLAEIData() {
  if (gridData) return gridData;

  const res = await fetch("/data/laei2022_camden_compact.json");
  if (!res.ok) {
    throw new Error(`Failed to load LAEI 2022 data: ${res.status}`);
  }

  gridData = await res.json();

  // build simple bounds from Camden air points
  const lons = gridData.map((p) => p.lng);
  const lats = gridData.map((p) => p.lat);

  gridBounds = {
    minLng: Math.min(...lons),
    maxLng: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };

  return gridData;
}

function isWithinBounds(lon, lat, bounds) {
  if (!bounds) return false;
  return (
    lon >= bounds.minLng &&
    lon <= bounds.maxLng &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat
  );
}

// Haversine distance in metres
function distanceMeters(lon1, lat1, lon2, lat2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function findNearestGridPoint(lon, lat, points, maxDistanceMeters = 120) {
  let best = null;
  let bestDist = Infinity;

  for (const p of points) {
    const d = distanceMeters(lon, lat, p.lng, p.lat);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  // too far away -> treat as no data
  if (bestDist > maxDistanceMeters) return null;
  return best;
}

const NO2_HIGH_THRESHOLD = 40;  // μg/m³
const PM25_HIGH_THRESHOLD = 15; // μg/m³

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

    // quick reject: outside Camden air-data extent
    if (!isWithinBounds(lon, lat, gridBounds)) {
      isHigh.push(false);
      continue;
    }

    const nearest = findNearestGridPoint(lon, lat, gridData, 120);

    if (nearest) {
      const no2 = Number(nearest.no2);
      const pm25 = Number(nearest.pm25);

      if (Number.isFinite(no2) && Number.isFinite(pm25)) {
        no2Sum += no2;
        pm25Sum += pm25;
        matched += 1;
        isHigh.push(no2 > NO2_HIGH_THRESHOLD || pm25 > PM25_HIGH_THRESHOLD);
      } else {
        isHigh.push(false);
      }
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