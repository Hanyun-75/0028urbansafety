import { useState } from "react";

export default function PlaceSearchBox({
  label,
  value,
  onChange,
  onSelect,
  placeholder = "Search for a place...",
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchPlaces = async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Simple Nominatim search skeleton
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query
      )}&limit=5`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await res.json();

      const parsed = data.map((item) => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }));

      setResults(parsed);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    onChange(nextValue);
    searchPlaces(nextValue);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />

      {loading && (
        <p style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Searching...
        </p>
      )}

      {results.length > 0 && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {results.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelect(item);
                onChange(item.label);
                setResults([]);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                borderBottom: idx < results.length - 1 ? "1px solid #f3f4f6" : "none",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}