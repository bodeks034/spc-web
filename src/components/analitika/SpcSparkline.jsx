/** Mini SVG sparkline za SPC snapshot (poslednjih N tačaka). */
export default function SpcSparkline({
  points,
  width = 108,
  height = 40,
  boja = "#3b82f6",
  C,
  label,
  onClick,
  title,
}) {
  if (!points?.length) {
    return (
      <div style={{
        width, height: height + 18,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: C?.border || "#666", fontSize: 9,
      }}>
        {label && <span style={{ marginBottom: 4, color: C?.sivi }}>{label}</span>}
        —
      </div>
    );
  }

  const vals = points.map((p) => Number(p.v)).filter(Number.isFinite);
  if (!vals.length) return null;

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1e-9);

  const coords = points.map((p, i) => {
    const x = pad + (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
    const v = Number.isFinite(Number(p.v)) ? Number(p.v) : min;
    const y = pad + h - ((v - min) / span) * h;
    return { x, y, bad: p.bad };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      style={{
        background: C?.bg || "#111",
        border: `1px solid ${boja}35`,
        borderRadius: 8,
        padding: "6px 8px",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        textAlign: "center",
      }}
    >
      {label && (
        <div style={{ color: C?.sivi, fontSize: 8, letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      )}
      <svg width={width} height={height} style={{ display: "block" }}>
        <polyline
          fill="none"
          stroke={boja}
          strokeWidth="1.5"
          points={line}
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={c.bad ? 3.5 : 2.5}
            fill={c.bad ? (C?.crvena || "#ef4444") : boja}
          />
        ))}
      </svg>
    </Tag>
  );
}
