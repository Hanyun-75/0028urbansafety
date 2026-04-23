import { useMemo, useState } from "react";

const STORAGE_KEY = "cleanwalk_route_notes";

const TAG_OPTIONS = [
  "Calm",
  "Noisy",
  "Busy",
  "Green",
  "Pleasant",
  "Smell noticeable",
  "Heavy traffic",
  "Easy crossings",
  "Difficult crossings",
  "Stressful",
  "Relaxed",
  "Daytime",
  "Evening",
];

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotes(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, 100)));
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Feedback({ activeRoute }) {
  const [allNotes, setAllNotes] = useState(loadNotes);
  const [selectedTags, setSelectedTags] = useState([]);
  const [text, setText] = useState("");

  const notesForRoute = useMemo(() => {
    if (!activeRoute) return [];
    return allNotes.filter((n) => n.routeId === activeRoute.routeId);
  }, [allNotes, activeRoute]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  const handleSubmit = () => {
    if (!activeRoute) return;
    if (selectedTags.length === 0 && !text.trim()) return;

    const newNote = {
      id: String(Date.now()),
      routeId: activeRoute.routeId,
      routeLabelAtSubmit: activeRoute.routeLabel,
      tags: selectedTags,
      text: text.trim(),
      time: new Date().toISOString(),
    };

    const updated = [newNote, ...allNotes];
    saveNotes(updated);
    setAllNotes(updated);
    setSelectedTags([]);
    setText("");
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 13,
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  if (!activeRoute) return null;

  return (
    <div>
      <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginTop: 0, marginBottom: 10 }}>
        Share a short note about this walk. Notes are personal impressions and do not affect route ranking.
      </p>

      <div
        style={{
          marginBottom: 10,
          padding: "8px 10px",
          borderRadius: 8,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          fontSize: 13,
          color: "#334155",
          fontWeight: 600,
        }}
      >
        For {activeRoute.routeLabel}
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          What did you notice? (choose up to 3)
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TAG_OPTIONS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: selected ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                  background: selected ? "#eff6ff" : "#ffffff",
                  color: selected ? "#1d4ed8" : "#475569",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <textarea
          placeholder="Share a short note about how this route felt today..."
          maxLength={160}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          aria-label="Route note"
        />
      </div>

      <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, marginTop: 0, marginBottom: 10 }}>
        Please describe your experience of this walk rather than the area as a whole.
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selectedTags.length === 0 && !text.trim()}
        style={{
          width: "100%",
          padding: "9px",
          background: selectedTags.length > 0 || text.trim() ? "#2563eb" : "#e2e8f0",
          color: selectedTags.length > 0 || text.trim() ? "white" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: selectedTags.length > 0 || text.trim() ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        Submit note
      </button>

      <div style={{ marginTop: 14 }}>
        {notesForRoute.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "8px 0", margin: 0 }}>
            No route notes yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notesForRoute.slice(0, 5).map((note) => (
              <div
                key={note.id}
                style={{
                  padding: "10px 11px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                    {note.routeLabelAtSubmit}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(note.time)}</span>
                </div>

                {note.tags?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: note.text ? 6 : 0 }}>
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          color: "#475569",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {note.text && (
                  <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                    {note.text}
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