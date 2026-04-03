import { useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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

const primaryRouteLayer = {
  id: "route-line-primary",
  type: "line",
  paint: {
    "line-color": "#1d4ed8",
    "line-width": 5,
  },
};

const alternativeRouteLayer = {
  id: "route-line-alt",
  type: "line",
  paint: {
    "line-color": "#6b7280",
    "line-width": 3,
    "line-dasharray": [2, 2],
  },
};

export default function MapDisplay() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesInfo, setRoutesInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  const resetAll = () => {
    setStart(null);
    setEnd(null);
    setRoutesGeojson(null);
    setRoutesInfo([]);
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;

    if (!start) {
      setStart({ lng, lat });
      setEnd(null);
      setRoutesGeojson(null);
      setRoutesInfo([]);
      return;
    }

    if (!end) {
      setEnd({ lng, lat });
      return;
    }

    // Third click: reset and choose a new start point
    setStart({ lng, lat });
    setEnd(null);
    setRoutesGeojson(null);
    setRoutesInfo([]);
  };

  const fetchRoute = async () => {
    if (!start || !end) return;

    setLoading(true);

    try {
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
              [start.lng, start.lat],
              [end.lng, end.lat],
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
      console.log("ORS response:", data);

      setRoutesGeojson(data);

      const parsedRoutes =
        data?.features?.map((feature, index) => {
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

          return {
            id: index,
            distance,
            duration,
          };
        }) || [];

      setRoutesInfo(parsedRoutes);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch route. Check your ORS key or network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Urban Safety Walk</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Click once to choose a start point, click again to choose an end point,
        then press “Compute route”.
      </p>

      <div
        style={{
          width: "900px",
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
          {start && (
            <Marker longitude={start.lng} latitude={start.lat} color="green" />
          )}

          {end && (
            <Marker longitude={end.lng} latitude={end.lat} color="red" />
          )}

          {routesGeojson?.features?.map((feature, index) => (
            <Source
              key={`route-src-${index}`}
              id={`route-src-${index}`}
              type="geojson"
              data={feature}
            >
              <Layer
                {...(index === 0 ? primaryRouteLayer : alternativeRouteLayer)}
                id={`route-layer-${index}`}
              />
            </Source>
          ))}
        </Map>
      </div>

      <div style={{ marginTop: 16, maxWidth: "900px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button
            onClick={fetchRoute}
            disabled={!start || !end || loading}
            style={{
              padding: "8px 14px",
              cursor: !start || !end || loading ? "not-allowed" : "pointer",
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
          {start ? `${start.lng.toFixed(5)}, ${start.lat.toFixed(5)}` : "Not set"}
        </p>
        <p>
          <strong>End:</strong>{" "}
          {end ? `${end.lng.toFixed(5)}, ${end.lat.toFixed(5)}` : "Not set"}
        </p>

        {routesInfo.length === 1 && (
          <p style={{ marginTop: 12, color: "#666" }}>
            Only one feasible route returned for this OD pair.
          </p>
        )}

        {routesInfo.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Route comparison</h3>

            {routesInfo.map((route, index) => (
              <div
                key={route.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: index === 0 ? "#eff6ff" : "#f9fafb",
                }}
              >
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Route {String.fromCharCode(65 + index)}</strong>
                </p>

                <p style={{ margin: "4px 0" }}>
                  <strong>Distance:</strong>{" "}
                  {route.distance
                    ? `${(route.distance / 1000).toFixed(2)} km`
                    : "N/A"}
                </p>

                <p style={{ margin: "4px 0" }}>
                  <strong>Duration:</strong>{" "}
                  {route.duration
                    ? `${(route.duration / 60).toFixed(1)} min`
                    : "N/A"}
                </p>

                {index > 0 &&
                  routesInfo[0]?.duration != null &&
                  route.duration != null && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Δtime vs A:</strong>{" "}
                      {((route.duration - routesInfo[0].duration) / 60).toFixed(1)} min
                    </p>
                  )}

                {index > 0 &&
                  routesInfo[0]?.distance != null &&
                  route.distance != null && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Δdistance vs A:</strong>{" "}
                      {((route.distance - routesInfo[0].distance) / 1000).toFixed(2)} km
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}