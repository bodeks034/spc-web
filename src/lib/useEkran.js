import { useState, useEffect } from "react";

/** mob <640 · tablet <1024 · desk ≥1024 · wide ≥1400 */
export function useEkran() {
  const [sz, setSz] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () => setSz({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const { w, h } = sz;
  return {
    w,
    h,
    mob: w < 640,
    tablet: w < 1024,
    desk: w >= 1024,
    wide: w >= 1400,
    /** Nizak viewport (landscape telefon, kompakt laptop) */
    nizak: h < 720,
    /** Merljive unos: slika iznad, kolone u horizontalnom skrolu */
    unosStek: w < 960 || h < 640,
  };
}
