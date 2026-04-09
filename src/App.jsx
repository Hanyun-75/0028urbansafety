import { useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";

export default function App() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesInfo, setRoutesInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedRoute, setHighlightedRoute] = useState(null);
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [status, setStatus] = useState("idle");
  const [quickPickRequest, setQuickPickRequest] = useState(null);

  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");

  const handleQuickPick = (start, end) => {
    const nextStart = { lat: start[0], lng: start[1], label: "Quick pick start" };
    const nextEnd = { lat: end[0], lng: end[1], label: "Quick pick end" };

    setStartPoint(nextStart);
    setEndPoint(nextEnd);
    setStartQuery(nextStart.label);
    setEndQuery(nextEnd.label);

    setQuickPickRequest({
      start,
      end,
      timestamp: Date.now(),
    });
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
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
        padding: 20,
      }}
    >
      <MapView
  routesGeojson={routesGeojson}
  setRoutesGeojson={setRoutesGeojson}
  routesInfo={routesInfo}
  setRoutesInfo={setRoutesInfo}
  loading={loading}
  setLoading={setLoading}
  highlightedRoute={highlightedRoute}
  setHighlightedRoute={setHighlightedRoute}
  hoveredRoute={hoveredRoute}
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
        routes={routesInfo}
        onHighlight={setHighlightedRoute}
        hoveredRoute={hoveredRoute}
        onHover={setHoveredRoute}
        onQuickPick={handleQuickPick}
        startQuery={startQuery}
        endQuery={endQuery}
        setStartQuery={setStartQuery}
        setEndQuery={setEndQuery}
        onSelectStart={handleSelectStart}
        onSelectEnd={handleSelectEnd}
      />
    </div>
  );
}