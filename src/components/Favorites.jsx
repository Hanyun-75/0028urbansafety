import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "cleanwalk_favorites_v2";
const MAX_FAVORITES = 20;

const srOnlyStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.slice(0, MAX_FAVORITES))
  );
}

function buildDefaultLabel(startPoint, endPoint) {
  const startLabel = startPoint?.label || "Start";
  const endLabel = endPoint?.label || "End";
  return `${startLabel} to ${endLabel}`;
}

function buildRouteDefaultLabel(savedRoute) {
  const startLabel = savedRoute?.startPoint?.label || "Start";
  const endLabel = savedRoute?.endPoint?.label || "End";
  const routeLabel = savedRoute?.routeLabel || "Saved route";
  return `${startLabel} to ${endLabel} – ${routeLabel}`;
}

export default function Favorites({
  startPoint,
  endPoint,
  onLoad,
  selectedRoute,
  pendingSavedRoute,
  onHandledPendingSavedRoute,
}) {
  const [favorites, setFavorites] = useState(loadFavorites);
  const [isNaming, setIsNaming] = useState(false);
  const [label, setLabel] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [draftSavedRoute, setDraftSavedRoute] = useState(null);

  const inputId = useId();
  const hintId = useId();
  const saveHintId = useId();

  const canSaveCurrent = Boolean(startPoint && endPoint);

  // Route card 触发的 Save route
  useEffect(() => {
    if (!pendingSavedRoute) return;

    setDraftSavedRoute(pendingSavedRoute);
    setLabel(buildRouteDefaultLabel(pendingSavedRoute));
    setIsNaming(true);
    onHandledPendingSavedRoute?.();
  }, [pendingSavedRoute, onHandledPendingSavedRoute]);

  // aria-live 文案自动清空
  useEffect(() => {
    if (!liveMessage) return;
    const timer = window.setTimeout(() => setLiveMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [liveMessage]);

  const handleStartSave = () => {
    if (!canSaveCurrent) return;

    setDraftSavedRoute(null);
    setLabel(buildDefaultLabel(startPoint, endPoint));
    setIsNaming(true);
  };

  const handleCancelSave = () => {
    setIsNaming(false);
    setLabel("");
    setDraftSavedRoute(null);
  };

  const handleSave = () => {
    const currentStart = draftSavedRoute?.startPoint ?? startPoint;
    const currentEnd = draftSavedRoute?.endPoint ?? endPoint;

    if (!currentStart || !currentEnd) return;

    const defaultLabel = draftSavedRoute
      ? buildRouteDefaultLabel(draftSavedRoute)
      : buildDefaultLabel(currentStart, currentEnd);

    const entry = {
      id: `${Date.now()}`,
      kind: draftSavedRoute ? "route" : "trip",
      label: label.trim() || defaultLabel,
      start: currentStart,
      end: currentEnd,
      route: draftSavedRoute ?? selectedRoute ?? null,
      savedAt: new Date().toISOString(),
    };

    const updated = [entry, ...favorites].slice(0, MAX_FAVORITES);
    saveFavorites(updated);
    setFavorites(updated);
    setLabel("");
    setIsNaming(false);
    setDraftSavedRoute(null);
    setLiveMessage(`Saved route: ${entry.label}.`);
  };

  const handleDelete = (id) => {
    const removed = favorites.find((f) => f.id === id);
    const updated = favorites.filter((f) => f.id !== id);
    saveFavorites(updated);
    setFavorites(updated);
    setLiveMessage(
      removed ? `Removed saved route: ${removed.label}.` : "Saved route removed."
    );
  };

const handleLoad = (fav) => {
  onLoad?.(fav.start, fav.end, fav.route ?? null);
  setLiveMessage(`Loaded saved route: ${fav.label}.`);
};

  return (
    <section aria-labelledby="saved-routes-heading">
      <div aria-live="polite" aria-atomic="true" style={srOnlyStyle}>
        {liveMessage}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <h2
          id="saved-routes-heading"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          Saved routes
        </h2>

        <button
          type="button"
          onClick={handleStartSave}
          disabled={!canSaveCurrent}
          aria-disabled={!canSaveCurrent}
          aria-describedby={saveHintId}
          style={{
            minHeight: 40,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            cursor: canSaveCurrent ? "pointer" : "not-allowed",
            color: canSaveCurrent ? "#374151" : "#94a3b8",
            fontSize: 12,
            fontWeight: 500,
            opacity: canSaveCurrent ? 1 : 0.7,
          }}
        >
          Save current
        </button>
      </div>

      <p
        id={saveHintId}
        style={{
          fontSize: 12,
          color: "#64748b",
          lineHeight: 1.5,
          marginTop: 0,
          marginBottom: 10,
        }}
      >
        {canSaveCurrent
          ? "Save the current start and end points for quick reuse."
          : "Set both a start point and an end point to save the current trip."}
      </p>

      {isNaming && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#f8fafc",
            marginBottom: 12,
          }}
        >
          <label
            htmlFor={inputId}
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Route name
          </label>

          <p
            id={hintId}
            style={{
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.5,
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            {draftSavedRoute
              ? `Saving ${draftSavedRoute.routeLabel}. You can keep the default name or edit it.`
              : "Saving the current trip. You can keep the default name or edit it."}
          </p>

          <input
            id={inputId}
            autoFocus
            type="text"
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancelSave();
            }}
            aria-describedby={hintId}
            style={{
              width: "100%",
              minHeight: 40,
              fontSize: 13,
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              color: "#111827",
              background: "white",
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              style={{
                minHeight: 40,
                padding: "8px 14px",
                borderRadius: 8,
                background: "#2563eb",
                color: "white",
                border: "1px solid #2563eb",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Save route
            </button>

            <button
              type="button"
              onClick={handleCancelSave}
              style={{
                minHeight: 40,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                fontSize: 12,
                color: "#334155",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {favorites.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color:  "#64748b",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          No saved routes yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {favorites.map((fav) => (
            <li key={fav.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#f8fafc",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleLoad(fav)}
                    aria-label={`Load saved route ${fav.label}`}
                    style={{
                      width: "100%",
                      minHeight: 40,
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#374151",
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    {fav.label}
                  </button>

                  <p
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      lineHeight: 1.5,
                      margin: "4px 0 0 0",
                    }}
                  >
                    {fav.kind === "route"
                      ? `Saved route${fav.route?.routeLabel ? ` · ${fav.route.routeLabel}` : ""}`
                      : "Saved trip"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(fav.id)}
                  aria-label={`Remove saved route ${fav.label}`}
                  style={{
                    minWidth: 40,
                    minHeight: 40,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "white",
                    cursor: "pointer",
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}