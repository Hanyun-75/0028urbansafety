import { useEffect, useId, useRef, useState } from "react";

export default function SearchBox({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const userTyping = useRef(false);
  const blurTimeoutRef = useRef(null);
  const optionRefs = useRef([]);

  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const labelId = `${inputId}-label`;
  const statusId = `${inputId}-status`;

  useEffect(() => {
    if (!userTyping.current) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    userTyping.current = false;

    if (!value || value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
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

        if (!res.ok) {
          throw new Error(`Geocoding failed: ${res.status}`);
        }

        const data = await res.json();

        const nextResults = data.map((item) => ({
          label: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
        }));

        setResults(nextResults);
        setOpen(nextResults.length > 0);
        setActiveIndex(nextResults.length > 0 ? 0 : -1);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          setResults([]);
          setOpen(false);
          setActiveIndex(-1);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const activeEl = optionRefs.current[activeIndex];
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const closeSuggestions = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleSelectItem = (item) => {
    onSelect(item);
    setResults([]);
    closeSuggestions();
  };

  const handleInputChange = (e) => {
    userTyping.current = true;
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      if (e.key === "Escape") {
        closeSuggestions();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelectItem(results[activeIndex]);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeSuggestions();
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      closeSuggestions();
    }, 120);
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <label
        id={labelId}
        htmlFor={inputId}
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      <input
        id={inputId}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-labelledby={labelId}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
        }
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 14,
        }}
      />

      <div
        id={statusId}
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {open
          ? `${results.length} suggestion${results.length === 1 ? "" : "s"} available. Use up and down arrow keys to review and Enter to select.`
          : ""}
      </div>

      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            listStyle: "none",
            padding: 0,
            margin: "6px 0 0 0",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 20,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {results.map((item, idx) => {
            const isActive = idx === activeIndex;

            return (
              <li
                key={`${item.label}-${idx}`}
                id={`${inputId}-option-${idx}`}
                role="option"
                aria-selected={isActive}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: "10px 12px",
                  fontSize: 14,
                  lineHeight: 1.45,
                  cursor: "pointer",
                  background: isActive ? "#eff6ff" : "#ffffff",
                  color: "#0f172a",
                  borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                }}
              >
                {item.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}