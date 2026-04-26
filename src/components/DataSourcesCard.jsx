export default function DataSourcesCard({ isOpen, onToggle, expandedWidth }) {
  const panelId = "data-sources-panel";
  const descriptionId = "data-sources-description";

  const cardStyle = {
    background: "rgba(255,255,255,0.93)",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: isOpen ? "12px" : "10px 12px",
    fontSize: 12,
    color: "#1f2937",
    width: isOpen ? expandedWidth : "fit-content",
    maxWidth: "calc(100vw - 24px)",
    minWidth: isOpen ? "min(200px, calc(100vw - 24px))" : "unset",
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
    background: isOpen ? "#f3f4f6" : "#1d4ed8",
    color: isOpen ? "#374151" : "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
    flexShrink: 0,
  };

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

  const subheadingStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    margin: "0 0 2px 0",
  };

  const metaTextStyle = {
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.4,
    marginBottom: 4,
  };

  const linkStyle = {
    fontSize: 11,
    color: "#475569",
    textDecoration: "underline",
    lineHeight: 1.4,
  };

  return (
    <section
      aria-labelledby="data-sources-heading"
      aria-describedby={isOpen ? descriptionId : undefined}
      style={cardStyle}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: isOpen ? 10 : 0,
        }}
      >
        <h2 id="data-sources-heading" style={titleStyle}>
          Data sources
        </h2>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? "Hide data sources" : "Show data sources"}
          style={toggleButtonStyle}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen && (
        <div id={panelId}>
          <p id={descriptionId} style={srOnlyStyle}>
            External links to the air-quality, noise, and routing data sources
            used in this map. Links open in a new tab.
          </p>

          <div style={{ marginBottom: 12 }}>
            <h3 style={subheadingStyle}>Air quality</h3>
            <div style={metaTextStyle}>LAEI 2022</div>
            <a
              href="https://data.london.gov.uk/dataset/london-atmospheric-emissions-inventory-laei-2022-2lg5g/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              LAEI 2022 dataset (opens in a new tab)
            </a>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h3 style={subheadingStyle}>Noise</h3>
            <div style={metaTextStyle}>Defra / GLA</div>
            <a
              href="https://data.london.gov.uk/dataset/noise-pollution-in-london-2zwnk"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              London noise dataset (opens in a new tab)
            </a>
          </div>

          <div>
            <h3 style={subheadingStyle}>Routing</h3>
            <div style={metaTextStyle}>OpenRouteService</div>
            <a
              href="https://openrouteservice.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              OpenRouteService website (opens in a new tab)
            </a>
          </div>
        </div>
      )}
    </section>
  );
}