/** Panel sa automatskim predlogom SPC karata (atributivne / merljive). */

export default function SpcVodicPredlog({ C, predlog, tip, setTip, onZatvori, kompakt }) {
  if (!predlog?.stavke?.length) return null;

  const { naslov, ikona = "📊", opis, stavke } = predlog;
  const prikazStavki = kompakt ? stavke.slice(0, 3) : stavke;

  return (
    <div style={{
      background: `${C.plava}12`,
      border: `1px solid ${C.plava}40`,
      borderRadius: 8,
      padding: kompakt ? "10px 12px" : "12px 14px",
      marginBottom: 14,
      fontSize: kompakt ? 10 : 11,
      color: C.tekst,
      lineHeight: 1.45,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 8, marginBottom: kompakt ? 6 : 8,
      }}>
        <div style={{ fontWeight: 700, color: C.plava, fontSize: kompakt ? 11 : 12 }}>
          {ikona} Predlog karata — {naslov}
        </div>
        <button type="button" onClick={onZatvori}
          style={{
            background: "none", border: "none", color: C.sivi, fontSize: 10,
            cursor: "pointer", padding: "2px 4px", flexShrink: 0,
          }}>
          Sakrij
        </button>
      </div>
      {opis && (
        <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>{opis}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: kompakt ? 6 : 8 }}>
        {prikazStavki.map(s => (
          <button key={s.id} type="button" onClick={() => setTip(s.id)}
            style={{
              background: tip === s.id ? `${C.plava}28` : C.panel,
              border: `1px solid ${tip === s.id ? C.plava : C.border}`,
              borderRadius: 6,
              color: tip === s.id ? C.plava : C.tekst,
              fontSize: kompakt ? 10 : 11,
              fontWeight: tip === s.id ? 700 : 500,
              padding: kompakt ? "6px 10px" : "7px 12px",
              cursor: "pointer",
              textAlign: "left",
            }}>
            <span style={{ fontWeight: 700 }}>{s.naziv}</span>
            {!kompakt && s.tekst && (
              <span style={{ color: C.sivi, display: "block", fontSize: 9, marginTop: 2 }}>{s.tekst}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ color: C.border, fontSize: 9, marginTop: 10 }}>
        <strong style={{ color: C.plava }}>PDF izveštaj</strong> — sve ★ preporučene karte u jedan PDF.
        {" "}
        <strong style={{ color: C.plava }}>PDF ove karte</strong> — samo tab koji gledaš.
      </div>
    </div>
  );
}

export function tabJePreporucen(predlog, tabId) {
  return predlog?.preporuceniIds?.includes(tabId) ?? false;
}
