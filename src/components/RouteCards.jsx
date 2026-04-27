import { useState, useMemo, useEffect } from "react";
import { ROUTE_COLORS } from "../utils/routeColors";
import RouteDescription from "./RouteDescription";

function formatDistance(meters) {
  if (meters == null) return "N/A";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (seconds == null) return "N/A";
  return `${Math.round(seconds / 60)} min`;
}

function formatOneDecimal(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  return Number(value).toFixed(1);
}

function formatPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  return `${Math.round(Number(value))}%`;
}

function hasAirData(route) {
  return route?.avgNO2 != null && route?.avgPM25 != null;
}

function hasNoiseData(route) {
  return route?.avgNoise != null;
}

function hasAnyEnvironmentalData(route) {
  return hasAirData(route) || hasNoiseData(route);
}

function getAirScore(route) {
  if (!hasAirData(route)) return Infinity;
  return (route.avgNO2 ?? 50) * 0.6 + (route.avgPM25 ?? 10) * 0.4;
}

/* ---------- Coverage helpers ---------- */

const COVERAGE_UNCERTAIN_PCT = 50;

function getAirCoverage(route) {
  return route?.airCoverage ?? route?.dataCoverage ?? null;
}

function getNoiseCoverage(route) {
  return route?.noiseCoverage ?? null;
}

function hasReliableTagCoverage(coverage) {
  if (coverage == null || !Number.isFinite(Number(coverage))) return true;
  return Number(coverage) >= COVERAGE_UNCERTAIN_PCT;
}

function hasReliableAirForTag(route) {
  return hasAirData(route) && hasReliableTagCoverage(getAirCoverage(route));
}

function hasReliableNoiseForTag(route) {
  return hasNoiseData(route) && hasReliableTagCoverage(getNoiseCoverage(route));
}

/* ---------- Trip-level data state ---------- */

function tripHasAnyAirData(routes) {
  return routes.some((route) => hasAirData(route));
}

function tripHasAnyNoiseData(routes) {
  return routes.some((route) => hasNoiseData(route));
}

function tripHasComparableAirData(routes) {
  return routes.filter((route) => hasAirData(route)).length >= 2;
}

function tripHasComparableNoiseData(routes) {
  return routes.filter((route) => hasNoiseData(route)).length >= 2;
}

/* ---------- Thresholds ---------- */

const SHORT_WALK_CLOSE_M = 30;
const NOISE_SIMILAR_DB = 1.0;
const NOISE_ADVANTAGE_DB = 0.5;
const AIR_SIMILAR_NO2 = 1.0;
const AIR_SIMILAR_PM25 = 0.5;
const AIR_ADVANTAGE_SCORE = 0.25;

/* ---------- Shared display helpers ---------- */

function getDisplayedDistanceValue(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return null;
  const value = Number(meters);

  if (value >= 1000) {
    return Math.round(value / 100) * 100;
  }

  return Math.round(value);
}

function getDisplayedMinutes(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null;
  return Math.round(Number(seconds) / 60);
}

/* ---------- Walk-group logic ---------- */

function isInShortestWalkGroup(route, routes) {
  if (!route || route.distance == null) return false;

  const validRoutes = routes.filter((r) => r?.distance != null);
  if (!validRoutes.length) return false;

  const bestDistance = Math.min(...validRoutes.map((r) => r.distance));

  if (bestDistance < 1000) {
    return route.distance - bestDistance <= SHORT_WALK_CLOSE_M;
  }

  const bestDisplayed = Math.min(
    ...validRoutes.map((r) => getDisplayedDistanceValue(r.distance))
  );
  const currentDisplayed = getDisplayedDistanceValue(route.distance);

  return currentDisplayed === bestDisplayed;
}

function getTripWalkInfo(routes) {
  const validRoutes = routes.filter((r) => r?.distance != null);

  if (!validRoutes.length) {
    return {
      hasWalkData: false,
      hasComparableWalkData: false,
      shortestGroupSize: 0,
      allSimilar: false,
      hasLongerRoute: false,
    };
  }

  const shortestGroupMembers = validRoutes.filter((r) =>
    isInShortestWalkGroup(r, validRoutes)
  );

  const shortestGroupSize = shortestGroupMembers.length;
  const hasComparableWalkData = validRoutes.length >= 2;
  const allSimilar =
    hasComparableWalkData && shortestGroupSize === validRoutes.length;
  const hasLongerRoute = validRoutes.length > shortestGroupSize;

  return {
    hasWalkData: true,
    hasComparableWalkData,
    shortestGroupSize,
    allSimilar,
    hasLongerRoute,
  };
}

function getWalkTagState(route, routes) {
  const walkInfo = getTripWalkInfo(routes);

  if (!walkInfo.hasComparableWalkData || walkInfo.allSimilar) return null;

  const inShortestGroup = isInShortestWalkGroup(route, routes);
  if (!inShortestGroup) return null;

  if (walkInfo.shortestGroupSize === 1) return "shorter";
  if (walkInfo.shortestGroupSize > 1 && walkInfo.hasLongerRoute) return "similar";

  return null;
}

/* ---------- Time-group logic ---------- */

function getTripTimeInfo(routes) {
  const displayedDurations = routes
    .map((r) => getDisplayedMinutes(r.duration))
    .filter((v) => v != null);

  if (displayedDurations.length < 2 || displayedDurations.length !== routes.length) {
    return {
      hasTimeData: false,
      allSame: false,
      fastestMinute: null,
    };
  }

  const fastestMinute = Math.min(...displayedDurations);
  const allSame = displayedDurations.every((v) => v === fastestMinute);

  return {
    hasTimeData: true,
    allSame,
    fastestMinute,
  };
}

/* ---------- Noise-group logic ---------- */
/* For tags/banner, use only routes with reliable coverage */

function getTripNoiseInfo(routes) {
  const validRoutes = routes.filter((r) => hasReliableNoiseForTag(r));
  const hasAnyNoiseData = routes.some((r) => hasNoiseData(r));
  const hasComparableNoiseData = validRoutes.length >= 2;

  if (!hasAnyNoiseData) {
    return {
      hasAnyNoiseData: false,
      hasComparableNoiseData: false,
      allSimilar: false,
      bestNoise: null,
      noiseSpread: null,
      quietestGroupSize: 0,
      hasNoisierRoute: false,
    };
  }

  if (!hasComparableNoiseData) {
    return {
      hasAnyNoiseData: true,
      hasComparableNoiseData: false,
      allSimilar: false,
      bestNoise: validRoutes.length ? validRoutes[0].avgNoise : null,
      noiseSpread: null,
      quietestGroupSize: validRoutes.length ? 1 : 0,
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

  const quietestGroupSize = quietestGroupMembers.length;
  const hasNoisierRoute = validRoutes.length > quietestGroupSize;

  return {
    hasAnyNoiseData: true,
    hasComparableNoiseData: true,
    allSimilar,
    bestNoise,
    noiseSpread,
    quietestGroupSize,
    hasNoisierRoute,
  };
}

function getRouteNoiseState(route, routes) {
  const tripNoise = getTripNoiseInfo(routes);

  if (
    !tripNoise.hasComparableNoiseData ||
    !hasReliableNoiseForTag(route) ||
    tripNoise.bestNoise == null
  ) {
    return {
      ...tripNoise,
      uniqueQuietest: false,
      tiedQuietest: false,
      diffFromBest: null,
    };
  }

  const inQuietestGroup = route.avgNoise - tripNoise.bestNoise <= NOISE_SIMILAR_DB;

  return {
    ...tripNoise,
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
    diffFromBest: Number((route.avgNoise - tripNoise.bestNoise).toFixed(1)),
  };
}

/* ---------- Air-group logic ---------- */
/* For tags/banner, use only routes with reliable coverage */

function getTripAirInfo(routes) {
  const validRoutes = routes.filter((r) => hasReliableAirForTag(r));
  const hasAnyAirData = routes.some((r) => hasAirData(r));
  const hasComparableAirData = validRoutes.length >= 2;

  if (!hasAnyAirData) {
    return {
      hasAnyAirData: false,
      hasComparableAirData: false,
      allSimilar: false,
      no2Spread: null,
      pm25Spread: null,
      cleanestRoute: null,
      cleanestGroupSize: 0,
      hasMorePollutedRoute: false,
    };
  }

  if (!hasComparableAirData) {
    return {
      hasAnyAirData: true,
      hasComparableAirData: false,
      allSimilar: false,
      no2Spread: null,
      pm25Spread: null,
      cleanestRoute: validRoutes.length ? validRoutes[0] : null,
      cleanestGroupSize: validRoutes.length ? 1 : 0,
      hasMorePollutedRoute: false,
    };
  }

  const no2Values = validRoutes.map((r) => r.avgNO2);
  const pm25Values = validRoutes.map((r) => r.avgPM25);

  const no2Spread = Math.max(...no2Values) - Math.min(...no2Values);
  const pm25Spread = Math.max(...pm25Values) - Math.min(...pm25Values);

  const allSimilar =
    no2Spread <= AIR_SIMILAR_NO2 &&
    pm25Spread <= AIR_SIMILAR_PM25;

  const cleanestRoute = [...validRoutes].sort(
    (a, b) => getAirScore(a) - getAirScore(b)
  )[0];

  const cleanestGroupMembers = validRoutes.filter(
    (r) =>
      Math.abs(r.avgNO2 - cleanestRoute.avgNO2) <= AIR_SIMILAR_NO2 &&
      Math.abs(r.avgPM25 - cleanestRoute.avgPM25) <= AIR_SIMILAR_PM25
  );

  const cleanestGroupSize = cleanestGroupMembers.length;
  const hasMorePollutedRoute = validRoutes.length > cleanestGroupSize;

  return {
    hasAnyAirData: true,
    hasComparableAirData: true,
    allSimilar,
    no2Spread,
    pm25Spread,
    cleanestRoute,
    cleanestGroupSize,
    hasMorePollutedRoute,
  };
}

function getRouteAirState(route, routes) {
  const tripAir = getTripAirInfo(routes);

  if (
    !tripAir.hasComparableAirData ||
    !hasReliableAirForTag(route) ||
    !tripAir.cleanestRoute
  ) {
    return {
      ...tripAir,
      uniqueCleanest: false,
      tiedCleanest: false,
    };
  }

  const inCleanestGroup =
    Math.abs(route.avgNO2 - tripAir.cleanestRoute.avgNO2) <= AIR_SIMILAR_NO2 &&
    Math.abs(route.avgPM25 - tripAir.cleanestRoute.avgPM25) <= AIR_SIMILAR_PM25;

  return {
    ...tripAir,
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
  };
}

function getRankLevel(value, field, routes) {
  if (value == null) return null;
  const vals = routes.map((r) => r[field]).filter((v) => v != null);
  if (vals.length <= 1) return { bars: 1, color: "#16a34a" };

  const sorted = [...vals].sort((a, b) => a - b);
  const rank = sorted.indexOf(value);

  if (vals.length === 2) {
    return rank === 0
      ? { bars: 1, color: "#16a34a" }
      : { bars: 3, color: "#dc2626" };
  }

  if (rank === 0) return { bars: 1, color: "#16a34a" };
  if (rank === sorted.length - 1) return { bars: 3, color: "#dc2626" };
  return { bars: 2, color: "#f59e0b" };
}

function LevelBars({ level }) {
  if (!level) return null;
  const { bars, color } = level;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        gap: 2,
        verticalAlign: "middle",
      }}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 4,
            height: 6 + (i - 1) * 4,
            borderRadius: 1,
            background: i <= bars ? color : "#e2e8f0",
          }}
        />
      ))}
    </span>
  );
}

function computeScore(route, sortBy, routes) {
  if (sortBy === "noise") {
    return hasNoiseData(route) ? route.avgNoise : Infinity;
  }

  if (sortBy === "air") {
    return hasAirData(route) ? getAirScore(route) : Infinity;
  }

  if (sortBy === "overall" && routes) {
    const comparableAir = tripHasComparableAirData(routes);
    const comparableNoise = tripHasComparableNoiseData(routes);

    if (!comparableAir && !comparableNoise) return Infinity;

    if (comparableAir && !hasAirData(route)) return Infinity;
    if (comparableNoise && !hasNoiseData(route)) return Infinity;

    const airScores = routes
      .filter((r) => hasAirData(r))
      .map((r) => getAirScore(r));

    const noiseVals = routes
      .filter((r) => hasNoiseData(r))
      .map((r) => r.avgNoise);

    const currentAirScore = hasAirData(route) ? getAirScore(route) : null;

    const airMin = airScores.length ? Math.min(...airScores) : null;
    const airMax = airScores.length ? Math.max(...airScores) : null;
    const noiseMin = noiseVals.length ? Math.min(...noiseVals) : null;
    const noiseMax = noiseVals.length ? Math.max(...noiseVals) : null;

    const airNorm =
      comparableAir &&
      currentAirScore != null &&
      airMin != null &&
      airMax != null &&
      airMax > airMin
        ? (currentAirScore - airMin) / (airMax - airMin)
        : 0;

    const noiseNorm =
      comparableNoise &&
      route.avgNoise != null &&
      noiseMin != null &&
      noiseMax != null &&
      noiseMax > noiseMin
        ? (route.avgNoise - noiseMin) / (noiseMax - noiseMin)
        : 0;

    if (comparableAir && comparableNoise) {
      return airNorm * 0.5 + noiseNorm * 0.5;
    }

    if (comparableAir && !comparableNoise) {
      return airNorm;
    }

    if (!comparableAir && comparableNoise) {
      return noiseNorm;
    }

    return Infinity;
  }

  return 0;
}

function getSortLabel(sortBy) {
  if (sortBy === "air") return "Air quality";
  if (sortBy === "noise") return "Noise";
  if (sortBy === "overall") return "Balanced";
  return "Balanced";
}

/* ---------- Metric helpers ---------- */

function getMetricValue(route, metric, routes) {
  if (metric === "air") {
    return hasAirData(route) ? computeScore(route, "air", routes) : Infinity;
  }
  if (metric === "noise") {
    return hasNoiseData(route) ? route.avgNoise : Infinity;
  }
  if (metric === "distance") {
    return route.distance ?? Infinity;
  }
  if (metric === "duration") {
    return route.duration ?? Infinity;
  }
  if (metric === "overall") {
    return hasAnyEnvironmentalData(route)
      ? computeScore(route, "overall", routes)
      : Infinity;
  }
  return Infinity;
}

function getMetricSpread(metric, routes) {
  const values = routes
    .map((r) => getMetricValue(r, metric, routes))
    .filter((v) => Number.isFinite(v));

  if (values.length < 2) return null;
  return Math.max(...values) - Math.min(...values);
}

/* ---------- Tag label helpers ---------- */

function getStrongPrimaryLabel(metric) {
  if (metric === "air") return "Cleaner";
  if (metric === "noise") return "Quieter";
  if (metric === "distance") return "Shorter walk";
  if (metric === "overall") return "More balanced";
  return null;
}

function getWeakPrimaryLabel(metric) {
  if (metric === "air") return "Lower pollution";
  if (metric === "noise") return "Lower noise";
  return null;
}

function getSoftPrimaryLabel(metric) {
  if (metric === "air") return "Similar air";
  if (metric === "noise") return "Similar noise";
  if (metric === "distance") return "Similar walk";
  return null;
}

function getSecondaryMetricLabel(metric) {
  if (metric === "air") return "Lower pollution";
  if (metric === "noise") return "Lower noise";
  if (metric === "distance") return "Shorter walk";
  return null;
}

function getSimilarityLabel(metric) {
  if (metric === "air") return "Similar air";
  if (metric === "noise") return "Similar noise";
  if (metric === "distance") return "Similar walk";
  return null;
}

/* ---------- Primary metric order by mode ---------- */

function getPrimaryMetricOrder(sortBy, routes) {
  const tripAir = getTripAirInfo(routes);
  const tripNoise = getTripNoiseInfo(routes);

  const includeAir = tripAir.hasComparableAirData && !tripAir.allSimilar;
  const includeNoise = tripNoise.hasComparableNoiseData && !tripNoise.allSimilar;
  const includeOverall = includeAir && includeNoise;

  if (sortBy === "noise") {
    return [
      ...(includeNoise ? ["noise"] : []),
      ...(includeAir ? ["air"] : []),
      "distance",
    ];
  }

  if (sortBy === "air") {
    return [
      ...(includeAir ? ["air"] : []),
      ...(includeNoise ? ["noise"] : []),
      "distance",
    ];
  }

  if (includeOverall) {
    return ["overall", "noise", "air", "distance"];
  }

  if (includeNoise && !includeAir) {
    return ["noise", "distance"];
  }

  if (includeAir && !includeNoise) {
    return ["air", "distance"];
  }

  return ["distance"];
}

/* ---------- Best / advantage / similarity tests ---------- */

function isBestOrTiedBest(route, metric, routes) {
  if (metric === "distance") {
    return getWalkTagState(route, routes) === "shorter";
  }

  if (metric === "noise") {
    return getRouteNoiseState(route, routes).uniqueQuietest;
  }

  if (metric === "air") {
    return getRouteAirState(route, routes).uniqueCleanest;
  }

  const current = getMetricValue(route, metric, routes);
  if (!Number.isFinite(current)) return false;

  const values = routes
    .map((r) => getMetricValue(r, metric, routes))
    .filter((v) => Number.isFinite(v));

  if (!values.length) return false;

  const best = Math.min(...values);
  return Math.abs(current - best) < 1e-6;
}

function hasMeaningfulAdvantage(route, metric, routes) {
  if (metric === "distance") {
    return false;
  }

  if (metric === "noise") {
    const noiseState = getRouteNoiseState(route, routes);

    if (!noiseState.hasComparableNoiseData || noiseState.allSimilar) return false;
    if (noiseState.uniqueQuietest) return true;
    if (noiseState.tiedQuietest) return false;

    return routes
      .filter((r) => r !== route && hasReliableNoiseForTag(r))
      .some((r) => r.avgNoise - route.avgNoise >= NOISE_ADVANTAGE_DB);
  }

  if (metric === "air") {
    const airState = getRouteAirState(route, routes);

    if (!airState.hasComparableAirData || airState.allSimilar) return false;
    if (airState.uniqueCleanest) return true;
    if (airState.tiedCleanest) return false;

    const current = getMetricValue(route, "air", routes);

    return routes
      .filter((r) => r !== route && hasReliableAirForTag(r))
      .some((r) => getMetricValue(r, "air", routes) - current >= AIR_ADVANTAGE_SCORE);
  }

  return false;
}

function isSimilarToBest(route, metric, routes) {
  if (metric === "distance") {
    return getWalkTagState(route, routes) === "similar";
  }

  if (metric === "noise") {
    return getRouteNoiseState(route, routes).tiedQuietest;
  }

  if (metric === "air") {
    return getRouteAirState(route, routes).tiedCleanest;
  }

  return false;
}

function getTopRouteFallbackTag(sortBy, routes) {
  if (routes.length < 2) return null;

  const tripAir = getTripAirInfo(routes);
  const tripNoise = getTripNoiseInfo(routes);

  if (sortBy === "overall") {
    if (tripAir.hasComparableAirData || tripNoise.hasComparableNoiseData) {
      return { label: "More balanced", metric: "overall", tone: "strong" };
    }
    return null;
  }

  if (sortBy === "air" && tripAir.hasComparableAirData) {
    return { label: "Cleaner", metric: "air", tone: "strong" };
  }

  if (sortBy === "noise" && tripNoise.hasComparableNoiseData) {
    return { label: "Quieter", metric: "noise", tone: "strong" };
  }

  return null;
}

/* ---------- Banner logic ---------- */

const BANNER_THRESHOLDS = {
  air: 1.2,
  noise: 3.0,
  distance: 700,
  duration: 8 * 60,
  overall: 0.18,
};

function shouldShowOverallSimilarityBanner(routes, sortBy) {
  if (!routes || routes.length < 2) return false;

  const distanceSpread = getMetricSpread("distance", routes);
  const durationSpread = getMetricSpread("duration", routes);

  if (distanceSpread == null || durationSpread == null) return false;

  const tripCloseEnough =
    distanceSpread <= BANNER_THRESHOLDS.distance &&
    durationSpread <= BANNER_THRESHOLDS.duration;

  if (!tripCloseEnough) return false;

  const hasComparableAir = tripHasComparableAirData(routes);
  const hasComparableNoise = tripHasComparableNoiseData(routes);

  if (sortBy === "air") {
    if (!hasComparableAir || !hasComparableNoise) return false;

    const currentSpread = getMetricSpread("air", routes);
    const otherSpread = getMetricSpread("noise", routes);

    if (currentSpread == null || otherSpread == null) return false;

    return (
      currentSpread <= BANNER_THRESHOLDS.air &&
      otherSpread <= BANNER_THRESHOLDS.noise
    );
  }

  if (sortBy === "noise") {
    if (!hasComparableAir || !hasComparableNoise) return false;

    const currentSpread = getMetricSpread("noise", routes);
    const otherSpread = getMetricSpread("air", routes);

    if (currentSpread == null || otherSpread == null) return false;

    return (
      currentSpread <= BANNER_THRESHOLDS.noise &&
      otherSpread <= BANNER_THRESHOLDS.air
    );
  }

  if (!hasComparableAir || !hasComparableNoise) return false;

  const overallSpread = getMetricSpread("overall", routes);
  const airSpread = getMetricSpread("air", routes);
  const noiseSpread = getMetricSpread("noise", routes);

  if (overallSpread == null || airSpread == null || noiseSpread == null) return false;

  return (
    overallSpread <= BANNER_THRESHOLDS.overall &&
    airSpread <= BANNER_THRESHOLDS.air &&
    noiseSpread <= BANNER_THRESHOLDS.noise
  );
}

function getDimensionLabel(dim) {
  if (dim === "air") return "air quality";
  if (dim === "noise") return "noise levels";
  if (dim === "walk") return "walking distance";
  if (dim === "time") return "walking time";
  return dim;
}

function getDimensionVerb(dim) {
  return dim === "noise" ? "are" : "is";
}

function joinNaturalLanguage(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildSimilarityBannerMessage({
  overallSimilar,
  airSimilar,
  noiseSimilar,
  walkSimilar,
  timeSame,
}) {
  const similarDims = [
    airSimilar ? "air" : null,
    noiseSimilar ? "noise" : null,
    walkSimilar ? "walk" : null,
    timeSame ? "time" : null,
  ].filter(Boolean);

  const similarLabels = similarDims.map(getDimensionLabel);
  const allDims = ["air", "noise", "walk", "time"];

  if (overallSimilar) {
    if (similarDims.length === 4) {
      return "These routes are very similar for this trip across air quality, noise levels, walking distance, and walking time. Small differences are shown below.";
    }

    if (similarDims.length >= 2) {
      const remainingLabels = allDims
        .filter((dim) => !similarDims.includes(dim))
        .map(getDimensionLabel);

      return `These routes are very similar for this trip. ${capitalize(
        joinNaturalLanguage(similarLabels)
      )} are especially similar, while differences in ${joinNaturalLanguage(
        remainingLabels
      )} remain minor.`;
    }

    if (similarDims.length === 1) {
      const dim = similarDims[0];
      const label = getDimensionLabel(dim);
      const verb = getDimensionVerb(dim);

      return `These routes are very similar for this trip. ${capitalize(
        label
      )} ${verb} especially similar, while differences in the other dimensions remain minor.`;
    }

    return "These routes are very similar for this trip. Small differences are shown below.";
  }

  if (similarDims.length === 1) {
    const dim = similarDims[0];

    if (dim === "time") {
      return "Walking time is the same across routes.";
    }

    const label = getDimensionLabel(dim);
    const verb = getDimensionVerb(dim);
    return `${capitalize(label)} ${verb} very similar across routes.`;
  }

  if (similarDims.length >= 2) {
    return `${capitalize(
      joinNaturalLanguage(similarLabels)
    )} are very similar across routes.`;
  }

  return null;
}

/* ---------- UI config ---------- */

const SORT_OPTIONS = [
  { value: "overall", label: "Balanced" },
  { value: "air", label: "Air quality" },
  { value: "noise", label: "Noise" },
];

const srOnlyStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
const secondaryButtonStyle = {
  minHeight: 40,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  outlineOffset: 2,
};
function getPrimaryTagStyle(tone) {
  if (tone === "soft") {
    return {
      background: "#ffffff",
      color: "#64748b",
      fontSize: 11,
      fontWeight: 400,
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #e2e8f0",
    };
  }

  if (tone === "weak") {
    return {
      background: "#f0fdf4",
      color: "#15803d",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #bbf7d0",
    };
  }

  return {
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #bbf7d0",
  };
}
function canUseFixedModePrimaryTag(route, sortBy, routes) {
  const tripAir = getTripAirInfo(routes);
  const tripNoise = getTripNoiseInfo(routes);

  if (sortBy === "air") {
    return tripAir.hasComparableAirData && hasReliableAirForTag(route);
  }

  if (sortBy === "noise") {
    return tripNoise.hasComparableNoiseData && hasReliableNoiseForTag(route);
  }

  if (sortBy === "overall") {
    const needsAir = tripAir.hasComparableAirData;
    const needsNoise = tripNoise.hasComparableNoiseData;

    if (!needsAir && !needsNoise) return false;

    const airOkay = !needsAir || hasReliableAirForTag(route);
    const noiseOkay = !needsNoise || hasReliableNoiseForTag(route);

    return airOkay && noiseOkay;
  }

  return false;
}
function getPrimaryTag(route, sortBy, routes, isTopRoute) {
  if (routes.length < 2) {
    return { label: null, metric: null, tone: null };
  }

  const tripAir = getTripAirInfo(routes);
  const tripNoise = getTripNoiseInfo(routes);

  // Top route: fixed primary tag by current mode,
  // but only when this route has reliable coverage for that mode.
  if (isTopRoute && canUseFixedModePrimaryTag(route, sortBy, routes)) {
    if (sortBy === "overall") {
      return {
        label: "More balanced",
        metric: "overall",
        tone: "strong",
      };
    }

    if (sortBy === "air" && tripAir.hasComparableAirData) {
      return {
        label: "Cleaner",
        metric: "air",
        tone: "strong",
      };
    }

    if (sortBy === "noise" && tripNoise.hasComparableNoiseData) {
      return {
        label: "Quieter",
        metric: "noise",
        tone: "strong",
      };
    }
  }

  const metricOrder = getPrimaryMetricOrder(sortBy, routes);

  // Other cases: real strong tags first
  for (const metric of metricOrder) {
    if (isBestOrTiedBest(route, metric, routes)) {
      const label = getStrongPrimaryLabel(metric);
      if (label) {
        return {
          label,
          metric,
          tone: "strong",
        };
      }
    }
  }

  // Then real weak tags
  for (const metric of metricOrder) {
    if (metric === "overall" || metric === "distance") continue;

    if (hasMeaningfulAdvantage(route, metric, routes)) {
      const label = getWeakPrimaryLabel(metric);
      if (label) {
        return {
          label,
          metric,
          tone: "weak",
        };
      }
    }
  }

  // Finally soft similar
  const similarOrder = metricOrder.filter((metric) => metric !== "overall");

  for (const metric of similarOrder) {
    if (isSimilarToBest(route, metric, routes)) {
      const label = getSoftPrimaryLabel(metric);
      if (label) {
        return {
          label,
          metric,
          tone: "soft",
        };
      }
    }
  }

  return { label: null, metric: null, tone: null };
}

function getSecondaryTags(route, sortBy, routes, primaryMetric, primaryTone) {
  if (routes.length < 2) return [];

  const orderedMetrics = getPrimaryMetricOrder(sortBy, routes).filter(
    (metric) => metric !== primaryMetric && metric !== "overall"
  );

  const tags = [];
  const usedMetrics = new Set(primaryMetric ? [primaryMetric] : []);

  orderedMetrics.forEach((metric) => {
    if (tags.length >= 2) return;
    if (usedMetrics.has(metric)) return;

    const shouldUseStrongSecondary =
      (metric === "distance" && isBestOrTiedBest(route, metric, routes)) ||
      (metric !== "distance" &&
        (hasMeaningfulAdvantage(route, metric, routes) ||
          isBestOrTiedBest(route, metric, routes)));

    if (shouldUseStrongSecondary) {
      const label = getSecondaryMetricLabel(metric);
      if (label) {
        tags.push({
          label,
          metric,
          tone: "strong",
        });
        usedMetrics.add(metric);
      }
    }
  });

  if (tags.length < 2 && primaryTone !== "soft") {
    const similarOrder = getPrimaryMetricOrder(sortBy, routes).filter(
      (metric) => !usedMetrics.has(metric) && metric !== "overall"
    );

    const bestSimilarMetric = similarOrder.find((metric) =>
      isSimilarToBest(route, metric, routes)
    );

    if (bestSimilarMetric) {
      tags.push({
        label: getSimilarityLabel(bestSimilarMetric),
        metric: bestSimilarMetric,
        tone: "soft",
      });
      usedMetrics.add(bestSimilarMetric);
    }
  }

  return tags.slice(0, 2);
}
export default function RouteCards({
  routes,
  onHighlight,
  onFilterChange,
  onDisplayOrderChange,
  onOpenNote,
  onSaveRoute,
  startPoint,
  endPoint,
  firstFilterRef,
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [sortBy, setSortByLocal] = useState("overall");

  const tripHasAnyAir = useMemo(() => tripHasAnyAirData(routes), [routes]);
  const tripHasAnyNoise = useMemo(() => tripHasAnyNoiseData(routes), [routes]);
  const tripHasComparableAir = useMemo(
    () => tripHasComparableAirData(routes),
    [routes]
  );
  const tripHasComparableNoise = useMemo(
    () => tripHasComparableNoiseData(routes),
    [routes]
  );

  const tripAirInfo = useMemo(() => getTripAirInfo(routes), [routes]);
  const tripNoiseInfo = useMemo(() => getTripNoiseInfo(routes), [routes]);
  const tripWalkInfo = useMemo(() => getTripWalkInfo(routes), [routes]);
  const tripTimeInfo = useMemo(() => getTripTimeInfo(routes), [routes]);

  const overallSimilar = useMemo(
    () => shouldShowOverallSimilarityBanner(routes, sortBy),
    [routes, sortBy]
  );

  const bannerMessage = useMemo(() => {
    if (!Array.isArray(routes) || routes.length < 2) return null;

    return buildSimilarityBannerMessage({
      overallSimilar,
      airSimilar: tripAirInfo.hasComparableAirData && tripAirInfo.allSimilar,
      noiseSimilar: tripNoiseInfo.hasComparableNoiseData && tripNoiseInfo.allSimilar,
      walkSimilar: tripWalkInfo.hasComparableWalkData && tripWalkInfo.allSimilar,
      timeSame: tripTimeInfo.hasTimeData && tripTimeInfo.allSame,
    });
  }, [routes, overallSimilar, tripAirInfo, tripNoiseInfo, tripWalkInfo, tripTimeInfo]);

  const setSortBy = (val) => {
    setSortByLocal(val);
    onFilterChange?.(val);
  };

  useEffect(() => {
    if (sortBy === "air" && !tripHasComparableAir) {
      setSortByLocal("overall");
      onFilterChange?.("overall");
    }
    if (sortBy === "noise" && !tripHasComparableNoise) {
      setSortByLocal("overall");
      onFilterChange?.("overall");
    }
  }, [sortBy, tripHasComparableAir, tripHasComparableNoise, onFilterChange]);

  const sortedRoutes = useMemo(() => {
    if (!routes.length) return [];
    return [...routes].sort(
      (a, b) => computeScore(a, sortBy, routes) - computeScore(b, sortBy, routes)
    );
  }, [routes, sortBy]);

  const displayOrder = useMemo(() => {
    const map = {};
    sortedRoutes.forEach((r, i) => {
      map[r.originalIndex ?? r.id ?? 0] = i;
    });
    return map;
  }, [sortedRoutes]);

  useEffect(() => {
    onDisplayOrderChange?.(displayOrder);
  }, [displayOrder, onDisplayOrderChange]);

  if (!routes.length) return null;

  const currentSortLabel = getSortLabel(sortBy);
  const firstRouteLabel =
    sortedRoutes.length > 0 ? `Route ${String.fromCharCode(65)}` : "Route";

  const liveMessage =
    sortedRoutes.length > 0
      ? `Routes updated. Sorted by ${currentSortLabel}. ${firstRouteLabel} is currently first.${
          bannerMessage ? ` ${bannerMessage}` : ""
        }`
      : `Routes updated. Sorted by ${currentSortLabel}.`;

  const hasMultipleRoutes = routes.length >= 2;

  const overallExplanation =
    !hasMultipleRoutes
      ? null
      : sortBy === "overall" && tripHasComparableAir && tripHasComparableNoise
      ? "Balanced mode combines air quality and noise with equal weighting."
      : sortBy === "overall" && !tripHasComparableAir && tripHasComparableNoise
      ? "Air-quality comparison is limited for this trip. Balanced mode is currently reflecting available noise information."
      : sortBy === "overall" && tripHasComparableAir && !tripHasComparableNoise
      ? "Noise comparison is limited for this trip. Balanced mode is currently reflecting available air-quality information."
      : null;

  const airInfoMessage =
    !hasMultipleRoutes
      ? null
      : !tripHasAnyAir
      ? "Air-quality comparison is unavailable for this trip because the route extends beyond the current study area."
      : !tripHasComparableAir
      ? "Air-quality data is available for this trip, but route comparison is limited because only one route has air-quality coverage."
      : null;

  const noiseInfoMessage =
    !hasMultipleRoutes
      ? null
      : !tripHasAnyNoise
      ? "Noise comparison is unavailable for this trip because available noise data does not cover these routes."
      : !tripHasComparableNoise
      ? "Noise data is available for this trip, but route comparison is limited because only one route has noise coverage."
      : null;

  return (
    <section aria-labelledby="routes-heading" style={{ marginBottom: 16 }}>
      <div aria-live="polite" style={srOnlyStyle}>
        {liveMessage}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
  id="routes-heading"
  style={{
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  }}
>
  {routes.length} routes found
</h3>
      </div>

      <fieldset
        style={{
          margin: 0,
          marginBottom: 14,
          padding: 0,
          border: "none",
        }}
      >
        <legend
          style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 6,
            padding: 0,
          }}
        >
          Choose what matters to you
        </legend>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SORT_OPTIONS.map((opt) => {
  const isDisabled =
    (opt.value === "air" && !tripHasComparableAir) ||
    (opt.value === "noise" && !tripHasComparableNoise);

  const isActive = sortBy === opt.value && !isDisabled;

  return (
    <button
      key={opt.value}
      ref={opt.value === "overall" ? firstFilterRef : null}
      type="button"
      onClick={() => {
        if (!isDisabled) setSortBy(opt.value);
      }}
      aria-pressed={isActive}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      style={{
        padding: "6px 12px",
        minHeight: 40,
        borderRadius: 999,
        border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
        background: isActive ? "#2563eb" : "#f8fafc",
        color: isActive ? "white" : isDisabled ? "#94a3b8" : "#374151",
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: isActive ? 600 : 400,
        transition: "all 0.15s",
        outlineOffset: 2,
        opacity: isDisabled ? 0.6 : 1,
      }}
      title={
        isDisabled && opt.value === "air"
          ? "Air-quality route comparison is unavailable for this trip."
          : isDisabled && opt.value === "noise"
          ? "Noise route comparison is unavailable for this trip."
          : undefined
      }
    >
      {opt.label}
    </button>
  );
})}
        </div>
      </fieldset>

      <p
        style={{
          fontSize: 12,
          color: "#64748b",
          marginTop: 8,
          marginBottom: 6,
        }}
      >
        Sorted by: <strong>{currentSortLabel}</strong>
      </p>

      {overallExplanation && (
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            marginTop: 0,
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {overallExplanation}
        </p>
      )}

      {airInfoMessage && (
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            marginTop: 0,
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {airInfoMessage}
        </p>
      )}

      {noiseInfoMessage && (
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            marginTop: 0,
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {noiseInfoMessage}
        </p>
      )}

      {bannerMessage && (
        <div
          role="note"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #dbeafe",
            background: "#f8fafc",
            color: "#475569",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {bannerMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 4,
          fontSize: 11,
          color: "#64748b",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 1, color: "#16a34a" }} />
          Low
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 2, color: "#f59e0b" }} />
          Medium
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 3, color: "#dc2626" }} />
          High
        </span>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "#64748b",
          marginTop: 0,
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        Relative level across the available routes
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sortedRoutes.map((route, displayIdx) => {
          const origIdx = route.originalIndex ?? route.id ?? 0;
          const isActive = activeIndex === origIdx;
          const routeColor = ROUTE_COLORS[displayIdx % ROUTE_COLORS.length];
          const routeLabel = `Route ${String.fromCharCode(65 + displayIdx)}`;
          const routeHeadingId = `route-heading-${origIdx}`;
          const isTopRoute = displayIdx === 0;

          const primary = getPrimaryTag(route, sortBy, routes, isTopRoute);
          const primaryTag = primary.label;
          const primaryMetric = primary.metric;
          const primaryTone = primary.tone;

          const secondaryTags = getSecondaryTags(
            route,
            sortBy,
            routes,
            primaryMetric,
            primaryTone
          );

          const airCoverage = getAirCoverage(route);
          const noiseCoverage = getNoiseCoverage(route);

          const noteTarget = {
            routeId: origIdx,
            routeLabel,
            distance: route.distance,
            duration: route.duration,
            avgNO2: route.avgNO2,
            avgPM25: route.avgPM25,
            avgNoise: route.avgNoise,
          };

          const saveTarget = {
  type: "saved-route",
  routeId: origIdx,
  routeLabel,
  startPoint: startPoint ?? null,
  endPoint: endPoint ?? null,
  summary: {
    distance: route.distance ?? null,
    duration: route.duration ?? null,
    avgNO2: route.avgNO2 ?? null,
    avgPM25: route.avgPM25 ?? null,
    avgNoise: route.avgNoise ?? null,
    airCoverage: route.airCoverage ?? route.dataCoverage ?? null,
    noiseCoverage: route.noiseCoverage ?? null,
    dangerPct: route.dangerPct ?? null,
  },
  geometry: route.geometry ?? null,
};
const canSaveRoute = Boolean(startPoint && endPoint);


          return (
           <article
  key={origIdx}
  aria-labelledby={routeHeadingId}
  onMouseEnter={() => onHighlight?.(origIdx)}
  onMouseLeave={() => onHighlight?.(activeIndex)}
  onFocusCapture={() => onHighlight?.(origIdx)}
  onBlurCapture={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      onHighlight?.(activeIndex);
    }
  }}
  style={{
    borderRadius: 10,
    border: isActive ? `2px solid ${routeColor}` : "1px solid #CBD5E1",
    background: isActive ? "#f8fafc" : "white",
    overflow: "hidden",
    boxShadow: isActive
      ? `0 0 0 3px ${routeColor}22`
      : "0 1px 3px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.15s, border 0.15s",
  }}
>
              <div style={{ height: 4, background: routeColor }} />

              <div style={{ padding: "10px 14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <h3
                    id={routeHeadingId}
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#0F172A",
                      margin: 0,
                    }}
                  >
                    {routeLabel}
                  </h3>

                  {isActive && (
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid #bfdbfe",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Selected
                    </span>
                  )}
                </div>

                {(primaryTag || secondaryTags.length > 0) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    {primaryTag && (
                      <span style={getPrimaryTagStyle(primaryTone)}>
                        {primaryTag}
                      </span>
                    )}

                    {secondaryTags.map((tag) => (
                      <span
                        key={`${tag.metric}-${tag.label}`}
                        style={{
                          background: tag.tone === "soft" ? "#ffffff" : "#f8fafc",
                          color: tag.tone === "soft" ? "#64748b" : "#475569",
                          fontSize: 11,
                          fontWeight: tag.tone === "soft" ? 400 : 500,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 10,
                    fontSize: 13,
                    color: "#374151",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <span aria-hidden="true">🚶 </span>
                    {formatDistance(route.distance)}
                  </span>
                  <span>
                    <span aria-hidden="true">⏱ </span>
                    {formatDuration(route.duration)}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 5,
                      marginTop: 0,
                    }}
                  >
                    Air quality
                  </p>

                  {hasAirData(route) ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        NO₂ <strong>{formatOneDecimal(route.avgNO2)}</strong>
                        {" μg/m³"}
                      </span>
                      <LevelBars level={getRankLevel(route.avgNO2, "avgNO2", routes)} />

                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        PM2.5 <strong>{formatOneDecimal(route.avgPM25)}</strong>
                        {" μg/m³"}
                      </span>
                      <LevelBars level={getRankLevel(route.avgPM25, "avgPM25", routes)} />
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Air-quality data is unavailable for this route.
                    </p>
                  )}
                </div>

                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 5,
                      marginTop: 0,
                    }}
                  >
                    Noise
                  </p>

                  {hasNoiseData(route) ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#374151",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                        }}
                      >
                        <span aria-hidden="true">🔊 </span>
                        <strong>{formatOneDecimal(route.avgNoise)}</strong> dB
                      </span>
                      <LevelBars level={getRankLevel(route.avgNoise, "avgNoise", routes)} />

                      {route.dangerPct != null && route.dangerPct > 0 && (
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#374151",
                            padding: "3px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                          }}
                        >
                          ≥75 dB: <strong>{formatPercent(route.dangerPct)}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Noise data is limited to major roads and may be unavailable on this route.
                    </p>
                  )}
                </div>

                {(airCoverage != null || noiseCoverage != null) && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {airCoverage != null && (
                      <span
                        style={{
                          background: "#f8fafc",
                          color: "#64748b",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        Air coverage: <strong>{formatPercent(airCoverage)}</strong>
                      </span>
                    )}

                    {noiseCoverage != null && (
                      <span
                        style={{
                          background: "#f8fafc",
                          color: "#64748b",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        Noise coverage: <strong>{formatPercent(noiseCoverage)}</strong>
                      </span>
                    )}
                  </div>
                )}

                <RouteDescription
                  route={route}
                  routes={routes}
                  filterMode={sortBy}
                />

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const next = isActive ? null : origIdx;
                      setActiveIndex(next);
                      onHighlight?.(next);
                    }}
                    aria-pressed={isActive}
                    aria-label={`${isActive ? "Deselect" : "Select"} ${routeLabel}`}
                    style={{
                      minHeight: 40,
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: isActive
                        ? `2px solid ${routeColor}`
                        : "1px solid #cbd5e1",
                      background: isActive ? "#eff6ff" : "#ffffff",
                      color: isActive ? "#1d4ed8" : "#334155",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      outlineOffset: 2,
                    }}
                  >
                    {isActive ? "Selected" : "Select route"}
                  </button>
  
                  <button
  type="button"
  onClick={() => {
    if (!canSaveRoute) return;
    onSaveRoute?.(saveTarget);
  }}
  disabled={!canSaveRoute}
  aria-disabled={!canSaveRoute}
  aria-label={`Save ${routeLabel}`}
  style={{
    ...secondaryButtonStyle,
    color: !canSaveRoute ? "#94a3b8" : "#334155",
    cursor: canSaveRoute ? "pointer" : "not-allowed",
    opacity: canSaveRoute ? 1 : 0.7,
  }}
>
  Save route
</button>

                  <button
  type="button"
  onClick={() => {
    setActiveIndex(origIdx);
    onHighlight?.(origIdx);
    onOpenNote?.(noteTarget);
  }}
  aria-label={`Add note for ${routeLabel}`}
  style={secondaryButtonStyle}
>
  Add note
</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}