import { useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import "./App.css";

export default function App() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesInfo, setRoutesInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedRoute, setHighlightedRoute] = useState(null);
  const [status, setStatus] = useState("idle");
  const [quickPickRequest, setQuickPickRequest] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  const [filterMode, setFilterMode] = useState("overall");
  const [displayOrder, setDisplayOrder] = useState({});
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const requestFocus = (target) => {
  setFocusRequest({
    target,
    token: Date.now(),
  });
};
const normaliseSavedRoute = (savedRoute) => {
  if (!savedRoute) return null;

  // old:sonFeature + info
  if (savedRoute.geojsonFeature && savedRoute.info) {
    return savedRoute;
  }

  // new: RouteCards Save route
  if (savedRoute.geometry) {
    const routeName = savedRoute.routeLabel || "Saved route";

    return {
      geojsonFeature: {
        type: "Feature",
        properties: {
          name: routeName,
        },
        geometry: savedRoute.geometry,
      },
      info: {
        id: savedRoute.routeId ?? 0,
        originalIndex: 0,
        name: routeName,
        distance: savedRoute.summary?.distance ?? null,
        duration: savedRoute.summary?.duration ?? null,
        avgNO2: savedRoute.summary?.avgNO2 ?? null,
        avgPM25: savedRoute.summary?.avgPM25 ?? null,
        airCoverage: savedRoute.summary?.airCoverage ?? null,
        avgNoise: savedRoute.summary?.avgNoise ?? null,
        noiseCoverage: savedRoute.summary?.noiseCoverage ?? null,
        dangerPct: savedRoute.summary?.dangerPct ?? null,
        geometry: savedRoute.geometry ?? null,
        highPollutionPoints: savedRoute.summary?.highPollutionPoints ?? [],
        highNoisePoints: savedRoute.summary?.highNoisePoints ?? [],
      },
    };
  }

  return null;
};
  const handleQuickPick = (start, end) => {
  const nextStart = {
    lat: start[0],
    lng: start[1],
    label: `${start[0].toFixed(4)}, ${start[1].toFixed(4)}`,
  };
  const nextEnd = {
    lat: end[0],
    lng: end[1],
    label: `${end[0].toFixed(4)}, ${end[1].toFixed(4)}`,
  };

  setStartPoint(nextStart);
  setEndPoint(nextEnd);
  setStartQuery(nextStart.label);
  setEndQuery(nextEnd.label);
  setQuickPickRequest({ start, end, timestamp: Date.now() });

  requestFocus("results");
};

  const handleSelectStart = (place) => {
    setStartPoint(place);
    setStartQuery(place.label);
    setStatus("idle");
  };

  const handleSelectEnd = (place) => {
  setEndPoint(place);
  setEndQuery(place.label);
  setStatus("idle");

  if (startPoint) {
    requestFocus("compute");
  }
};

const handleLoadFavorite = (start, end, savedRoute = null) => {
  setStartPoint(start);
  setEndPoint(end);
  setStartQuery(start.label);
  setEndQuery(end.label);

  const normalisedSavedRoute = normaliseSavedRoute(savedRoute);

  if (normalisedSavedRoute) {
    setQuickPickRequest(null);
    setRoutesGeojson({
      type: "FeatureCollection",
      features: [normalisedSavedRoute.geojsonFeature],
    });
    setRoutesInfo([{ ...normalisedSavedRoute.info, originalIndex: 0 }]);
    setHighlightedRoute(null);
    setStatus("done");
    requestFocus("resultsFilters");
    return;
  }

  // If there is no specific route, recalculate based on the trip
  setRoutesGeojson(null);
  setRoutesInfo([]);
  setHighlightedRoute(null);
  setStatus("idle");

  setQuickPickRequest({
    start: [start.lat, start.lng],
    end: [end.lat, end.lng],
    timestamp: Date.now(),
  });

  requestFocus("resultsFilters");
};

  const selectedRoute =
    highlightedRoute != null && routesGeojson?.features?.[highlightedRoute]
      ? {
          geojsonFeature: routesGeojson.features[highlightedRoute],
          info: routesInfo[highlightedRoute],
        }
      : null;
let liveMessage = "";

if (loading) {
  liveMessage = "Loading walking routes.";
} else if (status === "done" && routesInfo.length > 0) {
  liveMessage = `${routesInfo.length} route options available.`;
} else if (status === "done" && routesInfo.length === 0) {
  liveMessage = "No route options available.";
} else if (status === "error") {
  liveMessage = "There was a problem loading route options.";
}
return (
  <div className="app-shell">
    <header className="app-header">
  <h1>Urban Walking Route Explorer</h1>
  <p className="subtitle">
    Compare walking routes by air quality, noise, and travel time around UCL.
  </p>
</header>
<div className="sr-only" aria-live="polite" aria-atomic="true">
  {liveMessage}
</div>
    <main className="app-main" aria-label="Route planning workspace">
      <section className="map-panel" aria-label="Map panel">
        <MapView
          routesGeojson={routesGeojson}
          setRoutesGeojson={setRoutesGeojson}
          routesInfo={routesInfo}
          setRoutesInfo={setRoutesInfo}
          loading={loading}
          setLoading={setLoading}
          highlightedRoute={highlightedRoute}
          setHighlightedRoute={setHighlightedRoute}
          status={status}
          setStatus={setStatus}
          quickPickRequest={quickPickRequest}
          startPoint={startPoint}
          endPoint={endPoint}
          setStartPoint={setStartPoint}
          setEndPoint={setEndPoint}
          setStartQuery={setStartQuery}
          setEndQuery={setEndQuery}
          filterMode={filterMode}
          displayOrder={displayOrder}
          focusRequest={focusRequest}
          onRequestFocus={requestFocus}
        />
      </section>

      <aside aria-label="Route planning and results">
        <Sidebar
          status={status}
          loading={loading}
          routes={routesInfo}
          onHighlight={setHighlightedRoute}
          onFilterChange={setFilterMode}
          onDisplayOrderChange={setDisplayOrder}
          onQuickPick={handleQuickPick}
          startQuery={startQuery}
          endQuery={endQuery}
          setStartQuery={setStartQuery}
          setEndQuery={setEndQuery}
          onSelectStart={handleSelectStart}
          onSelectEnd={handleSelectEnd}
          startPoint={startPoint}
          endPoint={endPoint}
          onLoadFavorite={handleLoadFavorite}
          selectedRoute={selectedRoute}
          focusRequest={focusRequest}
          onRequestFocus={requestFocus}
        />
      </aside>
    </main>
  </div>
);}