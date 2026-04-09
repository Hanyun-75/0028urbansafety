import SearchBox from "./SearchBox";
import RouteCards from "./RouteCards";
import Feedback from "./Feedback";

const QUICK_PICKS = [
  { label: "King's Cross → UCL", start: [51.53, -0.123], end: [51.5248, -0.134] },
  { label: "Camden → UCL", start: [51.535, -0.125], end: [51.5248, -0.134] },
  { label: "Russell Sq → UCL", start: [51.5215, -0.127], end: [51.5248, -0.134] },
];

function Divider() {
  return <div style={{ height: 1, background: "#f1f5f9", margin: "16px 0" }} />;
}

export default function Sidebar({
  status,
  loading,
  routes,
  onHighlight,
  onQuickPick,
  startQuery,
  endQuery,
  setStartQuery,
  setEndQuery,
  onSelectStart,
  onSelectEnd,
}) {
  return (
    <aside
      aria-label="Route planner"
      style={{
        width: 380,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "white",
        borderLeft: "1px solid #e2e8f0",
        overflowY: "auto",
      }}
    >
      {/* Search section */}
      <div style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Search or click the map to set start and end points, then compute routes.
        </p>

        <SearchBox
          label="Start"
          placeholder="Search a start location"
          value={startQuery}
          onChange={setStartQuery}
          onSelect={onSelectStart}
        />

        <SearchBox
          label="End"
          placeholder="Search an end location"
          value={endQuery}
          onChange={setEndQuery}
          onSelect={onSelectEnd}
        />
      </div>

      <Divider />

      {/* Quick picks */}
      <div style={{ padding: "0 20px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Try a demo route
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {QUICK_PICKS.map((qp, i) => (
            <button
              key={i}
              onClick={() => onQuickPick(qp.start, qp.end)}
              style={{
                padding: "9px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#f8fafc",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                color: "#374151",
                fontWeight: 500,
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Results */}
      <div style={{ padding: "0 20px", flex: 1 }}>
        {status === "idle" && !routes.length && (
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>
            Set a start and end point to see route options.
          </p>
        )}

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#64748b" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Finding routes…</div>
            <div style={{ fontSize: 13 }}>Analysing air quality &amp; noise</div>
          </div>
        )}

        {status === "error" && (
          <div style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 14,
          }}>
            Could not calculate routes. Please check your connection and try again.
          </div>
        )}

        {status === "done" && routes.length > 0 && (
          <RouteCards routes={routes} onHighlight={onHighlight} />
        )}
      </div>

      {/* Footer */}
      <Divider />

      {/* Feedback */}
      <div style={{ padding: "0 20px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Leave feedback
        </p>
        <Feedback />
      </div>

      {/* Attribution */}
      <div style={{ padding: "10px 20px 16px", fontSize: 11, color: "#cbd5e1" }}>
        Air quality: LAEI 2022 &nbsp;·&nbsp; Routing: ORS &nbsp;·&nbsp; Map: OpenStreetMap
      </div>
    </aside>
  );
}
