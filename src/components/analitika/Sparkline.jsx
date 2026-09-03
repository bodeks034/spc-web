/** Minijaturni trend uz KPI karticu — bez zavisnosti od recharts. */
export default function Sparkline({ tacke = [], boja, sirina = 56, visina = 16 }) {
  const vrednosti = (tacke || [])
    .map((t) => (typeof t === "number" ? t : Number(t?.fpy ?? t?.rty)))
    .filter((v) => Number.isFinite(v));

  if (vrednosti.length < 2) return null;

  const min = Math.min(...vrednosti);
  const max = Math.max(...vrednosti);
  const raspon = max - min || 1;
  const korak = sirina / (vrednosti.length - 1);

  const d = vrednosti
    .map((v, i) => {
      const x = (i * korak).toFixed(1);
      const y = (visina - ((v - min) / raspon) * visina).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={sirina}
      height={visina}
      viewBox={`0 0 ${sirina} ${visina}`}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={d} fill="none" stroke={boja} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/** Promena poslednje tačke u odnosu na prethodnu, u procentnim poenima. */
export function deltaTrenda(tacke = []) {
  const vrednosti = (tacke || [])
    .map((t) => (typeof t === "number" ? t : Number(t?.fpy ?? t?.rty)))
    .filter((v) => Number.isFinite(v));
  if (vrednosti.length < 2) return null;
  return +(vrednosti[vrednosti.length - 1] - vrednosti[vrednosti.length - 2]).toFixed(1);
}
