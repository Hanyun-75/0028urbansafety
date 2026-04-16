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

  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");

  const handleQuickPick = (start, end) => {
    const nextStart = { lat: start[0], lng: start[1], label: `${start[0].toFixed(4)}, ${start[1].toFixed(4)}` };
    const nextEnd = { lat: end[0], lng: end[1], label: `${end[0].toFixed(4)}, ${end[1].toFixed(4)}` };
    setStartPoint(nextStart);
    setEndPoint(nextEnd);
    setStartQuery(nextStart.label);
    setEndQuery(nextEnd.label);
    setQuickPickRequest({ start, end, timestamp: Date.now() });
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
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-dot" aria-hidden="true" />
        <h1>Urban Walking Route Explorer</h1>
        <span className="subtitle">Compare walking routes by air quality, noise, and travel time around UCL.</span>
      </header>

      <div className="app-main">
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
        />

        <Sidebar
          status={status}
          loading={loading}
          routes={routesInfo}
          onHighlight={setHighlightedRoute}
          onQuickPick={handleQuickPick}
          startQuery={startQuery}
          endQuery={endQuery}
          setStartQuery={setStartQuery}
          setEndQuery={setEndQuery}
          onSelectStart={handleSelectStart}
          onSelectEnd={handleSelectEnd}
        />
      </div>
    </div>
  );
}
