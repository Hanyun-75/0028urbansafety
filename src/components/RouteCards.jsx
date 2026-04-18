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
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, verticalAlign: "middle" }}>
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

function isUniqueMin(value, field, routes) {
  if (value == null) return false;
  const vals = routes.map((r) => r[field]).filter((v) => v != null);
  const min = Math.min(...vals);
  if (value !== min) return false;
  return vals.filter((v) => v === min).length === 1;
}

function generateTags(route, routes) {
  const tags = [];
  if (routes.length < 2) return tags;

  if (isUniqueMin(route.distance, "distance", routes)) tags.push("Shorter");
  if (isUniqueMin(route.duration, "duration", routes) && !isUniqueMin(route.distance, "distance", routes)) tags.push("Faster");
  if (isUniqueMin(route.avgNO2, "avgNO2", routes)) tags.push("Lower pollution");
  if (isUniqueMin(route.avgNoise, "avgNoise", routes)) tags.push("Quieter");

  return tags;
}

function computeScore(route, sortBy, routes) {
  if (sortBy === "noise") return route.avgNoise ?? Infinity;
  if (sortBy === "air") {
    if (route.avgNO2 == null && route.avgPM25 == null) return Infinity;
    return (route.avgNO2 ?? 50) * 0.6 + (route.avgPM25 ?? 10) * 0.4;
  }
  if (sortBy === "overall" && routes) {
    // Normalise air and noise to 0–1 then average 50/50
    const no2Vals = routes.map((r) => r.avgNO2).filter((v) => v != null);
    const noiseVals = routes.map((r) => r.avgNoise).filter((v) => v != null);
    const no2Min = Math.min(...no2Vals), no2Max = Math.max(...no2Vals);
    const noiseMin = Math.min(...noiseVals), noiseMax = Math.max(...noiseVals);
    const no2Norm = no2Max > no2Min ? ((route.avgNO2 ?? no2Max) - no2Min) / (no2Max - no2Min) : 0;
    const noiseNorm = noiseMax > noiseMin ? ((route.avgNoise ?? noiseMax) - noiseMin) / (noiseMax - noiseMin) : 0;
    return no2Norm * 0.5 + noiseNorm * 0.5;
  }
  return 0;
}

function getBestLabel(sortBy) {
  if (sortBy === "air") return "Cleaner air";
  if (sortBy === "noise") return "Quieter";
  if (sortBy === "overall") return "Recommended";
  return null;
}

const SORT_OPTIONS = [
  { value: "overall", label: "Overview" },
  { value: "air", label: "Air quality" },
  { value: "noise", label: "Noise" },
];

export default function RouteCards({ routes = [], onHighlight, onFilterChange, onDisplayOrderChange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [sortBy, setSortByLocal] = useState("overall");

  const setSortBy = (val) => {
    setSortByLocal(val);
    onFilterChange?.(val);
  };

  const sortedRoutes = useMemo(() => {
    if (!routes.length) return [];
    return [...routes].sort((a, b) => computeScore(a, sortBy, routes) - computeScore(b, sortBy, routes));
  }, [routes, sortBy]);

  // Build mapping: originalIndex -> displayIdx, notify parent
  const displayOrder = useMemo(() => {
    const map = {};
    sortedRoutes.forEach((r, i) => {
      map[r.originalIndex ?? r.id ?? 0] = i;
    });
    return map;
  }, [sortedRoutes]);

  useEffect(() => {
    onDisplayOrderChange?.(displayOrder);
  }, [displayOrder]);

  if (!routes.length) return null;

  const bestLabel = getBestLabel(sortBy);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {routes.length} routes found
        </p>
      </div>

      {/* Choose what matters to you */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Choose what matters to you</p>
        <div style={{ display: "flex", gap: 6 }} role="group" aria-label="Sort routes by">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              aria-pressed={sortBy === opt.value}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: sortBy === opt.value ? "none" : "1px solid #e2e8f0",
                background: sortBy === opt.value ? "#2563eb" : "#f8fafc",
                color: sortBy === opt.value ? "white" : "#374151",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: sortBy === opt.value ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Level bars legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11, color: "#94a3b8" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 1, color: "#16a34a" }} /> Low
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 2, color: "#f59e0b" }} /> Medium
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <LevelBars level={{ bars: 3, color: "#dc2626" }} /> High
        </span>
      </div>

      {/* Route cards */}
      {sortedRoutes.map((route, displayIdx) => {
        const origIdx = route.originalIndex ?? route.id ?? 0;
        const isActive = activeIndex === origIdx;
        const routeColor = ROUTE_COLORS[displayIdx % ROUTE_COLORS.length];
        const tags = generateTags(route, routes);
        const isBestForSort = displayIdx === 0;

        return (
          <div
            key={origIdx}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Route ${String.fromCharCode(65 + displayIdx)}`}
            onClick={() => {
              setActiveIndex(origIdx);
              onHighlight?.(origIdx);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveIndex(origIdx);
                onHighlight?.(origIdx);
              }
            }}
            onMouseEnter={() => onHighlight?.(origIdx)}
            onMouseLeave={() => onHighlight?.(activeIndex)}
            style={{
              marginBottom: 10,
              borderRadius: 10,
              border: isActive ? `2px solid ${routeColor}` : "1px solid #e2e8f0",
              background: isActive ? "#f8fafc" : "white",
              cursor: "pointer",
              overflow: "hidden",
              boxShadow: isActive ? `0 0 0 3px ${routeColor}22` : "0 1px 3px rgba(0,0,0,0.06)",
              transition: "box-shadow 0.15s, border 0.15s",
            }}
          >
            {/* Coloured top bar matching map line */}
            <div style={{ height: 4, background: routeColor }} />

            <div style={{ padding: "10px 14px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                  {`Route ${String.fromCharCode(65 + displayIdx)}`}
                </span>
                <div style={{ display: "flex", gap: 5 }}>
                  {isBestForSort && bestLabel && (
                    <span style={{
                      background: "#dcfce7", color: "#15803d",
                      fontSize: 11, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 999,
                      border: "1px solid #bbf7d0",
                    }}>
                      {bestLabel}
                    </span>
                  )}
                  {isActive && (
                    <span style={{
                      background: routeColor, color: "white",
                      fontSize: 11, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 999,
                    }}>
                      Selected
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic tags — only in Overall mode */}
              {sortBy === "overall" && tags.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                  {tags.map((tag) => (
                    <span key={tag} style={{
                      background: "#f0fdf4", color: "#15803d",
                      fontSize: 11, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 999,
                      border: "1px solid #bbf7d0",
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Distance + Duration */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13, color: "#374151" }}>
                <span>🚶 {formatDistance(route.distance)}</span>
                <span>⏱ {formatDuration(route.duration)}</span>
              </div>

              {/* Air quality — show when air or overall */}
              {(sortBy === "air" || sortBy === "overall") && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    Air Quality
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 999, fontSize: 12, color: "#374151" }}>
                      NO₂ <strong>{route.avgNO2 ?? "N/A"}</strong>{route.avgNO2 != null ? " μg/m³" : ""}
                    </span>
                    <LevelBars level={getRankLevel(route.avgNO2, "avgNO2", routes)} />
                    <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 999, fontSize: 12, color: "#374151" }}>
                      PM2.5 <strong>{route.avgPM25 ?? "N/A"}</strong>{route.avgPM25 != null ? " μg/m³" : ""}
                    </span>
                    <LevelBars level={getRankLevel(route.avgPM25, "avgPM25", routes)} />
                  </div>
                </div>
              )}

              {/* Noise — show when noise or overall */}
              {(sortBy === "noise" || sortBy === "overall") && route.avgNoise != null && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    Noise
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{
                      background: "#f1f5f9",
                      color: "#374151",
                      padding: "3px 8px", borderRadius: 999, fontSize: 12,
                    }}>
                      🔊 <strong>{route.avgNoise}</strong> dB
                    </span>
                    <LevelBars level={getRankLevel(route.avgNoise, "avgNoise", routes)} />
                    {route.dangerPct != null && route.dangerPct > 0 && (
                      <span style={{ background: "#f1f5f9", color: "#374151", padding: "3px 8px", borderRadius: 999, fontSize: 12 }}>
                        ≥75 dB: <strong>{route.dangerPct}%</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Data coverage */}
              {route.dataCoverage != null && (
                <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>
                  Data coverage: {route.dataCoverage}%
                </p>
              )}

              <RouteDescription route={route} routes={routes} filterMode={sortBy} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
