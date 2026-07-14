import { useState, useEffect, useCallback, useRef } from "react";

/** mob <640 · tablet <1024 · desk ≥1024 · wide ≥1400 */
export function useEkran() {
  const [sz, setSz] = useState(() => readViewport());
  const [orientRev, setOrientRev] = useState(0);
  const resizeTimerRef = useRef(null);
  const orientTimerRef = useRef(null);

  const refresh = useCallback(() => {
    setSz(readViewport());
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      refresh();
      resizeTimerRef.current = null;
    }, 80);
  }, [refresh]);

  const scheduleOrientationRefresh = useCallback(() => {
    refresh();
    if (orientTimerRef.current) clearTimeout(orientTimerRef.current);
    orientTimerRef.current = setTimeout(refresh, 150);
  }, [refresh]);

  useEffect(() => {
    const onResize = () => debouncedRefresh();
    const onOrient = () => {
      setOrientRev((r) => r + 1);
      scheduleOrientationRefresh();
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrient);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener("change", onOrient);
    }

    const mq = window.matchMedia?.("(orientation: portrait)");
    const onMq = () => onOrient();
    mq?.addEventListener?.("change", onMq);

    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      if (orientTimerRef.current) clearTimeout(orientTimerRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrient);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
      window.screen?.orientation?.removeEventListener("change", onOrient);
      mq?.removeEventListener?.("change", onMq);
    };
  }, [debouncedRefresh, scheduleOrientationRefresh]);

  const { w, h, visinaPuna } = sz;
  const kratka = Math.min(w, h);
  const duga = Math.max(w, h);
  const portrait = h >= w;
  const landscape = w > h;
  const orijentacija = landscape ? "landscape" : "portrait";

  /** Telefon (npr. POCO X3 Pro 20:9) — po kraćoj strani */
  const telefon = kratka <= 520 && duga <= 1100;
  const telefonPortrait = telefon && portrait;
  const telefonLandscape = telefon && landscape;

  const tablet = w < 1024 && !telefon;
  /** Tablet ~8″ (npr. 800×1280 portrait, 1280×800 landscape) */
  const tablet8 = tablet && kratka >= 720 && kratka <= 860;
  const tabletPortrait = tablet && portrait;
  const tabletLandscape = tablet && landscape;

  /** Telefon ili tablet u portrait (uspravno) */
  const uspravnoMobTab = (telefon || tablet) && portrait;
  /** Mobilni + tablet — Modul linija koristi poseban layout ispod 1024px */
  const linijaUredjaj = w < 1024;
  /** Tastatura smanji visualViewport (obično < ~82% punog ekrana) */
  const tastaturaOtvorena = linijaUredjaj && h < visinaPuna * 0.82;

  return {
    visinaPuna,
    tastaturaOtvorena,
    w,
    h,
    kratka,
    duga,
    mob: w < 640,
    tablet,
    tablet8,
    desk: w >= 1024,
    wide: w >= 1400,
    telefon,
    telefonPortrait,
    telefonLandscape,
    tabletPortrait,
    tabletLandscape,
    uspravnoMobTab,
    portrait,
    landscape,
    orijentacija,
    linijaUredjaj,
    nizak: h < 720,
    unosStek: uspravnoMobTab,
    /** Za key/remount layouta pri rotaciji (ne pri otvaranju tastature) */
    orientRev,
    viewportKey: `v${orientRev}-${w}`,
    /** Aktivna visina (visualViewport — skuplja se kad tastatura izađe) */
    visinaLayout: h,
  };
}

function readViewport() {
  if (typeof window === "undefined") return { w: 1280, h: 800, visinaPuna: 800 };
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  const visinaPuna = Math.round(window.innerHeight);
  return { w, h, visinaPuna };
}

/** Reset skrola posle rotacije — pozovi u useEffect([viewportKey]) */
export function resetSkrolPosleRotacije() {
  if (typeof window === "undefined") return;
  const top = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  top();
  requestAnimationFrame(top);
}
