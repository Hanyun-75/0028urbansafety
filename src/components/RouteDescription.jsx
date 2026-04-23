function hasAirData(route) {
  return route?.avgNO2 != null && route?.avgPM25 != null;
}

function hasNoiseData(route) {
  return route?.avgNoise != null;
}

function getAirScore(route) {
  if (!hasAirData(route)) return Infinity;
  // Keep the same weighting logic as RouteCards
  return (route.avgNO2 ?? 50) * 0.6 + (route.avgPM25 ?? 10) * 0.4;
}

function round1(value) {
  return Number(Number(value).toFixed(1));
}

function getDisplayedMinutes(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null;
  return Math.round(Number(seconds) / 60);
}

const AIR_SIMILAR_NO2 = 1.0;
const AIR_SIMILAR_PM25 = 0.5;
const NOISE_SIMILAR_DB = 1.0;
const COVERAGE_UNCERTAIN_PCT = 50;
const DISTANCE_BURDEN_THRESHOLD_M = 150;

function getAirCoverage(route) {
  return route?.airCoverage ?? route?.dataCoverage ?? null;
}

function getNoiseCoverage(route) {
  return route?.noiseCoverage ?? null;
}

function hasLimitedCoverage(coverage) {
  return (
    coverage != null &&
    Number.isFinite(Number(coverage)) &&
    Number(coverage) < COVERAGE_UNCERTAIN_PCT
  );
}

/* ---------- Time helpers ---------- */

function getTimeState(route, routes) {
  const displayedDurations = routes
    .map((r) => getDisplayedMinutes(r.duration))
    .filter((v) => v != null);

  const currentMin = getDisplayedMinutes(route?.duration);

  if (currentMin == null || displayedDurations.length < 2) {
    return { comparable: false };
  }

  const bestMin = Math.min(...displayedDurations);
  const bestCount = displayedDurations.filter((v) => v === bestMin).length;
  const allSame = bestCount === displayedDurations.length;
  const diffMin = currentMin - bestMin;

  return {
    comparable: true,
    currentMin,
    bestMin,
    bestCount,
    allSame,
    diffMin,
    uniqueFastest: diffMin === 0 && bestCount === 1,
    tiedFastest: diffMin === 0 && bestCount > 1 && !allSame,
    slower: diffMin > 0,
  };
}

/* ---------- Noise helpers ---------- */

function getTripNoiseInfo(routes) {
  const validRoutes = routes.filter((r) => hasNoiseData(r));

  if (validRoutes.length < 2) {
    return {
      comparable: false,
      allSimilar: false,
      bestNoise: null,
      quietestGroupSize: 0,
      hasNoisierRoute: false,
    };
  }

  const values = validRoutes.map((r) => r.avgNoise);
  const bestNoise = Math.min(...values);
  const worstNoise = Math.max(...values);
  const noiseSpread = worstNoise - bestNoise;
  const allSimilar = noiseSpread <= NOISE_SIMILAR_DB;

  const quietestGroupMembers = validRoutes.filter(
    (r) => r.avgNoise - bestNoise <= NOISE_SIMILAR_DB
  );

  return {
    comparable: true,
    allSimilar,
    bestNoise,
    quietestGroupSize: quietestGroupMembers.length,
    hasNoisierRoute: validRoutes.length > quietestGroupMembers.length,
  };
}

function getRouteNoiseState(route, routes) {
  const tripNoise = getTripNoiseInfo(routes);

  if (!tripNoise.comparable || !hasNoiseData(route)) {
    return {
      comparable: false,
      allSimilar: false,
      uniqueQuietest: false,
      tiedQuietest: false,
      diffFromBest: null,
    };
  }

  const inQuietestGroup = route.avgNoise - tripNoise.bestNoise <= NOISE_SIMILAR_DB;

  return {
    comparable: true,
    allSimilar: tripNoise.allSimilar,
    uniqueQuietest:
      !tripNoise.allSimilar &&
      inQuietestGroup &&
      tripNoise.quietestGroupSize === 1 &&
      tripNoise.hasNoisierRoute,
    tiedQuietest:
      !tripNoise.allSimilar &&
      inQuietestGroup &&
      tripNoise.quietestGroupSize > 1 &&
      tripNoise.hasNoisierRoute,
    diffFromBest: round1(route.avgNoise - tripNoise.bestNoise),
  };
}

/* ---------- Air helpers ---------- */

function getTripAirInfo(routes) {
  const validRoutes = routes.filter((r) => hasAirData(r));

  if (validRoutes.length < 2) {
    return {
      comparable: false,
      allSimilar: false,
      cleanestRoute: null,
      cleanestGroupSize: 0,
      hasMorePollutedRoute: false,
    };
  }

  const no2Values = validRoutes.map((r) => r.avgNO2);
  const pm25Values = validRoutes.map((r) => r.avgPM25);

  const no2Spread = Math.max(...no2Values) - Math.min(...no2Values);
  const pm25Spread = Math.max(...pm25Values) - Math.min(...pm25Values);

  const allSimilar =
    no2Spread <= AIR_SIMILAR_NO2 && pm25Spread <= AIR_SIMILAR_PM25;

  const cleanestRoute = [...validRoutes].sort(
    (a, b) => getAirScore(a) - getAirScore(b)
  )[0];

  const cleanestGroupMembers = validRoutes.filter(
    (r) =>
      Math.abs(r.avgNO2 - cleanestRoute.avgNO2) <= AIR_SIMILAR_NO2 &&
      Math.abs(r.avgPM25 - cleanestRoute.avgPM25) <= AIR_SIMILAR_PM25
  );

  return {
    comparable: true,
    allSimilar,
    cleanestRoute,
    cleanestGroupSize: cleanestGroupMembers.length,
    hasMorePollutedRoute: validRoutes.length > cleanestGroupMembers.length,
  };
}

function getRouteAirState(route, routes) {
  const tripAir = getTripAirInfo(routes);

  if (!tripAir.comparable || !hasAirData(route)) {
    return {
      comparable: false,
      allSimilar: false,
      uniqueCleanest: false,
      tiedCleanest: false,
      no2Diff: null,
      pm25Diff: null,
      scoreDiff: null,
    };
  }

  const inCleanestGroup =
    Math.abs(route.avgNO2 - tripAir.cleanestRoute.avgNO2) <= AIR_SIMILAR_NO2 &&
    Math.abs(route.avgPM25 - tripAir.cleanestRoute.avgPM25) <= AIR_SIMILAR_PM25;

  return {
    comparable: true,
    allSimilar: tripAir.allSimilar,
    uniqueCleanest:
      !tripAir.allSimilar &&
      inCleanestGroup &&
      tripAir.cleanestGroupSize === 1 &&
      tripAir.hasMorePollutedRoute,
    tiedCleanest:
      !tripAir.allSimilar &&
      inCleanestGroup &&
      tripAir.cleanestGroupSize > 1 &&
      tripAir.hasMorePollutedRoute,
    no2Diff: round1(route.avgNO2 - tripAir.cleanestRoute.avgNO2),
    pm25Diff: round1(route.avgPM25 - tripAir.cleanestRoute.avgPM25),
    scoreDiff: Math.abs(getAirScore(route) - getAirScore(tripAir.cleanestRoute)),
  };
}

/* ---------- Distance exception ---------- */

function buildDistanceSentence(route, routes) {
  if (route?.distance == null || routes.length < 2) return null;

  const timeState = getTimeState(route, routes);
  if (!timeState.comparable || timeState.currentMin !== timeState.bestMin) {
    return null;
  }

  const sameTimeRoutes = routes.filter(
    (r) =>
      r?.distance != null &&
      getDisplayedMinutes(r.duration) === timeState.currentMin
  );

  if (sameTimeRoutes.length < 2) return null;

  const shortestDistance = Math.min(...sameTimeRoutes.map((r) => r.distance));
  const longestDistance = Math.max(...sameTimeRoutes.map((r) => r.distance));

  if (route.distance - shortestDistance >= DISTANCE_BURDEN_THRESHOLD_M) {
    return {
      key: "distance",
      severity: route.distance - shortestDistance,
      text: "It is a longer walk despite a similar walking time.",
    };
  }

  if (longestDistance - route.distance >= DISTANCE_BURDEN_THRESHOLD_M) {
    return {
      key: "distance",
      severity: longestDistance - route.distance,
      text: "It is a shorter walk despite a similar walking time.",
    };
  }

  return null;
}

/* ---------- Sentence builders ---------- */

function buildTimeSentence(route, routes) {
  const timeState = getTimeState(route, routes);
  if (!timeState.comparable) return null;

  // Global "all same" belongs to banner, not per-route description
  if (timeState.allSame) return null;

  if (timeState.uniqueFastest) {
    return {
      key: "time",
      severity: 0.5,
      text: "Fastest route.",
    };
  }

  if (timeState.tiedFastest) {
    return {
      key: "time",
      severity: 0,
      text: "Tied for the fastest walking time.",
    };
  }

  if (timeState.slower) {
    return {
      key: "time",
      severity: timeState.diffMin,
      text: `${timeState.diffMin} min slower than the fastest route.`,
    };
  }

  return null;
}

function buildNoiseSentence(route, routes) {
  const routeCoverage = getNoiseCoverage(route);

  if (!hasNoiseData(route)) return null;

  const noiseState = getRouteNoiseState(route, routes);
  if (!noiseState.comparable) return null;

  if (hasLimitedCoverage(routeCoverage)) {
    return {
      key: "noise",
      severity: -1,
      text: "Noise coverage is limited on this route, so this comparison is less certain.",
    };
  }

  // Trip-level similarity belongs to banner
  if (noiseState.allSimilar) return null;

  if (noiseState.uniqueQuietest) {
    return {
      key: "noise",
      severity: 0.5,
      text: "Quietest option among the available routes.",
    };
  }

  if (noiseState.tiedQuietest) {
    return {
      key: "noise",
      severity: 0,
      text: "Among the quietest options.",
    };
  }

  if (noiseState.diffFromBest == null) return null;

  return {
    key: "noise",
    severity: noiseState.diffFromBest,
    text: `Noisier than the quietest option (+${noiseState.diffFromBest.toFixed(
      1
    )} dB).`,
  };
}

function formatPollutantPart(label, diff) {
  const absDiff = Math.abs(round1(diff)).toFixed(1);
  const direction = diff > 0 ? "higher" : "lower";
  return `${label} is ${absDiff} μg/m³ ${direction}`;
}

function joinParts(parts) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function buildAirSentence(route, routes) {
  const routeCoverage = getAirCoverage(route);

  if (!hasAirData(route)) return null;

  const airState = getRouteAirState(route, routes);
  if (!airState.comparable) return null;

  if (hasLimitedCoverage(routeCoverage)) {
    return {
      key: "air",
      severity: -1,
      text: "Air-quality coverage is limited on this route, so this comparison is less certain.",
    };
  }

  // Trip-level similarity belongs to banner
  if (airState.allSimilar) return null;

  if (airState.uniqueCleanest) {
    return {
      key: "air",
      severity: 0.5,
      text: "Cleanest air among the available routes.",
    };
  }

  if (airState.tiedCleanest) {
    return {
      key: "air",
      severity: 0,
      text: "Among the cleanest options.",
    };
  }

  const parts = [];

  if (airState.no2Diff != null && Math.abs(airState.no2Diff) >= 0.05) {
    parts.push(formatPollutantPart("NO₂", airState.no2Diff));
  }

  if (airState.pm25Diff != null && Math.abs(airState.pm25Diff) >= 0.05) {
    parts.push(formatPollutantPart("PM2.5", airState.pm25Diff));
  }

  if (parts.length === 0) return null;

  return {
    key: "air",
    severity: airState.scoreDiff ?? 0,
    text: `Compared with the cleanest option, ${joinParts(parts)}.`,
  };
}

function orderSentences(
  filterMode,
  timeSentence,
  distanceSentence,
  airSentence,
  noiseSentence
) {
  if (filterMode === "air") {
    return [airSentence, noiseSentence, timeSentence, distanceSentence].filter(Boolean);
  }

  if (filterMode === "noise") {
    return [noiseSentence, airSentence, timeSentence, distanceSentence].filter(Boolean);
  }

  const envSentences = [airSentence, noiseSentence]
    .filter(Boolean)
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

  return [...envSentences, timeSentence, distanceSentence].filter(Boolean);
}

function buildDescription(route, routes, filterMode) {
  if (!Array.isArray(routes) || routes.length < 2) {
    return null;
  }

  const timeSentence = buildTimeSentence(route, routes);
  const distanceSentence = buildDistanceSentence(route, routes);
  const airSentence = buildAirSentence(route, routes);
  const noiseSentence = buildNoiseSentence(route, routes);

  const ordered = orderSentences(
    filterMode || "overall",
    timeSentence,
    distanceSentence,
    airSentence,
    noiseSentence
  );

  if (!ordered.length) return null;

  return ordered.map((item) => item.text).join(" ");
}

export default function RouteDescription({ route, routes, filterMode }) {
  const text = buildDescription(route, routes, filterMode || "overall");
  if (!text) return null;

  return (
    <p
      style={{
        fontSize: 12,
        color: "#64748b",
        margin: "10px 0 0 0",
        paddingTop: 10,
        borderTop: "1px solid #f1f5f9",
        lineHeight: 1.6,
      }}
    >
      {text}
    </p>
  );
}