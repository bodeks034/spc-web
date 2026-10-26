/**
 * Prazan unos dok ID dela nije spreman (atributivne / generički).
 */
export default function IdUnosEmptyState({
  C,
  H = 1,
  naslov = "Unesite ID dela",
  opis = "Skenirajte barkod ili unesite šifru u levi panel (npr. 5502-A), zatim Enter.",
  upozorenjePogon = null,
}) {
  return (
    <div
      data-testid="id-unos-empty"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: Math.round(24 * H),
        minHeight: 0,
        textAlign: "center",
        gap: Math.round(12 * H),
        background: C.panel,
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
        margin: Math.round(12 * H),
      }}
    >
      <div style={{ fontSize: Math.round(40 * H), opacity: 0.35, lineHeight: 1 }}>📷</div>
      <div style={{ color: C.tekst, fontSize: Math.round(14 * H), fontWeight: 700 }}>
        {naslov}
      </div>
      <div style={{ color: C.sivi, fontSize: Math.round(11 * H), lineHeight: 1.55, maxWidth: 360 }}>
        {opis}
      </div>
      {upozorenjePogon && (
        <div style={{ color: C.zuta, fontSize: Math.round(10 * H), maxWidth: 360 }}>
          {upozorenjePogon}
        </div>
      )}
    </div>
  );
}
