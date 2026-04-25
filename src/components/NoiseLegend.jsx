const NOISE_BANDS = [
  { label: "≥ 75.0 dB (Danger zone)", color: "#c1121f" },
];

export default function NoiseLegend({
  show,
  onToggle,
  opacity,
  onOpacityChange,
}) {
  const sliderId = "noise-opacity-slider";

  return (
    <section
      aria-label="Noise hotspot legend"
      style={{
        background: "rgba(255,255,255,0.93)",
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: "12px",
        fontSize: 12,
        color: "#1f2937",
        minWidth: 180,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
  High noise areas
</span>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={show}
          aria-label={show ? "Hide noise layer" : "Show noise layer"}
          style={{
            minHeight: 32,
            padding: "4px 10px",
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
          {show ? "On" : "Off"}
        </button>
      </div>

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
            aria-hidden="true"
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

      {show && (
        <div style={{ marginTop: 10 }}>
          <label
            htmlFor={sliderId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 3,
              fontSize: 11,
              color: "#6b7280",
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
            aria-valuetext={`${Math.round(opacity * 100)} percent`}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>
      )}

      

      
    </section>
  );
}