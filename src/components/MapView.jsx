import { useEffect, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadLAEIData, scoreRoute } from "../utils/pollution";
import { scoreRouteNoise } from "../utils/noise";
import { ROUTE_COLORS } from "../utils/routeColors";
import NoisePollutionLayer from "./NoisePollutionLayer";
import NoiseLegend from "./NoiseLegend";

const SIMPLE_RASTER_STYLE = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function getRouteLayerStyle(index, highlightedRoute) {
  const isHighlighted = highlightedRoute === index;
  const hasSelection = highlightedRoute !== null;
  const isDimmed = hasSelection && !isHighlighted;
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

  return {
    id: `route-layer-${index}`,
    type: "line",
    paint: {
      "line-color": color,
      "line-width": isHighlighted ? 7 : 4,
      "line-opacity": isDimmed ? 0.15 : 0.85,
      "line-dasharray": [1, 0],
    },
  };
}

export default function MapView({
  routesGeojson,
  setRoutesGeojson,
  routesInfo,
  setRoutesInfo,
  loading,
  setLoading,
  highlightedRoute,
  setHighlightedRoute,
  status,
  setStatus,
  quickPickRequest,
  startPoint,
  endPoint,
  setStartPoint,
  setEndPoint,
  setStartQuery,
  setEndQuery,
}) {
  const [showNoise, setShowNoise] = useState(false);
  const [noiseOpacity, setNoiseOpacity] = useState(0.55);

  const clearRouteResults = () => {
    setRoutesGeojson(null);
    setRoutesInfo([]);
    setHighlightedRoute?.(null);
  };

  const resetAll = () => {
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery?.("");
    setEndQuery?.("");
    clearRouteResults();
    setStatus?.("idle");
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;

    if (!startPoint) {
      const nextStart = {
        lat,
        lng,
        label: `Pinned start (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      };
      setStartPoint(nextStart);
      setStartQuery?.(nextStart.label);
      setEndPoint(null);
      setEndQuery?.("");
      clearRouteResults();
      setStatus?.("idle");
      return;
    }

    if (!endPoint) {
      const nextEnd = {
        lat,
        lng,
        label: `Pinned end (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      };
      setEndPoint(nextEnd);
      setEndQuery?.(nextEnd.label);
      setHighlightedRoute?.(null);
      setStatus?.("idle");
      return;
    }

    const nextStart = {
      lat,
      lng,
      label: `Pinned start (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    };
    setStartPoint(nextStart);
    setStartQuery?.(nextStart.label);
    setEndPoint(null);
    setEndQuery?.("");
    clearRouteResults();
    setStatus?.("idle");
  };

  const fetchRoute = async (customStart = null, customEnd = null) => {
    const activeStart = customStart || startPoint;
    const activeEnd = customEnd || endPoint;

    if (!activeStart || !activeEnd) return;

    setLoading(true);
    setHighlightedRoute?.(null);
    setStatus?.("loading");

    try {
      await loadLAEIData();

      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
        {
          method: "POST",
          headers: {
            Authorization: import.meta.env.VITE_ORS_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [
              [activeStart.lng, activeStart.lat],
              [activeEnd.lng, activeEnd.lat],
            ],
            alternative_routes: {
              target_count: 3,
              share_factor: 0.6,
              weight_factor: 1.4,
            },
          }),
        }
      );

      if (!res.ok) throw new Error(`ORS request failed: ${res.status}`);

      const data = await res.json();
      setRoutesGeojson(data);

      const parsedRoutes = await Promise.all(
        (data?.features ?? []).map(async (feature, index) => {
          const props = feature?.properties || {};

          const distance =
            props.segments?.[0]?.distance ??
            props.summary?.distance ??
            props.distance ??
            null;

          const duration =
            props.segments?.[0]?.duration ??
            props.summary?.duration ??
            props.duration ??
            null;

          const coords = feature?.geometry?.coordinates || [];
          const pollutionResult = scoreRoute(coords);
          const noiseResult = await scoreRouteNoise(coords);

          return {
            id: index,
            originalIndex: index,
            name:
              feature?.properties?.name ||
              `Route ${String.fromCharCode(65 + index)}`,
            distance,
            duration,
            avgNO2: pollutionResult?.avgNO2 ?? null,
            avgPM25: pollutionResult?.avgPM25 ?? null,
            dataCoverage: pollutionResult?.dataCoverage ?? null,
            avgNoise: noiseResult?.avgNoise ?? null,
            dangerPct: noiseResult?.dangerPct ?? null,
            geometry: feature?.geometry ?? null,
          };
        })
      );

      setRoutesInfo(parsedRoutes);
      setStatus?.("done");
    } catch (error) {
      console.error(error);
      alert("Failed to fetch route or pollution data. Check your ORS key, data file, or network.");
      setStatus?.("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!quickPickRequest) return;

    const [startLat, startLng] = quickPickRequest.start;
    const [endLat, endLng] = quickPickRequest.end;

    const nextStart = { lat: startLat, lng: startLng, label: "Quick pick start" };
    const nextEnd = { lat: endLat, lng: endLng, label: "Quick pick end" };

    setStartPoint(nextStart);
    setEndPoint(nextEnd);
    setStartQuery?.(nextStart.label);
    setEndQuery?.(nextEnd.label);

    clearRouteResults();
    setStatus?.("idle");

    fetchRoute(nextStart, nextEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickPickRequest]);

  const canCompute = startPoint && endPoint && !loading;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
      {/* Map fills all available height */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <Map
          mapLib={maplibregl}
          initialViewState={{ longitude: -0.1276, latitude: 51.5072, zoom: 12 }}
          mapStyle={SIMPLE_RASTER_STYLE}
          style={{ width: "100%", height: "100%" }}
          onClick={handleMapClick}
        >
          {startPoint && (
            <Marker longitude={startPoint.lng} latitude={startPoint.lat} color="#16a34a" />
          )}
          {endPoint && (
            <Marker longitude={endPoint.lng} latitude={endPoint.lat} color="#dc2626" />
          )}

          {showNoise && <NoisePollutionLayer opacity={noiseOpacity} />}

          {routesGeojson?.features?.map((feature, index) => (
            <Source
              key={`route-src-${index}`}
              id={`route-src-${index}`}
              type="geojson"
              data={feature}
            >
              <Layer {...getRouteLayerStyle(index, highlightedRoute)} />
            </Source>
          ))}
        </Map>

        {/* Noise legend */}
        <div style={{ position: "absolute", bottom: 24, right: 12, zIndex: 10 }}>
          <NoiseLegend
            show={showNoise}
            onToggle={() => setShowNoise((v) => !v)}
            opacity={noiseOpacity}
            onOpacityChange={setNoiseOpacity}
          />
        </div>

        {/* Click hint when no points set */}
        {!startPoint && (
          <div style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,41,59,0.85)",
            color: "white",
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: 20,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            Click on the map to set a start point
          </div>
        )}
        {startPoint && !endPoint && (
          <div style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,41,59,0.85)",
            color: "white",
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: 20,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            Now click to set an end point
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "white",
        borderTop: "1px solid #e2e8f0",
        flexShrink: 0,
      }}>
        <button
          onClick={() => fetchRoute()}
          disabled={!canCompute}
          aria-label="Compute walking routes"
          style={{
            padding: "8px 20px",
            background: canCompute ? "#2563eb" : "#e2e8f0",
            color: canCompute ? "white" : "#94a3b8",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: canCompute ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Calculating…" : "Compute routes"}
        </button>

        <button
          onClick={resetAll}
          aria-label="Reset map"
          style={{
            padding: "8px 16px",
            background: "white",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          Reset
        </button>

        {/* Route colour legend */}
        {routesGeojson?.features?.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginLeft: 8 }}>
            {routesGeojson.features.map((_, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}
              >
                <span style={{
                  display: "inline-block",
                  width: 20,
                  height: 4,
                  borderRadius: 2,
                  background: ROUTE_COLORS[i % ROUTE_COLORS.length],
                }} />
                Route {String.fromCharCode(65 + i)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
