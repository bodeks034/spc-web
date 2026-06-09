import { useState } from "react";
import { getBrending } from "../lib/brending.js";

const VISINE = { veliki: 88, srednji: 56, mali: 40 };
const SIRINE = { veliki: 280, srednji: 200, mali: 140 };

/** Logo firme iz public/logo-firme.png ili VITE_LOGO_URL; fallback na SPC. */
export default function LogoFirme({ velicina = "srednji", C, centar = true }) {
  const [greska, setGreska] = useState(false);
  const b = getBrending();
  const h = VISINE[velicina] || VISINE.srednji;
  const boja = C?.plava || "#3b82f6";
  const sivi = C?.sivi || "#94a3b8";

  const fallback = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: centar ? "center" : "flex-start",
      gap: velicina === "mali" ? 6 : 10,
    }}>
      <span style={{ fontSize: velicina === "veliki" ? 32 : velicina === "mali" ? 18 : 24 }}>⚙</span>
      <span style={{
        color: boja,
        fontWeight: 700,
        fontSize: velicina === "veliki" ? 18 : velicina === "mali" ? 12 : 15,
        letterSpacing: velicina === "mali" ? 1 : 2,
      }}>
        SPC
      </span>
    </div>
  );

  if (!b.logoUrl || greska) return fallback;

  return (
    <img
      src={b.logoUrl}
      alt={b.nazivFirme || b.nazivAplikacije}
      onError={() => setGreska(true)}
      style={{
        display: "block",
        margin: centar ? "0 auto" : 0,
        maxHeight: h,
        maxWidth: SIRINE[velicina] || SIRINE.srednji,
        width: "auto",
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}
