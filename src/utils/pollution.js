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

export function scoreRoute(coords) {
  if (!gridData || !Array.isArray(coords) || coords.length === 0) {
    return {
      avgNO2: null,
      avgPM25: null,
      dataCoverage: 0,
    };
  }

  const sampledCoords = coords.filter(
    (_, idx) => idx % 8 === 0 || idx === coords.length - 1
  );

  let no2Sum = 0;
  let pm25Sum = 0;
  let matched = 0;

  for (const coord of sampledCoords) {
    const [lon, lat] = coord;
    const nearest = findNearestGridPoint(lon, lat, gridData);

    if (nearest) {
      no2Sum += Number(nearest.no2);
      pm25Sum += Number(nearest.pm25);
      matched += 1;
    }
  }

  if (matched === 0) {
    return {
      avgNO2: null,
      avgPM25: null,
      dataCoverage: 0,
    };
  }

  return {
    avgNO2: Number((no2Sum / matched).toFixed(1)),
    avgPM25: Number((pm25Sum / matched).toFixed(1)),
    dataCoverage: Math.round((matched / sampledCoords.length) * 100),
  };
}