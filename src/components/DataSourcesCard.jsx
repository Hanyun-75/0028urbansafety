export default function DataSourcesCard({ isOpen, onToggle }) {
  const panelId = "data-sources-panel";

  return (
    <section
      aria-labelledby="data-sources-heading"
      style={{
        background: "rgba(255,255,255,0.93)",
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: "12px",
        fontSize: 12,
        color: "#1f2937",
        minWidth: 220,
        boxShadow: "0 1px 4px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: isOpen ? 10 : 0,
        }}
      >
        <h2
          id="data-sources-heading"
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.3,
            color: "#0f172a",
          }}
        >
          Data sources
        </h2>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? "Hide data sources" : "Show data sources"}
          style={{
            minHeight: 32,
            padding: "4px 10px",
            fontSize: 11,
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: isOpen ? "#f3f4f6" : "#1d4ed8",
            color: isOpen ? "#374151" : "#ffffff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen && (
        <div id={panelId}>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 2,
              }}
            >
              Air quality
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#475569",
                lineHeight: 1.4,
                marginBottom: 4,
              }}
            >
              LAEI 2022
            </div>
            <a
              href="https://data.london.gov.uk/dataset/london-atmospheric-emissions-inventory-laei-2022-2lg5g/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: "#64748b",
                textDecoration: "underline",
                lineHeight: 1.4,
              }}
            >
              View dataset (opens in a new tab)
            </a>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 2,
              }}
            >
              Noise
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#475569",
                lineHeight: 1.4,
                marginBottom: 4,
              }}
            >
              Defra / GLA
            </div>
            <a
              href="https://data.london.gov.uk/dataset/noise-pollution-in-london-2zwnk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: "#64748b",
                textDecoration: "underline",
                lineHeight: 1.4,
              }}
            >
              View dataset (opens in a new tab)
            </a>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 2,
              }}
            >
              Routing
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#475569",
                lineHeight: 1.4,
                marginBottom: 4,
              }}
            >
              OpenRouteService
            </div>
            <a
              href="https://openrouteservice.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: "#64748b",
                textDecoration: "underline",
                lineHeight: 1.4,
              }}
            >
              View website (opens in a new tab)
            </a>
          </div>
        </div>
      )}
    </section>
  );
}