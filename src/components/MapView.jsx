import { useEffect, useRef, useState } from "react";
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

const CAMDEN_BOUNDARY_URL = "/data/camden_boundaryweb.geojson";

const CAMDEN_BOUNDS = [
  [-0.2135, 51.5127], // west, south
  [-0.1053, 51.5730], // east, north
];

const CAMDEN_INITIAL_VIEW = {
  longitude: -0.159,
  latitude: 51.543,
  zoom: 12.4,
};

const CAMDEN_PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

const MASK_OUTER_RING = [
  [-0.62, 51.28],
  [0.38, 51.28],
  [0.38, 51.72],
  [-0.62, 51.72],
  [-0.62, 51.28],
];

const srOnlyStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
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
      "line-width": isHighlighted ? 6 : 4,
      "line-opacity": isDimmed ? 0.22 : 0.92,
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

function getCamdenFeatureFromGeoJSON(data) {
  if (!data) return null;

  if (data.type === "Feature" && data?.properties?.NAME === "Camden") {
    return data;
  }

  if (data.type === "FeatureCollection") {
    return (
      data.features?.find((feature) => feature?.properties?.NAME === "Camden") ||
      data.features?.[0] ||
      null
    );
  }

  return null;
}

function getCamdenHoleRings(geometry) {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0]];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0]);
  }

  return [];
}

function buildMaskGeoJSON(camdenFeature) {
  const holes = getCamdenHoleRings(camdenFeature?.geometry);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [MASK_OUTER_RING, ...holes],
        },
      },
    ],
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
  const mapRef = useRef(null);
  const requestIdRef = useRef(0);
  const laeiReadyRef = useRef(false);

  const [showNoise, setShowNoise] = useState(false);
  const [noiseOpacity, setNoiseOpacity] = useState(0.55);
  const [focusStudyArea, setFocusStudyArea] = useState(true);

  const [camdenGeojson, setCamdenGeojson] = useState(null);
  const [camdenMaskGeojson, setCamdenMaskGeojson] = useState(null);

  const [announcement, setAnnouncement] = useState(
    "Interactive route map ready. Focused on Camden study area."
  );
  const [errorMessage, setErrorMessage] = useState("");

  const routeCount = routesGeojson?.features?.length ?? 0;
  const safeRoutesInfo = routesInfo || [];

  const fitToCamden = () => {
    if (!mapRef.current) return;

    try {
      mapRef.current.fitBounds(CAMDEN_BOUNDS, {
        padding: CAMDEN_PADDING,
        duration: 0,
        maxZoom: 12.8,
      });
    } catch (error) {
      console.error("Failed to fit map to Camden:", error);
    }
  };

  const clearRouteResults = () => {
    setRoutesGeojson(null);
    setRoutesInfo([]);
    setHighlightedRoute?.(null);
    setErrorMessage("");
  };

  const resetAll = () => {
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery?.("");
    setEndQuery?.("");
    clearRouteResults();
    setStatus?.("idle");
    setAnnouncement("Map reset. Focus returned to Camden study area.");
    fitToCamden();
  };
  const handleZoomIn = () => {
  if (!mapRef.current) return;
  mapRef.current.zoomIn({ duration: 200 });
  setAnnouncement("Map zoomed in.");
};

const handleZoomOut = () => {
  if (!mapRef.current) return;
  mapRef.current.zoomOut({ duration: 200 });
  setAnnouncement("Map zoomed out.");
};

  const reverseGeocode = async (lat, lng) => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat,
          lon: lng,
          format: "jsonv2",
          zoom: 18,
        }).toString();

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) return null;

      const data = await res.json();
      const addr = data.address || {};
      return (
        addr.road ||
        addr.pedestrian ||
        addr.footway ||
        addr.neighbourhood ||
        data.name ||
        null
      );
    } catch {
      return null;
    }
  };

  const setPointWithGeocode = (lat, lng, setPoint, setQuery, kind) => {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const point = { lat, lng, label: fallback };

    setPoint(point);
    setQuery?.(fallback);

    if (kind === "start") {
      setAnnouncement("Start point selected. Now choose an end point.");
    } else if (kind === "end") {
      setAnnouncement("End point selected. You can now compute routes.");
    }

    reverseGeocode(lat, lng).then((name) => {
      if (!name) return;

      setPoint((prev) =>
        prev && prev.lat === lat && prev.lng === lng
          ? { ...prev, label: name }
          : prev
      );
      setQuery?.(name);
    });
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;

    if (!startPoint) {
      setPointWithGeocode(lat, lng, setStartPoint, setStartQuery, "start");
      setEndPoint(null);
      setEndQuery?.("");
      clearRouteResults();
      setStatus?.("idle");
      return;
    }

    if (!endPoint) {
      setPointWithGeocode(lat, lng, setEndPoint, setEndQuery, "end");
      setHighlightedRoute?.(null);
      setStatus?.("idle");
      return;
    }

    setPointWithGeocode(lat, lng, setStartPoint, setStartQuery, "start");
    setEndPoint(null);
    setEndQuery?.("");
    clearRouteResults();
    setStatus?.("idle");
  };

  const ensureLAEIReady = async () => {
  if (laeiReadyRef.current) return;
  await loadLAEIData();
  laeiReadyRef.current = true;
};
  //
  
const fetchRoute = async (customStart = null, customEnd = null) => {
  const activeStart = customStart || startPoint;
  const activeEnd = customEnd || endPoint;

  if (!activeStart || !activeEnd) return;

  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;

  setLoading(true);
  clearRouteResults();
  setStatus?.("loading");
  setErrorMessage("");
  setAnnouncement("Calculating walking routes.");

  try {
    await ensureLAEIReady();

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
          airCoverage: pollutionResult?.dataCoverage ?? null,
          avgNoise: noiseResult?.avgNoise ?? null,
          noiseCoverage: noiseResult?.dataCoverage ?? null,
          dangerPct: noiseResult?.dangerPct ?? null,
          geometry: feature?.geometry ?? null,
          highPollutionPoints: pollutionResult?.highPollutionPoints ?? [],
          highNoisePoints: noiseResult?.highNoisePoints ?? [],
        };
      })
    );

    // Ignore stale results
    if (requestId !== requestIdRef.current) return;

    setRoutesGeojson(data);
    setRoutesInfo(parsedRoutes);
    setStatus?.("done");
    setAnnouncement(`${parsedRoutes.length} routes loaded for comparison.`);
  } catch (error) {
    if (requestId !== requestIdRef.current) return;

    console.error(error);
    setStatus?.("error");
    setErrorMessage(
      "Could not calculate routes. Please check your network, API key, or data files."
    );
    setAnnouncement("Route calculation failed.");
  } finally {
    if (requestId === requestIdRef.current) {
      setLoading(false);
    }
  }
};

  useEffect(() => {
    let cancelled = false;

    async function loadCamdenBoundary() {
      try {
        const res = await fetch(CAMDEN_BOUNDARY_URL);
        if (!res.ok) throw new Error("Failed to load Camden boundary");

        const data = await res.json();
        const camdenFeature = getCamdenFeatureFromGeoJSON(data);

        if (!camdenFeature || cancelled) return;

        const featureCollection = {
          type: "FeatureCollection",
          features: [camdenFeature],
        };

        setCamdenGeojson(featureCollection);
        setCamdenMaskGeojson(buildMaskGeoJSON(camdenFeature));
      } catch (error) {
        console.error("Failed to load Camden boundary:", error);
      }
    }

    loadCamdenBoundary();

    return () => {
      cancelled = true;
    };
  }, []);

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

    setAnnouncement("Quick route selected. Calculating routes.");
    fetchRoute(nextStart, nextEnd);

    reverseGeocode(startLat, startLng).then((name) => {
  if (!name) return;
  setStartPoint((prev) =>
    prev && prev.lat === startLat && prev.lng === startLng
      ? { ...prev, label: name }
      : prev
  );
  setStartQuery?.(name);
});

reverseGeocode(endLat, endLng).then((name) => {
  if (!name) return;
  setEndPoint((prev) =>
    prev && prev.lat === endLat && prev.lng === endLng
      ? { ...prev, label: name }
      : prev
  );
  setEndQuery?.(name);
});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickPickRequest]);

  const canCompute = startPoint && endPoint && !loading;
  const mapHint = !startPoint
    ? "Click on the map to set a start point"
    : !endPoint
    ? "Now click to set an end point"
    : "Start and end points are ready";

  return (
    <section
      aria-labelledby="route-map-heading"
      aria-describedby="route-map-description"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <h2 id="route-map-heading" style={srOnlyStyle}>
        Interactive route map
      </h2>

      <p id="route-map-description" style={srOnlyStyle}>
        The map is focused on the Camden study area. Areas outside Camden are
        visually de-emphasised to clarify data coverage. Route details remain
        available in text outside the map.
      </p>

      <div aria-live="polite" aria-atomic="true" style={srOnlyStyle}>
        {announcement}
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            color: "#991b1b",
            borderBottom: "1px solid #fecaca",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          position: "relative",
          flex: 1,
          overflow: "hidden",
          minHeight: 320,
        }}
      >
        <Map
          id="route-map"
          ref={mapRef}
          mapLib={maplibregl}
          initialViewState={CAMDEN_INITIAL_VIEW}
          mapStyle={SIMPLE_RASTER_STYLE}
          style={{ width: "100%", height: "100%" }}
          onClick={handleMapClick}
          onLoad={fitToCamden}
          attributionControl={true}
        >
          {startPoint && (
            <Marker longitude={startPoint.lng} latitude={startPoint.lat} color="#15803d" />
          )}

          {endPoint && (
            <Marker longitude={endPoint.lng} latitude={endPoint.lat} color="#b91c1c" />
          )}

          {showNoise && <NoisePollutionLayer opacity={noiseOpacity} />}

          {focusStudyArea && camdenMaskGeojson && (
            <Source id="camden-mask" type="geojson" data={camdenMaskGeojson}>
              <Layer
                id="camden-mask-fill"
                type="fill"
                paint={{
                  "fill-color": "#f8fafc",
                  "fill-opacity": 0.6,
                }}
              />
            </Source>
          )}

          {camdenGeojson && (
            <Source id="camden-outline" type="geojson" data={camdenGeojson}>
              <Layer
                id="camden-fill-soft"
                type="fill"
                paint={{
                  "fill-color": "#ffffff",
                  "fill-opacity": 0.06,
                }}
              />
              <Layer
                id="camden-border"
                type="line"
                paint={{
                  "line-color": "#4f6296",
                  "line-width": 5,
                  "line-opacity": 0.65,
                }}
              />
            </Source>
          )}

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

          {(filterMode === "air" || filterMode === "overall") &&
            safeRoutesInfo.map((route) => {
              const idx = route.originalIndex;
              const dimmed = highlightedRoute !== null && highlightedRoute !== idx;
              const pts = pointsToGeoJSON(route.highPollutionPoints || []);

              return pts.features.length > 0 ? (
                <Source
                  key={`poll-pts-${idx}`}
                  id={`poll-pts-${idx}`}
                  type="geojson"
                  data={pts}
                >
                  <Layer
                    id={`poll-dots-${idx}`}
                    type="circle"
                    paint={{
                      "circle-radius": 4.5,
                      "circle-color": "#dc2626",
                      "circle-opacity": dimmed ? 0.1 : 0.88,
                      "circle-stroke-width": 1.5,
                      "circle-stroke-color": "#ffffff",
                      "circle-stroke-opacity": dimmed ? 0.1 : 0.95,
                    }}
                  />
                </Source>
              ) : null;
            })}

          {(filterMode === "noise" || filterMode === "overall") &&
            safeRoutesInfo.map((route) => {
              const idx = route.originalIndex;
              const dimmed = highlightedRoute !== null && highlightedRoute !== idx;
              const pts = pointsToGeoJSON(route.highNoisePoints || []);

              return pts.features.length > 0 ? (
                <Source
                  key={`noise-pts-${idx}`}
                  id={`noise-pts-${idx}`}
                  type="geojson"
                  data={pts}
                >
                  <Layer
                    id={`noise-dots-${idx}`}
                    type="circle"
                    paint={{
                      "circle-radius": 3.8,
                      "circle-color": "#d97706",
                      "circle-opacity": dimmed ? 0.1 : 0.88,
                      "circle-stroke-width": 1.5,
                      "circle-stroke-color": "#ffffff",
                      "circle-stroke-opacity": dimmed ? 0.1 : 0.95,
                    }}
                  />
                </Source>
              ) : null;
            })}

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
                <div
                  aria-hidden="true"
                  style={{
                    background: ROUTE_COLORS[dIdx % ROUTE_COLORS.length],
                    color: "white",
                    fontWeight: 700,
                    fontSize: 12,
                    width: 24,
                    height: 24,
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    opacity: isHidden ? 0.18 : 1,
                    transition: "opacity 0.2s",
                    pointerEvents: "none",
                  }}
                >
                  {String.fromCharCode(65 + dIdx)}
                </div>
              </Marker>
            );
          })}
        </Map>

        <aside
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "rgba(255,255,255,0.97)",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            padding: "10px 12px",
            maxWidth: 290,
            boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            Study area: Camden
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              color: "#334155",
              marginTop: 4,
            }}
          >
            Areas outside the current study area are visually de-emphasised to
            clarify data coverage and keep route comparison focused.
          </div>
        </aside>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.88)",
            color: "white",
            fontSize: 13,
            padding: "7px 14px",
            borderRadius: 999,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            maxWidth: "90%",
          }}
        >
          {mapHint}
        </div>

        <div style={{ position: "absolute", bottom: 24, right: 12, zIndex: 10 }}>
          <NoiseLegend
            show={showNoise}
            onToggle={() => {
              setShowNoise((prev) => {
                const next = !prev;
                setAnnouncement(
                  next ? "Noise layer turned on." : "Noise layer turned off."
                );
                return next;
              });
            }}
            opacity={noiseOpacity}
            onOpacityChange={(value) => {
              setNoiseOpacity(value);
              setAnnouncement(`Noise layer opacity changed to ${Math.round(value * 100)} percent.`);
            }}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Map controls and legends"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "white",
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => fetchRoute()}
          disabled={!canCompute}
          aria-label="Compute walking routes"
          className="map-control-button map-control-button--primary"
          style={{
            minHeight: 44,
            minWidth: 44,
            padding: "10px 20px",
            background: canCompute ? "#2563eb" : "#e2e8f0",
            color: canCompute ? "white" : "#64748b",
            border: "1px solid transparent",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: canCompute ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Calculating…" : "Compute routes"}
        </button>

        <button
          type="button"
          onClick={resetAll}
          aria-label="Reset points, routes, and return to Camden"
          className="map-control-button"
          style={{
            minHeight: 44,
            minWidth: 44,
            padding: "10px 16px",
            background: "white",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => {
            fitToCamden();
            setAnnouncement("Map centred on Camden.");
          }}
          aria-label="Centre map on Camden"
          className="map-control-button"
          style={{
            minHeight: 44,
            minWidth: 44,
            padding: "10px 16px",
            background: "white",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Centre Camden
        </button>
        <button
  type="button"
  onClick={handleZoomIn}
  aria-label="Zoom in on the map"
  className="map-control-button"
  style={{
    minHeight: 44,
    minWidth: 44,
    padding: "10px 16px",
    background: "white",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  }}
>
  Zoom in
</button>

<button
  type="button"
  onClick={handleZoomOut}
  aria-label="Zoom out on the map"
  className="map-control-button"
  style={{
    minHeight: 44,
    minWidth: 44,
    padding: "10px 16px",
    background: "white",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  }}
>
  Zoom out
</button>

        <button
  type="button"
  onClick={() => {
    setFocusStudyArea((prev) => {
      const next = !prev;
      setAnnouncement(
        next
          ? "Study area focus turned on."
          : "Showing full map context."
      );
      return next;
    });
  }}
  aria-pressed={focusStudyArea}
  aria-label={
    focusStudyArea ? "Show full map context" : "Focus on Camden study area"
  }
  className="map-control-button"
  style={{
    minHeight: 44,
    minWidth: 44,
    padding: "10px 16px",
    background: focusStudyArea ? "#dbeafe" : "white",
    color: "#0f172a",
    border: `1px solid ${focusStudyArea ? "#2563eb" : "#cbd5e1"}`,
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  }}
>
  {focusStudyArea ? "Show full context" : "Focus study area"}
</button>

        {routeCount > 0 && (
          <div
            role="group"
            aria-label="Hazard legend"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginLeft: 4,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#334155",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "999px",
                  background: "#dc2626",
                  border: "1.5px solid white",
                  boxShadow: "0 0 0 1px #cbd5e1",
                }}
              />
              Air hazard point: NO₂ &gt; 40 or PM2.5 &gt; 15
            </span>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#334155",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "999px",
                  background: "#d97706",
                  border: "1.5px solid white",
                  boxShadow: "0 0 0 1px #cbd5e1",
                }}
              />
              Noise hazard point: 75 dB or above
            </span>
          </div>
        )}

        {routeCount > 0 && (
          <div
            role="group"
            aria-label="Route legend"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginLeft: 4,
            }}
          >
            {routesGeojson.features.map((_, i) => {
              const dIdx = displayOrder?.[i] ?? i;
              const color = ROUTE_COLORS[dIdx % ROUTE_COLORS.length];
              const isHL = highlightedRoute === i;

              return (
                <span
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#0f172a",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 20,
                      height: 0,
                      borderTop: isHL
                        ? `3px solid ${color}`
                        : `3px dashed ${color}`,
                    }}
                  />
                  Route {String.fromCharCode(65 + dIdx)}
                  {isHL ? " (selected)" : ""}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}