import { useState } from "react";
import { getBrending } from "../lib/brending.js";

const VISINE = { veliki: 120, srednji: 56, mali: 32, header: 26, lockup: 22 };
const SIRINE = { veliki: 320, srednji: 200, mali: 140, header: 120, lockup: 180 };

/** Logo TRI-CORE QC — pun PNG, simbol PNG/SVG, horizontalni lockup SVG. */
export default function LogoFirme({
  velicina = "srednji",
  C,
  centar = true,
  tip = "pun",
}) {
  const [greska, setGreska] = useState(false);
  const b = getBrending();
  const base = import.meta.env.BASE_URL || "/";
  const h = VISINE[velicina] || VISINE.srednji;
  const w = SIRINE[velicina] || SIRINE.srednji;
  const boja = C?.plava || "#2c5282";
  const narandzasta = C?.narandzasta || "#e67e22";

  const fallback = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: centar ? "center" : "flex-start",
    }}>
      <span style={{
        color: boja,
        fontWeight: 800,
        fontSize: velicina === "veliki" ? 22 : velicina === "header" || velicina === "lockup" ? 13 : velicina === "mali" ? 12 : 16,
        letterSpacing: velicina === "header" || velicina === "lockup" ? 0.4 : 0.8,
        whiteSpace: "nowrap",
      }}>
        TRI-CORE
        <span style={{ color: narandzasta }}> QC</span>
      </span>
    </div>
  );

  if (greska) return fallback;

  if (tip === "lockup") {
    return (
      <img
        src={`${base}tri-core-qc-lockup.svg`}
        alt={b.nazivAplikacije}
        onError={() => setGreska(true)}
        style={{
          display: "block",
          margin: centar ? "0 auto" : 0,
          height: h,
          maxWidth: w,
          width: "auto",
          objectFit: "contain",
        }}
      />
    );
  }

  if (tip === "mark") {
    return (
      <img
        src={`${base}tri-core-qc-mark.svg`}
        alt="TRI-CORE"
        onError={() => setGreska(true)}
        style={{
          display: "block",
          margin: centar ? "0 auto" : 0,
          height: h,
          width: h,
          objectFit: "contain",
        }}
      />
    );
  }

  const src = tip === "simbol" ? (b.logoSymbolUrl || `${base}tri-core-qc-symbol.png`) : b.logoUrl;
  if (!src) return fallback;

  return (
    <img
      src={src}
      alt={b.nazivAplikacije}
      onError={() => setGreska(true)}
      style={{
        display: "block",
        margin: centar ? "0 auto" : 0,
        maxHeight: h,
        maxWidth: w,
        width: "auto",
        height: tip === "simbol" && velicina === "header" ? h : "auto",
        objectFit: "contain",
      }}
    />
  );
}
