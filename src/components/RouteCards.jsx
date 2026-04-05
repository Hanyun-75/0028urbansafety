import { useState } from "react";

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

export default function RouteCards({ routes = [], onHighlight }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!routes.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Route comparison</h3>

      {routes.map((route, idx) => {
        const isActive = activeIndex === (route.originalIndex ?? idx);

        return (
          <div
            key={route.originalIndex ?? route.id ?? idx}
            onClick={() => {
              const targetIndex = route.originalIndex ?? idx;
              setActiveIndex(targetIndex);
              onHighlight?.(targetIndex);
            }}
            style={{
              marginBottom: 12,
              padding: 12,
              border: isActive ? "2px solid #2563eb" : "1px solid #d1d5db",
              borderRadius: 10,
              background: isActive ? "#eff6ff" : "#f9fafb",
              cursor: "pointer",
            }}
          >
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>{route.name || `Route ${String.fromCharCode(65 + idx)}`}</strong>
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
              <span>🚶 {formatDistance(route.distance)}</span>
              <span>⏱ {formatDuration(route.duration)}</span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <span
                style={{
                  background: "#fee2e2",
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 13,
                }}
              >
                NO₂ avg: <strong>{route.avgNO2 ?? "N/A"}</strong> μg/m³
              </span>

              <span
                style={{
                  background: "#e0f2fe",
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 13,
                }}
              >
                PM2.5 avg: <strong>{route.avgPM25 ?? "N/A"}</strong> μg/m³
              </span>
            </div>

            {route.dataCoverage != null && (
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                LAEI data coverage: {route.dataCoverage}%
              </div>
            )}

            {route.avgNoise != null && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <span
                  style={{
                    background: route.avgNoise >= 70 ? "#fee2e2" : "#f0fdf4",
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 13,
                  }}
                >
                  🔊 Noise avg: <strong>{route.avgNoise}</strong> dB
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
                    ≥75 dB: <strong>{route.dangerPct}%</strong> of route
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}