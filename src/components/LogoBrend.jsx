import { useState } from "react";
import { getBrending } from "../lib/brending.js";

/** Tekstualni brend — TRI-CORE (plavo) + QC (narandžasto). */
export function TriCoreQcTekst({ C, velicina = "srednji", centar = false }) {
  const plava = C?.plava || "#2c5282";
  const narandzasta = C?.narandzasta || "#e67e22";

  const font = {
    login: { size: 22, spacing: 1.0, weight: 800 },
    veliki: { size: 22, spacing: 1, weight: 800 },
    srednji: { size: 16, spacing: 0.8, weight: 700 },
    header: { size: 13, spacing: 0.5, weight: 700 },
    mali: { size: 12, spacing: 0.4, weight: 700 },
  }[velicina] || { size: 16, spacing: 0.8, weight: 700 };

  return (
    <span style={{
      display: "inline-block",
      fontWeight: font.weight,
      fontSize: font.size,
      letterSpacing: font.spacing,
      lineHeight: 1.15,
      whiteSpace: "nowrap",
      textAlign: centar ? "center" : "left",
    }}>
      <span style={{ color: plava }}>TRI-CORE</span>
      <span style={{ color: narandzasta }}> QC</span>
    </span>
  );
}

/** Samo ikona (T3 + tri modula, brojevi 0/1/2 i natpisi). */
export function TriCoreQcIkona({ velicina = "srednji", centar = true }) {
  const [greska, setGreska] = useState(false);
  const base = import.meta.env.BASE_URL || "/";
  const b = getBrending();

  const px = {
    login: 152,
    veliki: 88,
    srednji: 52,
    header: 34,
    mali: 28,
  }[velicina] || 52;

  const box = velicina === "login"
    ? { w: 250, h: 260 }
    : { w: px, h: px };

  if (greska) {
    return (
      <div style={{
        width: box.w,
        height: box.h,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #2c5282 0%, #e67e22 100%)",
        opacity: 0.35,
      }} />
    );
  }

  const src = b.logoIconUrl || `${base}tri-core-qc-icon.png`;
  const srcSet = velicina === "login" ? `${src} 1536w` : undefined;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={velicina === "login" ? `${box.w}px` : undefined}
      alt=""
      role="presentation"
      onError={() => setGreska(true)}
      style={{
        display: "block",
        margin: centar ? "0 auto" : 0,
        width: box.w,
        height: box.h,
        maxWidth: velicina === "login" ? box.w : "100%",
        objectFit: "contain",
        objectPosition: velicina === "login" ? "center bottom" : "center center",
        imageRendering: velicina === "login" ? "-webkit-optimize-contrast" : "auto",
      }}
    />
  );
}

/** Ikona + TRI-CORE QC tekst (+ opcioni slogan). */
export default function LogoBrend({
  C,
  velicina = "srednji",
  centar = false,
  showSlogan = false,
  vertikalno = false,
}) {
  const b = getBrending();
  const razmakTekst = velicina === "login" ? -18 : 0;
  const gapIkona = velicina === "header" ? 8 : 10;

  if (vertikalno || velicina === "login") {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ overflow: "visible", lineHeight: 0, marginBottom: 0 }}>
          <TriCoreQcIkona velicina={velicina} centar />
        </div>
        <div style={{ marginTop: razmakTekst }}>
          <TriCoreQcTekst C={C} velicina={velicina} centar />
          {showSlogan && (
            <div style={{
              color: C?.sivi || "#94a3b8",
              fontSize: velicina === "login" ? 9.5 : 10,
              letterSpacing: 0.3,
              lineHeight: 1.45,
              maxWidth: 340,
              marginTop: velicina === "login" ? 6 : 4,
              textTransform: "uppercase",
            }}>
              {b.slogan}
            </div>
          )}
        </div>
      </div>
    );
  }

  const gap = gapIkona;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap,
      justifyContent: centar ? "center" : "flex-start",
    }}>
      <TriCoreQcIkona velicina={velicina} centar={false} />
      <div>
        <TriCoreQcTekst C={C} velicina={velicina} />
        {showSlogan && (
          <div style={{
            color: C?.sivi || "#94a3b8",
            fontSize: 9,
            marginTop: 2,
            letterSpacing: 0.2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}>
            {b.slogan}
          </div>
        )}
      </div>
    </div>
  );
}
