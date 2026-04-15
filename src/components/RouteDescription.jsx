function buildDescription(route, routes) {
  const sentences = [];

  // Time
  const durations = routes.map((r) => r.duration).filter((v) => v != null);
  if (route.duration != null && durations.length > 1) {
    const best = Math.min(...durations);
    const diffMin = Math.round((route.duration - best) / 60);
    if (diffMin === 0) sentences.push("Fastest route.");
    else sentences.push(`${diffMin} min slower than the fastest route.`);
  }

  // Noise
  const noises = routes.map((r) => r.avgNoise).filter((v) => v != null);
  if (route.avgNoise != null && noises.length > 1) {
    const best = Math.min(...noises);
    const diff = +(route.avgNoise - best).toFixed(1);
    if (diff === 0) sentences.push("Quietest option.");
    else sentences.push(`Noisier than the quietest route (+${diff} dB).`);
  }

  // Air quality (NO2)
  const no2s = routes.map((r) => r.avgNO2).filter((v) => v != null);
  if (route.avgNO2 != null && no2s.length > 1) {
    const best = Math.min(...no2s);
    const diff = +(route.avgNO2 - best).toFixed(1);
    if (diff === 0) sentences.push("Cleanest air among all routes.");
    else sentences.push(`Higher air pollution than the cleanest route (+${diff} μg/m³ NO₂).`);
  }

  return sentences.join(" ");
}

export default function RouteDescription({ route, routes }) {
  const text = buildDescription(route, routes);
  if (!text) return null;

  return (
    <p style={{
      fontSize: 12,
      color: "#64748b",
      margin: "10px 0 0 0",
      paddingTop: 10,
      borderTop: "1px solid #f1f5f9",
      lineHeight: 1.6,
    }}>
      {text}
    </p>
  );
}
