import { useState } from "react";

const STORAGE_KEY = "cleanwalk_favorites";

const DEMO_FAVORITES = [
  {
    id: "demo-1",
    label: "King's Cross \u2192 UCL",
    start: { lat: 51.53, lng: -0.123, label: "King's Cross" },
    end: { lat: 51.5248, lng: -0.134, label: "UCL" },
    route: null,
  },
  {
    id: "demo-2",
    label: "Camden \u2192 UCL",
    start: { lat: 51.535, lng: -0.125, label: "Camden" },
    end: { lat: 51.5248, lng: -0.134, label: "UCL" },
    route: null,
  },
];

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && stored.length > 0 ? stored : DEMO_FAVORITES;
  } catch {
    return DEMO_FAVORITES;
  }
}

function saveFavorites(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
}

export default function Favorites({ startPoint, endPoint, onLoad, selectedRoute }) {
  const [favorites, setFavorites] = useState(loadFavorites);
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState("");

  const canSave = startPoint && endPoint;

  const handleSave = () => {
    if (!canSave) return;

    const defaultLabel = selectedRoute?.info?.name
      ? `${selectedRoute.info.name} (${startPoint.label} \u2192 ${endPoint.label})`
      : `${startPoint.label} \u2192 ${endPoint.label}`;

    const entry = {
      id: Date.now(),
      label: label.trim() || defaultLabel,
      start: startPoint,
      end: endPoint,
      route: selectedRoute ?? null,
    };

    const updated = [entry, ...favorites];
    saveFavorites(updated);
    setFavorites(updated);
    setLabel("");
    setNaming(false);
  };

  const handleDelete = (id) => {
    const updated = favorites.filter((f) => f.id !== id);
    saveFavorites(updated);
    setFavorites(updated);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Saved routes
        </p>
        {canSave && !naming && (
          <button
            onClick={() => setNaming(true)}
            style={{
              fontSize: 11, padding: "3px 10px",
              borderRadius: 999, border: "1px solid #e2e8f0",
              background: "#f8fafc", cursor: "pointer", color: "#374151",
            }}
          >
            + Save current
          </button>
        )}
      </div>

      {naming && (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 6px 0" }}>
          {selectedRoute
            ? `Saving: ${selectedRoute.info?.name ?? "selected route"}`
            : "No route selected \u2014 will save start/end points only"}
        </p>
      )}

      {naming && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            autoFocus
            type="text"
            placeholder="Name this route..."
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setNaming(false);
            }}
            style={{
              flex: 1, fontSize: 13, padding: "5px 10px",
              border: "1px solid #e2e8f0", borderRadius: 8, outline: "none",
            }}
          />
          <button
            onClick={handleSave}
            style={{ padding: "5px 12px", borderRadius: 8, background: "#2563eb", color: "white", border: "none", cursor: "pointer", fontSize: 12 }}
          >
            Save
          </button>
          <button
            onClick={() => setNaming(false)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 12 }}
          >
            &#10005;
          </button>
        </div>
      )}

      {favorites.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No saved routes yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {favorites.map((fav) => (
            <div
              key={fav.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", border: "1px solid #e2e8f0",
                borderRadius: 8, background: "#f8fafc",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => onLoad(fav.start, fav.end, fav.route ?? null)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500, padding: 0,
                  }}
                >
                  {fav.label}
                </button>
                {fav.route && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Saved route</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(fav.id)}
                title="Remove"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "0 2px", flexShrink: 0 }}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
