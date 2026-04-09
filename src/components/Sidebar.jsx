import SearchBox from "./SearchBox";
import RouteCards from "./RouteCards";
import Feedback from "./Feedback";

const QUICK_PICKS = [
  { label: "King's Cross → UCL", start: [51.53, -0.123], end: [51.5248, -0.134] },
  { label: "Camden → UCL", start: [51.535, -0.125], end: [51.5248, -0.134] },
  { label: "Russell Sq → UCL", start: [51.5215, -0.127], end: [51.5248, -0.134] },
];

export default function Sidebar({
  status,
  routes,
  onHighlight,
  hoveredRoute,
  onHover,
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
      style={{
        width: 360,
        flexShrink: 0,
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fafafa",
      }}
    >
      <h2 style={{ marginTop: 0 }}>How to use</h2>

      <ol style={{ paddingLeft: 20, color: "#374151" }}>
        <li>Search place names, or click on the map to set a start point.</li>
        <li>Search again, or click again to set an end point.</li>
        <li>Compute routes and compare NO₂ / PM2.5 exposure.</li>
      </ol>

      <SearchBox
        label="Start"
        placeholder="Search a start place"
        value={startQuery}
        onChange={setStartQuery}
        onSelect={onSelectStart}
      />

      <SearchBox
        label="End"
        placeholder="Search an end place"
        value={endQuery}
        onChange={setEndQuery}
        onSelect={onSelectEnd}
      />

      <div style={{ marginTop: 12 }}>
        <p style={{ marginBottom: 8, fontWeight: 600 }}>Quick picks (UCL area)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {QUICK_PICKS.map((qp, i) => (
            <button
              key={i}
              onClick={() => onQuickPick(qp.start, qp.end)}
              style={{
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {status === "loading" && <p>Finding routes and analysing air quality...</p>}
        {status === "error" && <p style={{ color: "#b91c1c" }}>Failed to calculate routes.</p>}
        {status === "done" && (
          <RouteCards
            routes={routes}
            onHighlight={onHighlight}
            hoveredRoute={hoveredRoute}
            onHover={onHover}
          />
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <Feedback />
      </div>

      <div style={{ marginTop: 18, fontSize: 13, color: "#6b7280" }}>
        Data: LAEI 2022 | Routing: ORS / OSRM | Map: OpenStreetMap
      </div>
    </aside>
  );
}