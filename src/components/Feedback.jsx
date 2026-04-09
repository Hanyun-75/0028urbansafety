import { useState } from 'react';

const STORAGE_KEY = 'cleanwalk_feedback';

function loadFeedback() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveFeedback(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, 50)));
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Feedback() {
  const [feedbackList, setFeedbackList] = useState(loadFeedback);
  const [route, setRoute] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  const handleSubmit = () => {
    if (!route.trim() && !text.trim()) return;
    const updated = [
      { route: route.trim() || 'Unknown route', text: text.trim(), rating, time: new Date().toISOString() },
      ...feedbackList,
    ];
    saveFeedback(updated);
    setFeedbackList(updated);
    setRoute('');
    setText('');
    setRating(0);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 7,
    fontSize: 13,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div>
      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Route or street name"
          maxLength={50}
          value={route}
          onChange={e => setRoute(e.target.value)}
          style={inputStyle}
          aria-label="Route or street name"
        />
        <textarea
          placeholder="Share your experience…"
          maxLength={300}
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          aria-label="Your experience"
        />

        {/* Star rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Air quality</span>
          <div
            style={{ display: 'flex', gap: 2 }}
            role="group"
            aria-label="Rate air quality"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setRating(v)}
                onMouseEnter={() => setHovered(v)}
                aria-label={`${v} star${v > 1 ? 's' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: v <= (hovered || rating) ? '#f59e0b' : '#cbd5e1',
                  lineHeight: 1,
                  transition: 'color 0.1s',
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!route.trim() && !text.trim()}
          style={{
            padding: '8px',
            background: (route.trim() || text.trim()) ? '#2563eb' : '#e2e8f0',
            color: (route.trim() || text.trim()) ? 'white' : '#94a3b8',
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: (route.trim() || text.trim()) ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Submit
        </button>
      </div>

      {/* Notes list */}
      {feedbackList.length === 0 ? (
        <p style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '8px 0' }}>
          No notes yet — be the first!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {feedbackList.slice(0, 10).map((fb, i) => (
            <div key={i} style={{
              padding: '9px 11px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fb.route}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(fb.time)}</span>
              </div>
              {fb.rating > 0 && (
                <div style={{ fontSize: 13, color: '#f59e0b', marginBottom: fb.text ? 3 : 0, letterSpacing: 1 }}>
                  {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                </div>
              )}
              {fb.text && (
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{fb.text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
