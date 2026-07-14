/**
 * Wireframe prikaz ekrana digitalnog ključa (ref: Prikaz_ekrana_digitalnog_kljuca.svg).
 */
export default function MomentEkranKljuca({
  C,
  jobKod,
  korakRedosled,
  ukupnoKoraka,
  prolaz = 1,
  ciljNm,
  ostvarenoNm = null,
  ostvarenoUgao = null,
  ugaoCilj = null,
  ugaoTol = 5,
  tolMin = null,
  tolMax = null,
  status = null,
  kompakt = false,
  mini = false,
  visinaMini = null,
}) {
  const imaOstvareno = ostvarenoNm != null && ostvarenoNm !== "";
  const nm = imaOstvareno ? Number(ostvarenoNm) : null;
  const cilj = Number(ciljNm);
  const min = tolMin != null ? Number(tolMin) : null;
  const max = tolMax != null ? Number(tolMax) : null;

  let faza = "spreman";
  if (status === "OK") faza = "ok";
  else if (status === "NOK") faza = "nok";
  else if (imaOstvareno && Number.isFinite(nm) && min != null && max != null) {
    faza = nm >= min && nm <= max ? "ok" : "nok";
  } else if (imaOstvareno) faza = "ok";

  const boje = {
    spreman: { bg: "#0d1b2a", border: "#33475b", tekst: "#8bc9ff", broj: "#ffffff", statusBg: "#33475b", statusTekst: "#ffe08a" },
    ok: { bg: "#0d1b2a", border: "#2e8b57", tekst: "#8bc9ff", broj: "#7CFC9A", statusBg: "#155724", statusTekst: "#7CFC9A" },
    nok: { bg: "#2a0d0d", border: "#c0392b", tekst: "#ff9b9b", broj: "#ff6b6b", statusBg: "#7a1f1f", statusTekst: "#ff6b6b" },
  };
  const b = boje[faza] || boje.spreman;

  let barPct = 0;
  if (Number.isFinite(nm) && min != null && max != null && max > min) {
    barPct = Math.min(100, Math.max(0, ((nm - min) / (max - min)) * 100));
  }

  const prikazBroj = imaOstvareno && Number.isFinite(nm) ? nm : cilj;
  const labelNm = imaOstvareno ? "Nm (ostvareno)" : "Nm (cilj)";
  const fs = mini ? 28 : (kompakt ? 30 : 46);
  const usko = mini || kompakt;

  const statusTekst = (() => {
    if (faza === "spreman") return mini ? "SPREMAN" : "SPREMAN — postavi ključ na spoj";
    if (faza === "ok") {
      const sledeci = korakRedosled < ukupnoKoraka ? korakRedosled + 1 : null;
      if (mini) return sledeci ? `OK → ${sledeci}/${ukupnoKoraka}` : "OK — kraj";
      return sledeci
        ? `✓ OK — pređi na korak ${sledeci}/${ukupnoKoraka}`
        : "✓ OK — sekvenca završena";
    }
    if (mini && min != null && max != null) return nm < min ? "NOK ↓" : nm > max ? "NOK ↑" : "NOK";
    if (min != null && max != null && nm < min) return `✗ NOK — ispod tolerancije (${min}–${max} Nm)`;
    if (min != null && max != null && nm > max) return `✗ NOK — iznad tolerancije (${min}–${max} Nm)`;
    return mini ? "NOK" : "✗ NOK — re-torque potreban";
  })();

  const imaUgao = ugaoCilj != null;

  return (
    <div style={{
      background: mini ? "transparent" : "#1a1a1a",
      borderRadius: mini ? 8 : 14,
      padding: mini ? 0 : (kompakt ? 6 : 10),
      marginBottom: mini ? 0 : (kompakt ? 4 : 10),
      flex: mini ? "1 1 auto" : undefined,
      minHeight: mini ? (visinaMini || 112) : undefined,
      display: mini ? "flex" : undefined,
      flexDirection: mini ? "column" : undefined,
      width: mini ? "100%" : undefined,
      maxWidth: mini ? "100%" : undefined,
    }}
    >
      <div style={{
        background: b.bg,
        border: `${mini ? 1 : 2}px solid ${b.border}`,
        borderRadius: mini ? 8 : 10,
        padding: mini ? "10px 12px" : (kompakt ? "8px 10px" : "16px 18px"),
        textAlign: "center",
        flex: mini ? 1 : undefined,
        minHeight: mini ? (visinaMini ? visinaMini - 8 : 104) : undefined,
        display: mini ? "flex" : undefined,
        flexDirection: mini ? "column" : undefined,
        justifyContent: mini ? "center" : undefined,
      }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 6,
          textAlign: "left",
        }}
        >
          <div style={{ color: b.tekst, fontSize: mini ? 10 : (kompakt ? 11 : 13), fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {jobKod || "—"}
          </div>
          <div style={{ color: b.tekst, fontSize: mini ? 10 : (kompakt ? 10 : 12), flexShrink: 0 }}>
            {korakRedosled || "—"}/{ukupnoKoraka || "—"}
            {prolaz > 1 ? ` · p${prolaz}` : ""}
          </div>
        </div>

        {imaUgao && (faza !== "spreman" || imaOstvareno) ? (
          <div style={{ marginTop: mini ? 4 : 10 }}>
            <div style={{ fontSize: mini ? 22 : (kompakt ? 22 : 30), fontWeight: 700, color: b.broj, lineHeight: 1.1 }}>
              {prikazBroj} Nm
              {ostvarenoUgao != null && ostvarenoUgao !== "" && (
                <span style={{ fontSize: mini ? 16 : (kompakt ? 18 : 24), marginLeft: 6 }}>+ {ostvarenoUgao}°</span>
              )}
            </div>
            {!mini && (
              <div style={{ color: "#c9d6e3", fontSize: 9, marginTop: 2 }}>
                cilj: {cilj} Nm + {ugaoCilj}° (±{ugaoTol || 5}°)
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, margin: mini ? "8px 0 4px" : "8px 0 4px" }}>
            <div style={{ fontSize: fs, fontWeight: 700, color: b.broj, lineHeight: 1 }}>
              {Number.isFinite(prikazBroj) ? prikazBroj : "—"}
            </div>
            {!mini && <div style={{ color: b.tekst, fontSize: kompakt ? 10 : 12 }}>{labelNm}</div>}
            {mini && <div style={{ color: b.tekst, fontSize: 11 }}>Nm</div>}
          </div>
        )}

        {min != null && max != null && !mini && (
          <div style={{ marginTop: mini ? 3 : (kompakt ? 6 : 12), padding: mini ? 0 : "0 8px" }}>
            <div style={{
              height: mini ? 4 : (usko ? 6 : 10), borderRadius: 3, background: "#33475b", overflow: "hidden", position: "relative",
            }}
            >
              <div style={{
                height: "100%",
                width: `${barPct}%`,
                background: faza === "nok" ? "#c0392b" : "#2e8b57",
                borderRadius: 3,
                transition: "width 0.25s ease",
              }}
              />
            </div>
            {!mini && (
              <div style={{ color: "#c9d6e3", fontSize: 9, marginTop: 4 }}>
                {faza === "spreman"
                  ? `Tolerancija: ${min}–${max} Nm`
                  : faza === "ok" ? "Unutar tolerancije" : `Van tolerancije (${min}–${max} Nm)`}
              </div>
            )}
          </div>
        )}

        <div style={{
          marginTop: mini ? 8 : (kompakt ? 6 : 12),
          padding: mini ? "8px 10px" : "6px 10px",
          borderRadius: 4,
          background: b.statusBg,
          color: b.statusTekst,
          fontSize: mini ? 11 : (kompakt ? 10 : 12),
          fontWeight: 700,
          lineHeight: 1.2,
        }}
        >
          {statusTekst}
          {mini && min != null && max != null && faza === "spreman" && (
            <span style={{ fontWeight: 400, opacity: 0.85 }}> · {min}–{max} Nm</span>
          )}
        </div>
      </div>
    </div>
  );
}
