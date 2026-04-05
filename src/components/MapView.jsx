import { useEffect, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadLAEIData, scoreRoute } from "../utils/pollution";
import { scoreRouteNoise } from "../utils/noise";
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
  const isPrimary = index === 0;

  return {
    id: `route-layer-${index}`,
    type: "line",
    paint: {
      "line-color": isHighlighted
        ? "#dc2626"
        : isPrimary
        ? "#1d4ed8"
        : "#6b7280",
      "line-width": isHighlighted ? 7 : isPrimary ? 5 : 3,
      "line-opacity": isHighlighted ? 0.95 : 0.85,
      "line-dasharray": isPrimary ? [1, 0] : [2, 2],
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

      if (!res.ok) {
        throw new Error(`ORS request failed: ${res.status}`);
      }

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

    const nextStart = {
      lat: startLat,
      lng: startLng,
      label: "Quick pick start",
    };
    const nextEnd = {
      lat: endLat,
      lng: endLng,
      label: "Quick pick end",
    };

    setStartPoint(nextStart);
    setEndPoint(nextEnd);
    setStartQuery?.(nextStart.label);
    setEndQuery?.(nextEnd.label);

    clearRouteResults();
    setStatus?.("idle");

    fetchRoute(nextStart, nextEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickPickRequest]);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{ marginBottom: 8 }}>Urban Safety Walk</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Search place names or click the map to set a start and end point, then
        compute routes.
      </p>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "900px",
          height: "550px",
          border: "2px solid #cbd5e1",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#eee",
        }}
      >
        <Map
          mapLib={maplibregl}
          initialViewState={{
            longitude: -0.1276,
            latitude: 51.5072,
            zoom: 12,
          }}
          mapStyle={SIMPLE_RASTER_STYLE}
          style={{ width: "100%", height: "100%" }}
          onClick={handleMapClick}
        >
          {startPoint && (
            <Marker
              longitude={startPoint.lng}
              latitude={startPoint.lat}
              color="green"
            />
          )}

          {endPoint && (
            <Marker
              longitude={endPoint.lng}
              latitude={endPoint.lat}
              color="red"
            />
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

        {/* Noise legend panel — bottom-right inside the map container */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 12,
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          <NoiseLegend
            show={showNoise}
            onToggle={() => setShowNoise((v) => !v)}
            opacity={noiseOpacity}
            onOpacityChange={setNoiseOpacity}
          />
        </div>
      </div>

      <div style={{ marginTop: 16, maxWidth: "900px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => fetchRoute()}
            disabled={!startPoint || !endPoint || loading}
            style={{
              padding: "8px 14px",
              cursor:
                !startPoint || !endPoint || loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading ? "Loading..." : "Compute route"}
          </button>

          <button
            onClick={resetAll}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        <p>
          <strong>Start:</strong>{" "}
          {startPoint
            ? `${startPoint.lng.toFixed(5)}, ${startPoint.lat.toFixed(5)}`
            : "Not set"}
        </p>
        <p>
          <strong>End:</strong>{" "}
          {endPoint
            ? `${endPoint.lng.toFixed(5)}, ${endPoint.lat.toFixed(5)}`
            : "Not set"}
        </p>

        <p>
          <strong>Status:</strong> {status}
        </p>

        {highlightedRoute != null && routesInfo?.[highlightedRoute] && (
          <p style={{ color: "#374151", marginTop: 8 }}>
            <strong>Highlighted:</strong> {routesInfo[highlightedRoute].name}
          </p>
        )}
      </div>
    </div>
  );
}