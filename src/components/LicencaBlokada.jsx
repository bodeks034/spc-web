import LogoBrend from "./LogoBrend.jsx";
import { getBrending } from "../lib/brending.js";

export default function LicencaBlokada({ poruka, kod, C }) {
  const brending = getBrending();
  const tema = C || {
    bg: "#0d1117",
    panel: "#161b22",
    border: "#30363d",
    crvena: "#ef4444",
    sivi: "#94a3b8",
    tekst: "#e6edf3",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: tema.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'IBM Plex Mono', monospace",
      color: tema.tekst,
      boxSizing: "border-box",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: tema.panel,
        border: `1px solid ${tema.crvena}`,
        borderRadius: 12,
        padding: "28px 24px",
        textAlign: "center",
      }}>
        <div style={{ marginBottom: 16 }}>
          <LogoBrend C={tema} velicina="srednji" centar showSlogan />
        </div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⛔</div>
        <h1 style={{ fontSize: 16, margin: "0 0 12px", color: tema.crvena }}>
          Program je onemogućen
        </h1>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: tema.sivi, margin: "0 0 16px" }}>
          {poruka || "Licenca nije važeća. Kontaktirajte dobavljača softvera."}
        </p>
        {brending.razvojKontakt && (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: tema.tekst, margin: "0 0 12px" }}>
            Podrška: {brending.razvojKontakt}
          </p>
        )}
        {kod && (
          <div style={{ fontSize: 10, color: tema.border }}>
            Kod: {kod}
          </div>
        )}
      </div>
    </div>
  );
}
