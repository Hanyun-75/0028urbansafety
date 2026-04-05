import { Source, Layer } from "react-map-gl/maplibre";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const NOISE_TILESET =
  import.meta.env.VITE_MAPBOX_NOISE_TILESET || "";

const SOURCE_LAYER = "noise_data1-2u09tf";

const NOISE_COLOR_MATCH = [
  "match",
  ["get", "NoiseClass"],
  ">=75.0", "#c1121f",  // only highlight the most dangerous
  "rgba(0,0,0,0)", // everything else transparent
];

function buildTileUrl() {
  if (!MAPBOX_TOKEN || !NOISE_TILESET) return null;
  const tilesetId = NOISE_TILESET.replace("mapbox://", "");
  return `https://api.mapbox.com/v4/${tilesetId}/{z}/{x}/{y}.mvt?access_token=${MAPBOX_TOKEN}`;
}

export default function NoisePollutionLayer({ opacity = 0.55 }) {
  const tileUrl = buildTileUrl();
  if (!tileUrl) return null;

  return (
    <Source
      id="noise-tiles"
      type="vector"
      tiles={[tileUrl]}
      minzoom={12}
      maxzoom={16}
      attribution="Noise data: Defra Strategic Noise Mapping | Mapbox"
    >
      <Layer
        id="noise-fill"
        type="fill"
        source-layer={SOURCE_LAYER}
        paint={{
          "fill-color": NOISE_COLOR_MATCH,
          "fill-opacity": opacity,
        }}
      />
    </Source>
  );
}
