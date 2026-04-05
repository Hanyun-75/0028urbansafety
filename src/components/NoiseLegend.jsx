const NOISE_BANDS = [
  { label: "≥ 75.0 dB  (Danger zone)", color: "#c1121f" },
];

export default function NoiseLegend({ show, onToggle, opacity, onOpacityChange }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.93)",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        color: "#1f2937",
        minWidth: 160,
      }}
    >
      {/* Header row: title + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Noise level (dB)</span>
        <button
          onClick={onToggle}
          style={{
            padding: "2px 10px",
            fontSize: 11,
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: show ? "#1d4ed8" : "#f3f4f6",
            color: show ? "#fff" : "#374151",
            cursor: "pointer",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          {show ? "ON" : "OFF"}
        </button>
      </div>

      {/* Color scale */}
      {NOISE_BANDS.map((band) => (
        <div
          key={band.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            opacity: show ? 1 : 0.4,
            transition: "opacity 0.2s",
          }}
        >
          <div
            style={{
              width: 16,
              height: 12,
              borderRadius: 2,
              background: band.color,
              flexShrink: 0,
            }}
          />
          <span>{band.label}</span>
        </div>
      ))}

      {/* Opacity slider — only shown when layer is on */}
      {show && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Opacity</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>
      )}

      <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#6b7280" }}>
        Source: Defra / GLA
      </p>
    </div>
  );
}
