/** Modul nije u licenci. */
export default function ModulBlokiran({ nazivModula, C, onNazad }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'IBM Plex Mono', monospace",
      color: C.tekst,
    }}>
      <div style={{
        maxWidth: 440,
        width: "100%",
        background: C.panel,
        border: `1px solid ${C.zuta}`,
        borderRadius: 12,
        padding: "24px 20px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
        <h1 style={{ fontSize: 15, margin: "0 0 10px", color: C.zuta }}>
          Modul nije u licenci
        </h1>
        <p style={{ fontSize: 11, color: C.sivi, lineHeight: 1.6, margin: "0 0 16px" }}>
          <strong>{nazivModula}</strong> nije uključen u vašu licencu.
          Kontaktirajte dobavljača za produženje ili aktivaciju modula.
        </p>
        {onNazad && (
          <button type="button" onClick={onNazad} style={{
            background: C.plava,
            border: "none",
            borderRadius: 8,
            color: C.onAkcent,
            fontSize: 12,
            fontWeight: 700,
            padding: "10px 20px",
            cursor: "pointer",
          }}>
            ← Nazad
          </button>
        )}
      </div>
    </div>
  );
}
