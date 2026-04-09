import { useState, useMemo } from "react";

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

function CompareBar({ value, min, max, isLower = true }) {
  if (value == null || min === max) return null;
  const pct = isLower
    ? ((max - value) / (max - min)) * 100
    : ((value - min) / (max - min)) * 100;
  const color =
    pct > 66 ? "#16a34a" : pct > 33 ? "#f59e0b" : "#dc2626";
  return (
    <div
      style={{
        height: 4,
        background: "#e5e7eb",
        borderRadius: 2,
        marginTop: 4,
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

function computeScore(route, sortBy) {
  if (sortBy === "distance") return route.distance ?? Infinity;
  if (sortBy === "noise") return route.avgNoise ?? Infinity;
  if (sortBy === "air") {
    if (route.avgNO2 == null && route.avgPM25 == null) return Infinity;
    return (route.avgNO2 ?? 50) * 0.6 + (route.avgPM25 ?? 10) * 0.4;
  }
  return 0;
}

const SORT_OPTIONS = [
  { value: "air", label: "Air quality" },
  { value: "noise", label: "Noise" },
  { value: "distance", label: "Distance" },
];

export default function RouteCards({ routes = [], onHighlight, hoveredRoute, onHover }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [sortBy, setSortBy] = useState("air");

  const sortedRoutes = useMemo(() => {
    if (!routes.length) return [];
    return [...routes].sort(
      (a, b) => computeScore(a, sortBy) - computeScore(b, sortBy)
    );
  }, [routes, sortBy]);

  if (!routes.length) return null;

  const distRange = getRange(routes, "distance");
  const no2Range = getRange(routes, "avgNO2");
  const pm25Range = getRange(routes, "avgPM25");
  const noiseRange = getRange(routes, "avgNoise");

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 10 }}>Route comparison</h3>

      {/* Prioritise-by selector */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: "0 0 6px 0", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
          Prioritise by
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: sortBy === opt.value ? "none" : "1px solid #d1d5db",
                background: sortBy === opt.value ? "#2563eb" : "white",
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

      {sortedRoutes.map((route, displayIdx) => {
        const origIdx = route.originalIndex ?? route.id ?? 0;
        const isActive = activeIndex === origIdx;
        const isHovered = hoveredRoute === origIdx;
        const isRecommended = displayIdx === 0;

        let borderStyle = "1px solid #d1d5db";
        let bgColor = "#f9fafb";
        if (isActive) {
          borderStyle = "2px solid #2563eb";
          bgColor = "#eff6ff";
        } else if (isHovered) {
          borderStyle = "2px solid #f59e0b";
          bgColor = "#fffbeb";
        }

        return (
          <div
            key={origIdx}
            onClick={() => {
              setActiveIndex(origIdx);
              onHighlight?.(origIdx);
            }}
            onMouseEnter={() => onHover?.(origIdx)}
            onMouseLeave={() => onHover?.(null)}
            style={{
              marginBottom: 12,
              padding: 12,
              border: borderStyle,
              borderRadius: 10,
              background: bgColor,
              cursor: "pointer",
              transition: "background 0.15s, border 0.15s",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <strong style={{ fontSize: 15 }}>
                {route.name || `Route ${String.fromCharCode(65 + displayIdx)}`}
              </strong>
              <div style={{ display: "flex", gap: 5 }}>
                {isRecommended && (
                  <span
                    style={{
                      background: "#16a34a",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    ★ Best
                  </span>
                )}
                {isActive && (
                  <span
                    style={{
                      background: "#2563eb",
                      color: "white",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Selected
                  </span>
                )}
              </div>
            </div>

            {/* Distance + Duration */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
              <span>🚶 {formatDistance(route.distance)}</span>
              <span>⏱ {formatDuration(route.duration)}</span>
            </div>
            {sortBy === "distance" && (
              <CompareBar
                value={route.distance}
                min={distRange.min}
                max={distRange.max}
                isLower={true}
              />
            )}

            {/* Air quality */}
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Air Quality
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#fee2e2",
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 13,
                  }}
                >
                  NO₂ <strong>{route.avgNO2 ?? "N/A"}</strong>
                  {route.avgNO2 != null ? " μg/m³" : ""}
                </span>
                <span
                  style={{
                    background: "#e0f2fe",
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 13,
                  }}
                >
                  PM2.5 <strong>{route.avgPM25 ?? "N/A"}</strong>
                  {route.avgPM25 != null ? " μg/m³" : ""}
                </span>
              </div>
              {sortBy === "air" && route.avgNO2 != null && (
                <CompareBar
                  value={route.avgNO2}
                  min={no2Range.min}
                  max={no2Range.max}
                  isLower={true}
                />
              )}
            </div>

            {/* Noise */}
            {route.avgNoise != null && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Noise
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: route.avgNoise >= 70 ? "#fee2e2" : "#f0fdf4",
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 13,
                    }}
                  >
                    🔊 <strong>{route.avgNoise}</strong> dB
                  </span>
                  {route.dangerPct != null && route.dangerPct > 0 && (
                    <span
                      style={{
                        background: "#fee2e2",
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 13,
                      }}
                    >
                      ≥75 dB: <strong>{route.dangerPct}%</strong>
                    </span>
                  )}
                </div>
                {sortBy === "noise" && (
                  <CompareBar
                    value={route.avgNoise}
                    min={noiseRange.min}
                    max={noiseRange.max}
                    isLower={true}
                  />
                )}
              </div>
            )}

            {/* Data coverage */}
            {route.dataCoverage != null && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                Data coverage: {route.dataCoverage}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
