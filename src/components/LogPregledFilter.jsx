/** Zajednička traka filtera za LOG tab (datum, smena, offline info). */
export default function LogPregledFilter({
  C,
  datum,
  onDatumChange,
  smena,
  onSmenaChange,
  onOsvezi,
  onDanas,
  loading = false,
  offlineStavki = 0,
  online = true,
  ukupnoPrikazano = 0,
}) {
  const sel = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    color: C.tekst,
    fontSize: 10,
    padding: "4px 8px",
    fontFamily: "inherit",
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi }}>
            Datum
            <input
              type="date"
              value={datum}
              onChange={(e) => onDatumChange(e.target.value)}
              style={sel}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi }}>
            Smena
            <select value={smena} onChange={(e) => onSmenaChange(e.target.value)} style={sel}>
              <option value="1">S1</option>
              <option value="2">S2</option>
              <option value="3">S3</option>
              <option value="sve">Sve</option>
            </select>
          </label>
          {onDanas && (
            <button
              type="button"
              onClick={onDanas}
              style={{
                background: C.hover,
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                color: C.sivi,
                fontSize: 9,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Danas
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOsvezi}
          disabled={loading}
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            color: C.sivi,
            fontSize: 10,
            padding: "4px 12px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "…" : "↻ Osveži"}
        </button>
      </div>
      <div style={{ fontSize: 9, color: C.sivi, marginTop: 6, lineHeight: 1.5 }}>
        {ukupnoPrikazano} redova
        {offlineStavki > 0 && (
          <span style={{ color: C.zuta, marginLeft: 8 }}>
            · 📶 {offlineStavki} u offline redu{!online ? " (čeka mrežu)" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
