import { useEffect, useRef, useState } from "react";
import SearchBox from "./SearchBox";
import RouteCards from "./RouteCards";
import Feedback from "./Feedback";
import Favorites from "./Favorites";

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
    start: [51.5415, -0.142],
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
      style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }}
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
        color: "#475569",
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
  focusRequest,
  onRequestFocus,
}) {
  const [noteRoute, setNoteRoute] = useState(null);
  const [pendingSavedRoute, setPendingSavedRoute] = useState(null);
  const [dismissedQuickPickLabel, setDismissedQuickPickLabel] = useState(null);

  const resultsFirstFilterRef = useRef(null);
  const routeNoteRef = useRef(null);
  const resultsRef = useRef(null);
  const previousStatusRef = useRef(status);
  const sidebarRootRef = useRef(null);
  const canJumpToMapLegend = status === "done" && routes?.length > 0;

  const [isCompactScreen, setIsCompactScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 680px)").matches;
  });

  useEffect(() => {
    setNoteRoute(null);
  }, [routes]);

  const matchedQuickPickLabel =
    QUICK_PICKS.find((qp) => matchesQuickPick(startPoint, endPoint, qp))
      ?.label ?? null;

  const activeQuickPickLabel =
    matchedQuickPickLabel &&
    matchedQuickPickLabel !== dismissedQuickPickLabel
      ? matchedQuickPickLabel
      : null;

  const focusWithoutPageJump = (element) => {
    if (!element) return;

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  };

  const getSidebarScrollContainer = () => {
    const root = sidebarRootRef.current;
    if (!root) return null;

    return root.closest("aside") || root.parentElement || root;
  };

  const scrollSidebarTo = (targetRef) => {
    const targetEl = targetRef.current;
    if (!targetEl) return;

    if (isCompactScreen) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    const sidebarEl = getSidebarScrollContainer();
    if (!sidebarEl) return;

    const rootRect = sidebarEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const offset = targetRect.top - rootRect.top + sidebarEl.scrollTop - 8;

    sidebarEl.scrollTo({
      top: Math.max(offset, 0),
      behavior: "smooth",
    });
  };

  useEffect(() => {
  if (!focusRequest) return;

  if (
    focusRequest.target === "results" &&
    status === "done" &&
    routes?.length
  ) {
    window.requestAnimationFrame(() => {
      scrollSidebarTo(resultsRef);
      focusWithoutPageJump(resultsRef.current);
    });
  }
}, [focusRequest, status, routes, isCompactScreen]);

  useEffect(() => {
  if (!focusRequest) return;

  if (
    focusRequest.target === "resultsFilters" &&
    status === "done" &&
    routes?.length
  ) {
    window.requestAnimationFrame(() => {
      scrollSidebarTo(resultsRef);
      focusWithoutPageJump(resultsFirstFilterRef.current);
    });
  }
}, [focusRequest, status, routes, isCompactScreen]);

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
    const mediaQuery = window.matchMedia("(max-width: 680px)");

    const handleChange = (event) => {
      setIsCompactScreen(event.matches);
    };

    setIsCompactScreen(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!dismissedQuickPickLabel) return;

    if (matchedQuickPickLabel !== dismissedQuickPickLabel) {
      setDismissedQuickPickLabel(null);
    }
  }, [matchedQuickPickLabel, dismissedQuickPickLabel]);

  const handleOpenNote = (target) => {
    setNoteRoute(target);

    window.requestAnimationFrame(() => {
      scrollSidebarTo(routeNoteRef);

      window.requestAnimationFrame(() => {
        focusWithoutPageJump(routeNoteRef.current);
      });
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
  
  const handleLoadFavoriteFromSidebar = (start, end, savedRoute = null) => {
  const matchingQuickPickLabel =
    QUICK_PICKS.find((qp) => matchesQuickPick(start, end, qp))?.label ?? null;

  setDismissedQuickPickLabel(matchingQuickPickLabel);
  onLoadFavorite(start, end, savedRoute);
};

  return (
    <div
      ref={sidebarRootRef}
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
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
          For UCL students and newcomers walking in Camden, this tool
          helps compare route options by air, noise, distance and 
          estimated time. It does not choose one “best” route for everyone.
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
          Search or click the map to set start and end points, then compare
          route options.
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
          Start with common walking journeys around Camden and UCL.
          Presets fill in the start and end points so you can compare
          routes quickly. They are starting points for comparison,
          not route recommendations.
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
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: isActive ? "2px solid #2563eb" : "1px solid #cbd5e1",
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
  onLoad={handleLoadFavoriteFromSidebar}
  selectedRoute={selectedRoute}
  pendingSavedRoute={pendingSavedRoute}
  onHandledPendingSavedRoute={() => setPendingSavedRoute(null)}
/>
      </section>

      <div style={{ padding: "0 20px 8px" }}>
        
      <button
  type="button"
  onClick={(event) => {
    event.preventDefault();

    if (!canJumpToMapLegend) return;

    onRequestFocus?.("mapLegend");
  }}
  aria-disabled={!canJumpToMapLegend}
  aria-label="Jump to the map legend on the map"
  style={{
    minHeight: 36,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    background: "#ffffff",
    color: !canJumpToMapLegend ? "#94a3b8" : "#0f172a",
    fontSize: 13,
    fontWeight: 600,
    cursor: canJumpToMapLegend ? "pointer" : "not-allowed",
    opacity: canJumpToMapLegend ? 1 : 0.7,
  }}
>
  Jump to map legend
</button>
      </div>

      <Divider />

      <section
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby="results-heading"
        style={{ padding: "0 20px", scrollMarginTop: 12 }}
      >
        <SectionHeading id="results-heading">Route results</SectionHeading>

        {status === "idle" && !routes.length && (
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              textAlign: "center",
              padding: "24px 0",
              margin: 0,
              lineHeight: 1.5,
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
              color: "#475569",
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
              color: "#b91c1c",
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
            firstFilterRef={resultsFirstFilterRef}
          />
        )}
      </section>

      <Divider />

      <section
        ref={routeNoteRef}
        tabIndex={-1}
        aria-labelledby="route-note-heading"
        style={{ padding: "0 20px 16px", scrollMarginTop: 12 }}
      >
        <SectionHeading id="route-note-heading">Route note</SectionHeading>

        {noteRoute ? (
          <Feedback activeRoute={noteRoute} />
        ) : (
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Choose a route card to add a note about this walk.
          </p>
        )}
      </section>

      <footer
        aria-label="Data sources"
        style={{
          padding: "10px 20px 16px",
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
          Air quality: LAEI 2022 &nbsp;·&nbsp; Noise: Defra / GLA &nbsp;·&nbsp; Routing:
  ORS &nbsp;·&nbsp; Map: OpenStreetMap
      </footer>
    </div>
  );
}