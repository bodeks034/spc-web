import { useState, useEffect } from "react";

/** mob <640 · tablet <1024 · desk ≥1024 · wide ≥1400 */
export function useEkran() {
  const [sz, setSz] = useState(() => readViewport());

  useEffect(() => {
    const onResize = () => setSz(readViewport());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
    };
  }, []);

  const { w, h } = sz;
  const kratka = Math.min(w, h);
  const duga = Math.max(w, h);
  /** Telefon (npr. POCO X3 Pro 20:9) — po kraćoj strani, radi i u landscape */
  const telefon = kratka <= 520 && duga <= 1100;
  const telefonPortrait = telefon && h >= w;
  const telefonLandscape = telefon && w > h;
  /** Tablet ~8″ (npr. 800×1280 portrait, 1280×800 landscape) */
  const tablet8 = w >= 640 && w < 1024 && kratka >= 720 && kratka <= 860;
  /** Telefon ili tablet u portrait (uspravno) */
  const uspravnoMobTab = (telefon || (w >= 640 && w < 1024)) && h >= w;
  /** Mobilni + tablet — Modul linija koristi poseban layout ispod 1024px */
  const linijaUredjaj = w < 1024;

  return {
    w,
    h,
    kratka,
    duga,
    mob: w < 640,
    tablet: w < 1024,
    tablet8,
    desk: w >= 1024,
    wide: w >= 1400,
    telefon,
    telefonPortrait,
    telefonLandscape,
    uspravnoMobTab,
    linijaUredjaj,
    nizak: h < 720,
    unosStek: uspravnoMobTab,
  };
}

function readViewport() {
  if (typeof window === "undefined") return { w: 1280, h: 800 };
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}
