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

function getRouteLayerStyle(index, highlightedRoute, displayIdx) {
  const isHighlighted = highlightedRoute === index;
  const hasSelection = highlightedRoute !== null;
  const isDimmed = hasSelection && !isHighlighted;
  const color = ROUTE_COLORS[(displayIdx ?? index) % ROUTE_COLORS.length];

  return {
    id: `route-layer-${index}`,
    type: "line",
    paint: {
      "line-color": color,
      "line-width": isHighlighted ? 6 : 3.5,
      "line-opacity": isDimmed ? 0.2 : 0.9,
      "line-dasharray": isHighlighted ? [1, 0] : [2, 2],
    },
  };
}

function pointsToGeoJSON(points) {
  return {
    type: "FeatureCollection",
    features: points.map((coord) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: coord },
    })),
  };
}

function getRouteLabelPoint(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length === 0) return null;
  const mid = Math.floor(coords.length / 2);
  return coords[mid];
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
  setStatus,
  quickPickRequest,
  startPoint,
  endPoint,
  setStartPoint,
  setEndPoint,
  setStartQuery,
  setEndQuery,
  filterMode,
  displayOrder,
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

  const reverseGeocode = async (lat, lng) => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({ lat, lon: lng, format: "jsonv2", zoom: 18 }).toString();
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};
      return addr.road || addr.pedestrian || addr.footway || addr.neighbourhood || data.name || null;
    } catch {
      return null;
    }
  };

  const setPointWithGeocode = (lat, lng, setPoint, setQuery) => {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const point = { lat, lng, label: fallback };
    setPoint(point);
    setQuery?.(fallback);
    reverseGeocode(lat, lng).then((name) => {
      if (!name) return;
      setPoint((prev) => prev && prev.lat === lat && prev.lng === lng ? { ...prev, label: name } : prev);
      setQuery?.(name);
    });
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;

    if (!startPoint) {
      setPointWithGeocode(lat, lng, setStartPoint, setStartQuery);
      setEndPoint(null);
      setEndQuery?.("");
      clearRouteResults();
      setStatus?.("idle");
      return;
    }

    if (!endPoint) {
      setPointWithGeocode(lat, lng, setEndPoint, setEndQuery);
      setHighlightedRoute?.(null);
      setStatus?.("idle");
      return;
    }

    setPointWithGeocode(lat, lng, setStartPoint, setStartQuery);
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
            highPollutionPoints: pollutionResult?.highPollutionPoints ?? [],
            highNoisePoints: noiseResult?.highNoisePoints ?? [],
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

    const startFallback = `${startLat.toFixed(4)}, ${startLng.toFixed(4)}`;
    const endFallback = `${endLat.toFixed(4)}, ${endLng.toFixed(4)}`;
    const nextStart = { lat: startLat, lng: startLng, label: startFallback };
    const nextEnd = { lat: endLat, lng: endLng, label: endFallback };

    setStartPoint(nextStart);
    setEndPoint(nextEnd);
    setStartQuery?.(startFallback);
    setEndQuery?.(endFallback);

    clearRouteResults();
    setStatus?.("idle");

    fetchRoute(nextStart, nextEnd);

    reverseGeocode(startLat, startLng).then((name) => {
      if (!name) return;
      setStartPoint((prev) => prev && prev.lat === startLat ? { ...prev, label: name } : prev);
      setStartQuery?.(name);
    });
    reverseGeocode(endLat, endLng).then((name) => {
      if (!name) return;
      setEndPoint((prev) => prev && prev.lat === endLat ? { ...prev, label: name } : prev);
      setEndQuery?.(name);
    });
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

          {/* Camden borough outline */}
          <Source id="camden-outline" type="geojson" data="/data/Final_Borough_Map.geojson">
            <Layer
              id="camden-border"
              type="line"
              filter={["==", ["get", "NAME"], "Camden"]}
              paint={{ "line-color": "#2563eb", "line-width": 2.5, "line-opacity": 0.9 }}
            />
          </Source>

          {/* Route lines */}
          {routesGeojson?.features?.map((feature, index) => {
            const dIdx = displayOrder?.[index] ?? index;
            return (
              <Source
                key={`route-src-${index}`}
                id={`route-src-${index}`}
                type="geojson"
                data={feature}
              >
                <Layer {...getRouteLayerStyle(index, highlightedRoute, dIdx)} />
              </Source>
            );
          })}

          {/* Hazard dots — on top of route lines, filtered by mode */}
          {(filterMode === "air" || filterMode === "overall") && routesInfo.map((route) => {
            const idx = route.originalIndex;
            const dimmed = highlightedRoute !== null && highlightedRoute !== idx;
            const pts = pointsToGeoJSON(route.highPollutionPoints || []);
            return pts.features.length > 0 ? (
              <Source key={`poll-pts-${idx}`} id={`poll-pts-${idx}`} type="geojson" data={pts}>
                <Layer
                  id={`poll-dots-${idx}`}
                  type="circle"
                  paint={{
                    "circle-radius": 4.5,
                    "circle-color": "#dc2626",
                    "circle-opacity": dimmed ? 0.08 : 0.85,
                    "circle-stroke-width": 1.5,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-opacity": dimmed ? 0.08 : 0.9,
                  }}
                />
              </Source>
            ) : null;
          })}
          {(filterMode === "noise" || filterMode === "overall") && routesInfo.map((route) => {
            const idx = route.originalIndex;
            const dimmed = highlightedRoute !== null && highlightedRoute !== idx;
            const pts = pointsToGeoJSON(route.highNoisePoints || []);
            return pts.features.length > 0 ? (
              <Source key={`noise-pts-${idx}`} id={`noise-pts-${idx}`} type="geojson" data={pts}>
                <Layer
                  id={`noise-dots-${idx}`}
                  type="circle"
                  paint={{
                    "circle-radius": 3.5,
                    "circle-color": "#f59e0b",
                    "circle-opacity": dimmed ? 0.08 : 0.85,
                    "circle-stroke-width": 1.5,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-opacity": dimmed ? 0.08 : 0.9,
                  }}
                />
              </Source>
            ) : null;
          })}

          {/* Route labels A/B/C on map */}
          {routesGeojson?.features?.map((feature, index) => {
            const pt = getRouteLabelPoint(feature);
            if (!pt) return null;
            const dIdx = displayOrder?.[index] ?? index;
            const isHidden = highlightedRoute !== null && highlightedRoute !== index;
            return (
              <Marker
                key={`route-label-${index}`}
                longitude={pt[0]}
                latitude={pt[1]}
                anchor="center"
              >
                <div style={{
                  background: ROUTE_COLORS[dIdx % ROUTE_COLORS.length],
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  opacity: isHidden ? 0.15 : 1,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                }}>
                  {String.fromCharCode(65 + dIdx)}
                </div>
              </Marker>
            );
          })}
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

        {/* Hazard legend */}
        {routesGeojson?.features?.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginLeft: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#dc2626", border: "1.5px solid white", boxShadow: "0 0 0 1px #d1d5db" }} />
              NO₂{">"}40 or PM2.5{">"}15
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", border: "1.5px solid white", boxShadow: "0 0 0 1px #d1d5db" }} />
              Noise{"≥"}75 dB
            </span>
          </div>
        )}

        {/* Route colour legend */}
        {routesGeojson?.features?.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginLeft: 8 }}>
            {routesGeojson.features.map((_, i) => {
              const dIdx = displayOrder?.[i] ?? i;
              const color = ROUTE_COLORS[dIdx % ROUTE_COLORS.length];
              const isHL = highlightedRoute === i;
              return (
                <span
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}
                >
                  <span style={{
                    display: "inline-block",
                    width: 20,
                    height: 0,
                    borderTop: isHL ? `3px solid ${color}` : `3px dashed ${color}`,
                  }} />
                  Route {String.fromCharCode(65 + dIdx)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
