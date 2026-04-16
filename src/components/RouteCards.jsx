import { useState } from "react";
import { ROUTE_COLORS } from "../utils/routeColors";

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

function getRange(routes, field) {
  const vals = routes.map((r) => r[field]).filter((v) => v != null);
  if (!vals.length) return { min: 0, max: 0 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function CompareBar({ value, min, max }) {
  if (value == null || min === max) return null;
  const pct = ((max - value) / (max - min)) * 100;
  const color = pct > 66 ? "#16a34a" : pct > 33 ? "#f59e0b" : "#dc2626";
  return (
    <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, marginTop: 5 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s" }} />
    </div>
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

function generateSummary(route, routes) {
  if (routes.length < 2) return null;
  const parts = [];

  const isShort = isUniqueMin(route.distance, "distance", routes);
  const isClean = isUniqueMin(route.avgNO2, "avgNO2", routes);
  const isQuiet = isUniqueMin(route.avgNoise, "avgNoise", routes);

  const maxDist = Math.max(...routes.map((r) => r.distance ?? -Infinity));
  const maxNO2 = Math.max(...routes.map((r) => r.avgNO2 ?? -Infinity));
  const maxNoise = Math.max(...routes.map((r) => r.avgNoise ?? -Infinity));

  const isLong = route.distance === maxDist && !isShort;
  const isDirty = route.avgNO2 === maxNO2 && !isClean;
  const isNoisy = route.avgNoise === maxNoise && !isQuiet;

  if (isShort && isQuiet) {
    parts.push("Shortest and quietest");
  } else if (isShort && isClean) {
    parts.push("Shortest with cleanest air");
  } else if (isShort) {
    parts.push("Shortest");
    if (isNoisy) parts.push("but noisier");
    else if (isDirty) parts.push("but higher pollution");
  } else if (isClean && isQuiet) {
    parts.push("Cleanest air and quietest");
    if (isLong) parts.push("with a small detour");
  } else if (isClean) {
    parts.push("Lower NO\u2082");
    if (isLong) parts.push("with a small detour");
    else if (isNoisy) parts.push("but noisier");
  } else if (isQuiet) {
    parts.push("Quieter streets");
    if (isLong) parts.push("with a longer walk");
    else if (isDirty) parts.push("but higher pollution");
  } else {
    const durationMin = route.duration != null ? Math.round(route.duration / 60) : null;
    if (durationMin != null) parts.push(`${durationMin} min`);
    if (!isDirty && !isNoisy) parts.push("balanced trade-offs");
    else if (isDirty) parts.push("higher pollution");
    else if (isNoisy) parts.push("noisier streets");
  }

  return parts.join(", ");
}

const SORT_OPTIONS = [
  { value: "air", label: "Air quality" },
  { value: "noise", label: "Noise" },
  { value: "distance", label: "Distance" },
];

export default function RouteCards({ routes = [], onHighlight }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [sortBy, setSortBy] = useState("air");

  if (!routes.length) return null;

  const distRange = getRange(routes, "distance");
  const no2Range = getRange(routes, "avgNO2");
  const noiseRange = getRange(routes, "avgNoise");

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

      {/* Route cards */}
      {routes.map((route) => {
        const origIdx = route.originalIndex ?? route.id ?? 0;
        const isActive = activeIndex === origIdx;
        const routeColor = ROUTE_COLORS[origIdx % ROUTE_COLORS.length];
        const tags = generateTags(route, routes);
        const summary = generateSummary(route, routes);

        return (
          <div
            key={origIdx}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={route.name || `Route ${String.fromCharCode(65 + origIdx)}`}
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
                  {route.name || `Route ${String.fromCharCode(65 + origIdx)}`}
                </span>
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

              {/* Dynamic tags */}
              {tags.length > 0 && (
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

              {/* Short summary */}
              {summary && (
                <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", margin: "0 0 8px 0" }}>
                  {summary}
                </p>
              )}

              {/* Distance + Duration */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13, color: "#374151" }}>
                <span>🚶 {formatDistance(route.distance)}</span>
                <span>⏱ {formatDuration(route.duration)}</span>
              </div>
              {sortBy === "distance" && (
                <CompareBar value={route.distance} min={distRange.min} max={distRange.max} />
              )}

              {/* Air quality */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Air Quality
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ background: "#fef2f2", padding: "3px 8px", borderRadius: 999, fontSize: 12, color: "#b91c1c" }}>
                    NO₂ <strong>{route.avgNO2 ?? "N/A"}</strong>{route.avgNO2 != null ? " μg/m³" : ""}
                  </span>
                  <span style={{ background: "#eff6ff", padding: "3px 8px", borderRadius: 999, fontSize: 12, color: "#1d4ed8" }}>
                    PM2.5 <strong>{route.avgPM25 ?? "N/A"}</strong>{route.avgPM25 != null ? " μg/m³" : ""}
                  </span>
                </div>
                {sortBy === "air" && route.avgNO2 != null && (
                  <CompareBar value={route.avgNO2} min={no2Range.min} max={no2Range.max} />
                )}
              </div>

              {/* Noise */}
              {route.avgNoise != null && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    Noise
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{
                      background: route.avgNoise >= 75 ? "#fef2f2" : "#f0fdf4",
                      color: route.avgNoise >= 75 ? "#b91c1c" : "#15803d",
                      padding: "3px 8px", borderRadius: 999, fontSize: 12,
                    }}>
                      🔊 <strong>{route.avgNoise}</strong> dB
                    </span>
                    {route.dangerPct != null && route.dangerPct > 0 && (
                      <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "3px 8px", borderRadius: 999, fontSize: 12 }}>
                        ≥75 dB: <strong>{route.dangerPct}%</strong>
                      </span>
                    )}
                  </div>
                  {sortBy === "noise" && (
                    <CompareBar value={route.avgNoise} min={noiseRange.min} max={noiseRange.max} />
                  )}
                </div>
              )}

              {/* Data coverage */}
              {route.dataCoverage != null && (
                <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>
                  Data coverage: {route.dataCoverage}%
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
