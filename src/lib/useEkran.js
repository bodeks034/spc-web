import { useState, useEffect } from "react";

/** mob <640 · tablet <1024 · desk ≥1024 · wide ≥1400 */
export function useEkran() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return {
    w,
    mob: w < 640,
    tablet: w < 1024,
    desk: w >= 1024,
    wide: w >= 1400,
  };
}
