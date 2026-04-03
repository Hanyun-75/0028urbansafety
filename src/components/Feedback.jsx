import { useState, useEffect } from 'react';

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
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' hr ago';
  const days = Math.floor(hrs / 24);
  return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

export default function Feedback() {
  const [feedbackList, setFeedbackList] = useState(loadFeedback);
  const [route, setRoute] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (!route.trim() && !text.trim()) return;
    const updated = [
      { route: route.trim() || 'Unknown route', text: text.trim(), rating, time: new Date().toISOString() },
      ...feedbackList
    ];
    saveFeedback(updated);
    setFeedbackList(updated);
    setRoute('');
    setText('');
    setRating(0);
  };

  return (
    <div className="panel-section">
      <h2>Community Notes</h2>
      <p className="feedback-info">Share your walking experience (stored locally for demo).</p>
      <div className="feedback-form">
        <input type="text" placeholder="Route or street name..." maxLength={50} value={route} onChange={e => setRoute(e.target.value)} />
        <textarea placeholder="e.g. Tavistock Place is really pleasant, lots of trees..." maxLength={300} rows={2} value={text} onChange={e => setText(e.target.value)} />
        <div className="feedback-rating">
          <span>Air quality: </span>
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} className={`star${v <= rating ? ' active' : ''}`} onClick={() => setRating(v)}>
              {v <= rating ? '\u2605' : '\u2606'}
            </button>
          ))}
        </div>
        <button className="btn-submit" onClick={handleSubmit}>Submit Note</button>
      </div>
      <div className="feedback-list">
        {feedbackList.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No notes yet. Be the first!</p>
        ) : (
          feedbackList.slice(0, 10).map((fb, i) => (
            <div key={i} className="feedback-item">
              <div className="fb-route">{fb.route}</div>
              <div className="fb-stars">{'\u2605'.repeat(fb.rating)}{'\u2606'.repeat(5 - fb.rating)}</div>
              {fb.text && <div className="fb-text">{fb.text}</div>}
              <div className="fb-time">{timeAgo(fb.time)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
