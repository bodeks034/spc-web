/** Heatmap NOK po danu × smena (atributivne). */
export default function SpcAtrHeatmapDanSmena({ rawData, C, maxDana = 14, kompakt = false }) {
  const matrix = {};
  const dani = [];
  (rawData || []).forEach((r) => {
    if (!r.datum) return;
    if (!matrix[r.datum]) {
      matrix[r.datum] = {};
      dani.push(r.datum);
    }
    const s = `Smena ${r.smena || 1}`;
    matrix[r.datum][s] = (matrix[r.datum][s] || 0) + (r.nok_kolicina || 0);
  });

  const unikDani = [...new Set(dani)].sort().slice(-maxDana);
  const smene = ["Smena 1", "Smena 2", "Smena 3"];
  const maxVal = unikDani.reduce(
    (mx, d) => Math.max(mx, ...smene.map((s) => matrix[d]?.[s] || 0)),
    0,
  );

  const getColor = (v) => {
    if (v === 0) return C.hover;
    const int = Math.min(v / Math.max(maxVal, 1), 1);
    if (int < 0.33) return `${C.zelena}80`;
    if (int < 0.66) return `${C.zuta}90`;
    return C.crvena + Math.round(128 + int * 127).toString(16).padStart(2, "0");
  };

  if (!unikDani.length) {
    return (
      <div style={{ color: C.border, fontSize: 11, textAlign: "center", padding: 24 }}>
        Nema NOK za heatmapu
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>0</span>
        {[C.hover, `${C.zelena}80`, `${C.zuta}90`, `${C.crvena}aa`, C.crvena].map((c, i) => (
          <div key={i} style={{ width: kompakt ? 16 : 20, height: 12, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ color: C.sivi, fontSize: 9 }}>max ({maxVal})</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${unikDani.length}, minmax(${kompakt ? 22 : 28}px, 1fr))`,
          gap: 2,
          minWidth: 280,
        }}>
          <div />
          {unikDani.map((d) => (
            <div
              key={d}
              style={{
                color: C.sivi,
                fontSize: 7,
                textAlign: "center",
                transform: "rotate(-55deg)",
                transformOrigin: "bottom center",
                height: kompakt ? 32 : 40,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {d.substring(5)}
            </div>
          ))}
          {smene.map((s) => (
            <div key={s} style={{ display: "contents" }}>
              <div style={{
                color: C.sivi,
                fontSize: 9,
                display: "flex",
                alignItems: "center",
                paddingRight: 4,
              }}>
                {s.replace("Smena ", "S")}
              </div>
              {unikDani.map((d) => {
                const v = matrix[d]?.[s] || 0;
                return (
                  <div
                    key={`${d}-${s}`}
                    title={`${d} ${s}: ${v} NOK`}
                    style={{
                      background: getColor(v),
                      borderRadius: 3,
                      height: kompakt ? 18 : 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: v > 0 ? 8 : 0,
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {v > 0 ? v : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
