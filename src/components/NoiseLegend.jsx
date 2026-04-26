const NOISE_BANDS = [
  { label: "≥ 75.0 dB (Danger zone)", color: "#c1121f" },
];

export default function NoiseLegend({
  show,
  onToggle,
  opacity,
  onOpacityChange,
  isConstrainedViewport = false,
  isCompactScreen = false,
}) {
  const panelId = "noise-legend-panel";
  const sliderId = "noise-opacity-slider";

  const expandedWidth = isCompactScreen
    ? "min(200px, calc(100vw - 24px))"
    : isConstrainedViewport
    ? "min(220px, calc(100vw - 24px))"
    : "min(var(--info-card-width), calc(100vw - 24px))";

  const cardStyle = {
    background: "rgba(255,255,255,0.93)",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: show ? "12px" : "10px 12px",
    fontSize: 12,
    color: "#1f2937",
    width: show ? expandedWidth : "fit-content",
    maxWidth: "calc(100vw - 24px)",
    minWidth: show ? "min(200px, calc(100vw - 24px))" : "unset",
    boxShadow: "0 1px 4px rgba(15,23,42,0.08)",
  };

  const titleStyle = {
    margin: 0,
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
    lineHeight: 1.3,
  };

  const toggleButtonStyle = {
    minHeight: 32,
    padding: "4px 10px",
    fontSize: 11,
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: show ? "#1d4ed8" : "#f3f4f6",
    color: show ? "#ffffff" : "#374151",
    cursor: "pointer",
    fontWeight: 600,
    flexShrink: 0,
  };

  return (
    <section
      aria-labelledby="noise-legend-heading"
      style={cardStyle}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: show ? 10 : 0,
        }}
      >
        <h2 id="noise-legend-heading" style={titleStyle}>
          High noise areas
        </h2>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={show}
          aria-pressed={show}
          aria-controls={panelId}
          aria-label={show ? "Hide noise layer controls" : "Show noise layer controls"}
          style={toggleButtonStyle}
        >
          {show ? "On" : "Off"}
        </button>
      </div>

      {show && (
        <div id={panelId}>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {NOISE_BANDS.map((band, index) => (
              <li
                key={band.label}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: index === NOISE_BANDS.length - 1 ? 0 : 6,
                  fontSize: 12,
                  color: "#334155",
                  lineHeight: 1.45,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: band.color,
                    flexShrink: 0,
                    marginTop: 3,
                  }}
                />
                <span>{band.label}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12 }}>
            <label
              htmlFor={sliderId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 6,
                fontSize: 12,
                color: "#475569",
                fontWeight: 500,
              }}
            >
              <span>Opacity</span>
              <span>{Math.round(opacity * 100)}%</span>
            </label>

            <input
              id={sliderId}
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              aria-label="Noise layer opacity"
              aria-valuetext={`${Math.round(opacity * 100)} percent`}
              style={{
                width: "100%",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}