import SearchBox from "./SearchBox";
import RouteCards from "./RouteCards";
import Feedback from "./Feedback";
import Favorites from "./Favorites";
import { useState, useEffect, useRef } from "react";



const QUICK_PICKS = [
  {
    label: "King's Cross to UCL",
    start: [51.53, -0.123],
    end: [51.5248, -0.134],
  },
  {
    label: "Euston to IOE",
    start: [51.5282, -0.1337],
    end: [51.5228, -0.1288],
  },
  {
    label: "Camden Market to Primrose Hill",
    start: [51.5415, -0.1420],
    end: [51.5387, -0.1516],
  },
  {
    label: "Camden Town to London Zoo",
    start: [51.5392, -0.1426],
    end: [51.5353, -0.1534],
  },
];

function isCloseCoord(a, b, tolerance = 0.0003) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  return (
    Math.abs(Number(a[0]) - Number(b[0])) <= tolerance &&
    Math.abs(Number(a[1]) - Number(b[1])) <= tolerance
  );
}

function matchesQuickPick(startPoint, endPoint, quickPick) {
  if (!startPoint || !endPoint) return false;

  const currentStart = [Number(startPoint.lat), Number(startPoint.lng)];
  const currentEnd = [Number(endPoint.lat), Number(endPoint.lng)];

  return (
    isCloseCoord(currentStart, quickPick.start) &&
    isCloseCoord(currentEnd, quickPick.end)
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{ height: 1, background: "#f1f5f9", margin: "16px 0" }}
    />
  );
}

function SectionHeading({ id, children }) {
  return (
    <h2
      id={id}
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        margin: "0 0 10px 0",
      }}
    >
      {children}
    </h2>
  );
}

export default function Sidebar({
  status,
  routes,
  onHighlight,
  onQuickPick,
  startQuery,
  endQuery,
  setStartQuery,
  setEndQuery,
  onSelectStart,
  onSelectEnd,
  startPoint,
  endPoint,
  onLoadFavorite,
  selectedRoute,
  onFilterChange,
  onDisplayOrderChange,
}) {



const [noteRoute, setNoteRoute] = useState(null);
const [pendingSavedRoute, setPendingSavedRoute] = useState(null);
const [dismissedQuickPickLabel, setDismissedQuickPickLabel] = useState(null);

const routeNoteRef = useRef(null);
const resultsRef = useRef(null);
const previousStatusRef = useRef(status);
const sidebarRef = useRef(null);
useEffect(() => {
  setNoteRoute(null);
}, [routes]);

const matchedQuickPickLabel =
  QUICK_PICKS.find((qp) => matchesQuickPick(startPoint, endPoint, qp))?.label ??
  null;

const activeQuickPickLabel =
  matchedQuickPickLabel &&
  matchedQuickPickLabel !== dismissedQuickPickLabel
    ? matchedQuickPickLabel
    : null;
useEffect(() => {
  const becameDone =
    previousStatusRef.current !== "done" && status === "done";

  if (becameDone && routes?.length) {
    window.requestAnimationFrame(() => {
      scrollSidebarTo(resultsRef);
    });
  }

  previousStatusRef.current = status;
}, [status, routes]);
useEffect(() => {
  if (!dismissedQuickPickLabel) return;

  if (matchedQuickPickLabel !== dismissedQuickPickLabel) {
    setDismissedQuickPickLabel(null);
  }
}, [matchedQuickPickLabel, dismissedQuickPickLabel]);

const scrollSidebarTo = (targetRef) => {
  const sidebarEl = sidebarRef.current;
  const targetEl = targetRef.current;

  if (!sidebarEl || !targetEl) return;

  const top = targetEl.offsetTop - 8;

  sidebarEl.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth",
  });
};

const handleOpenNote = (target) => {
  setNoteRoute(target);

  window.requestAnimationFrame(() => {
    scrollSidebarTo(routeNoteRef);
  });
};
const handleQuickPickClick = (qp) => {
  const isCurrentlyActive = activeQuickPickLabel === qp.label;

  if (isCurrentlyActive) {
    setDismissedQuickPickLabel(qp.label);
    return;
  }

  setDismissedQuickPickLabel(null);
  onQuickPick(qp.start, qp.end);
};


  return (
<aside
  ref={sidebarRef}
  aria-label="Route planner"
  style={{
    width: 380,
    flexShrink: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "white",
    borderLeft: "1px solid #e2e8f0",
    overflowY: "auto",
  }}
>
      <div
        style={{
          padding: "12px 20px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          For students and newcomers walking around central London, this
          prototype helps compare route trade-offs rather than giving a single
          “best” answer.
        </p>
      </div>

      <section
        aria-labelledby="search-section-heading"
        style={{ padding: "16px 20px" }}
      >
        <SectionHeading id="search-section-heading">Plan a route</SectionHeading>

        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            marginTop: 0,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Search or click the map to set start and end points, then compute
          routes.
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
      </section>

      <Divider />

      <section
  aria-labelledby="quick-picks-heading"
  style={{ padding: "0 20px 16px" }}
>
  <SectionHeading id="quick-picks-heading">Quick routes</SectionHeading>

  <p
    style={{
      fontSize: 12,
      color: "#64748b",
      lineHeight: 1.5,
      marginTop: 0,
      marginBottom: 10,
    }}
  >
  Start with a common route. These suggestions include student journeys and
  visitor walks, so you can compare options quickly without setting points
  manually. Most stay within the current study area, where air-quality and
  noise coverage is more complete.
  </p>

  <ul
    style={{
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    {QUICK_PICKS.map((qp) => {
      const isActive = activeQuickPickLabel === qp.label;

      return (
        <li key={qp.label}>
          <button
            type="button"
            onClick={() => handleQuickPickClick(qp)}
            aria-pressed={isActive}
            aria-label={`${isActive ? "Selected quick route" : "Load quick route"}: ${qp.label}`}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "10px 12px",
              borderRadius: 8,
              border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
              background: isActive ? "#eff6ff" : "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 13,
              color: isActive ? "#1d4ed8" : "#374151",
              fontWeight: isActive ? 600 : 500,
              lineHeight: 1.4,
              outlineOffset: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>{qp.label}</span>

            {isActive && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  background: "#ffffff",
                  borderRadius: 999,
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Selected
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
</section>

      <Divider />

      <section style={{ padding: "0 20px 16px" }}>
  <Favorites
  startPoint={startPoint}
  endPoint={endPoint}
  onLoad={onLoadFavorite}
  selectedRoute={selectedRoute}
  pendingSavedRoute={pendingSavedRoute}
  onHandledPendingSavedRoute={() => setPendingSavedRoute(null)}
/>
</section>

      <Divider />

      <section
  ref={resultsRef}
  aria-labelledby="results-heading"
  style={{ padding: "0 20px" }}
>
        <SectionHeading id="results-heading">Route results</SectionHeading>

        {status === "idle" && !routes.length && (
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              textAlign: "center",
              padding: "24px 0",
              margin: 0,
            }}
          >
            Set a start and end point to see route options.
          </p>
        )}

        {status === "loading" && (
          <div
            role="status"
            aria-live="polite"
            style={{
              textAlign: "center",
              padding: "28px 0",
              color: "#64748b",
            }}
          >
            <div
              aria-hidden="true"
              style={{ fontSize: 22, marginBottom: 8 }}
            >
              🔍
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Finding routes…
            </div>
            <div style={{ fontSize: 13 }}>
              Analysing air quality and noise
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Could not calculate routes. Please check your connection and try
            again.
          </div>
        )}

        {status === "done" && routes.length > 0 && (
          <RouteCards
  routes={routes}
  onHighlight={onHighlight}
  onFilterChange={onFilterChange}
  onDisplayOrderChange={onDisplayOrderChange}
  onOpenNote={handleOpenNote}
  onSaveRoute={setPendingSavedRoute}
  startPoint={startPoint}
  endPoint={endPoint}
          />
        )}
      </section>

      <Divider />

      <section
  ref={routeNoteRef}
  aria-labelledby="route-note-heading"
  style={{ padding: "0 20px 16px" }}
      >
        <SectionHeading id="route-note-heading">Route note</SectionHeading>

        {noteRoute ? (
          <Feedback activeRoute={noteRoute} />
        ) : (
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Choose a route card to add a note about this walk.
          </p>
        )}
      </section>

      <div
        style={{
          padding: "10px 20px 16px",
          fontSize: 11,
          color: "#cbd5e1",
          lineHeight: 1.5,
        }}
      >
        Air quality: LAEI 2022 &nbsp;·&nbsp; Routing: ORS &nbsp;·&nbsp; Map:
        OpenStreetMap
      </div>
    </aside>
  );
}