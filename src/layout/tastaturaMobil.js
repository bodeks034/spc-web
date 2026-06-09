/**
 * Pomoć za ugrađenu tastaturu na telefonu/tabletu (visualViewport).
 */

/** Posle fokusa skroluj polje u vidljivi deo iznad tastature. */
export function skrolujPoljeUFokus(el) {
  if (!el || typeof window === "undefined") return;
  const pokreni = () => {
    try {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    } catch {
      el.scrollIntoView(true);
    }
  };
  requestAnimationFrame(pokreni);
  setTimeout(pokreni, 120);
  setTimeout(pokreni, 320);
}

export function onFocusTastatura(e) {
  skrolujPoljeUFokus(e?.currentTarget);
}

/** Stil omota za linijske korake — visina = vidljivi viewport, skrol kad je tastatura. */
export function stilOmotLinija(ekran, { skrol = false } = {}) {
  const tastatura = ekran.tastaturaOtvorena;
  return {
    padding: "10px 12px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    height: `${ekran.visinaLayout}px`,
    minHeight: 0,
    maxHeight: `${ekran.visinaLayout}px`,
    overflow: (skrol || tastatura) ? "auto" : "hidden",
    WebkitOverflowScrolling: (skrol || tastatura) ? "touch" : undefined,
    background: "inherit",
    boxSizing: "border-box",
  };
}
