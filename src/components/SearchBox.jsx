import { useEffect, useState } from "react";

export default function SearchBox({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: value,
            format: "jsonv2",
            limit: "5",
            countrycodes: "gb",
          }).toString();

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
        const data = await res.json();

        setResults(
          data.map((item) => ({
            label: item.display_name,
            lat: Number(item.lat),
            lng: Number(item.lon),
          }))
        );
        setOpen(true);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          setResults([]);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 14,
        }}
      />

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginTop: 6,
            zIndex: 20,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {results.map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              onClick={() => {
                onSelect(item);
                setOpen(false);
                setResults([]);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "white",
                cursor: "pointer",
                fontSize: 14,
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