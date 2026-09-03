/** Ponuda da se vrati nepotvrđena radna lista iz prethodne sesije. */

function kada(iso) {
  try {
    return new Date(iso).toLocaleString("sr-RS", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NacrtVracanjeBanner({ nacrt, opis, onVrati, onOdbaci, C }) {
  if (!nacrt) return null;
  const zuta = C?.zuta || "#f59e0b";

  return (
    <div
      role="region"
      aria-label="Nepotvrđeni unos iz prethodne sesije"
      style={{
        background: `${zuta}18`,
        border: `1px solid ${zuta}66`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 10,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 200, color: C?.tekst, fontSize: 12, lineHeight: 1.5 }}>
        <strong style={{ color: zuta }}>Nezavršen unos</strong>{" "}
        {opis ? `— ${opis}` : ""}{" "}
        <span style={{ color: C?.sivi, fontSize: 11 }}>({kada(nacrt.snimljeno)})</span>
        <div style={{ color: C?.sivi, fontSize: 11 }}>
          Aplikacija je zatvorena pre snimanja. Možeš nastaviti gde si stao.
        </div>
      </div>
      <button
        type="button"
        onClick={onVrati}
        data-testid="nacrt-vrati"
        style={{
          background: zuta, border: "none", borderRadius: 6,
          color: "#111", fontSize: 12, fontWeight: 700,
          padding: "10px 16px", cursor: "pointer", minHeight: 40,
        }}
      >
        Vrati unos
      </button>
      <button
        type="button"
        onClick={onOdbaci}
        data-testid="nacrt-odbaci"
        style={{
          background: "transparent", border: `1px solid ${C?.border}`, borderRadius: 6,
          color: C?.sivi, fontSize: 12, fontWeight: 700,
          padding: "10px 16px", cursor: "pointer", minHeight: 40,
        }}
      >
        Odbaci
      </button>
    </div>
  );
}
