import SpcKontrolnaGraf from "../SpcKontrolnaGraf.jsx";
import { formatBaselineBadge } from "../../lib/spcBaseline.js";
import { LAB_FPY_KRATKO } from "../../lib/rtyFpy.js";

function TrendUpozorenje({ podaci, C }) {
  if (!podaci?.length || podaci.length < 5) return null;
  const posl5 = podaci.slice(-5).map((d) => d.val || 0);
  const rastuci = posl5.every((v, i) => i === 0 || v >= posl5[i - 1]);
  const prosek5 = posl5.reduce((s, v) => s + v, 0) / 5;
  const prosekSvi = podaci.reduce((s, d) => s + (d.val || 0), 0) / podaci.length;
  const porast = prosek5 > prosekSvi * 1.15;
  if (!rastuci && !porast) return null;
  return (
    <div style={{
      background: `${C.zuta}18`,
      border: `1px solid ${C.zuta}50`,
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14,
      display: "flex",
      gap: 10,
      alignItems: "center",
    }}>
      <span style={{ fontSize: 18 }}>📈</span>
      <div>
        <div style={{ color: C.zuta, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
          TREND UPOZORENJE — proces se pogoršava
        </div>
        <div style={{ color: C.sivi, fontSize: 11 }}>
          {rastuci && "Poslednjih 5 tačaka uzastopno raste. "}
          {porast && `Prosek posled. 5 (${prosek5.toFixed(2)}) je >15% iznad ukupnog proseka (${prosekSvi.toFixed(2)}).`}
          {" Preduzeti korektivnu akciju pre nego što se probije UCL."}
        </div>
      </div>
    </div>
  );
}

/** p / C karta — isti prikaz kao tab u SPC KARTE. */
export default function SpcAtrKontrolnaKartaSekcija({
  C,
  tip,
  cd,
  naziv,
  opis,
  boja,
  sufiks = "",
  grupisanje,
  nBar,
  nTacaka,
  baselineAktivan,
  rtyPct,
  ppm,
  dpmo,
  dpmoDefekti,
  onDetalj,
  naslovSekcije,
  formatVrednost,
}) {
  if (!cd?.length) return null;

  const upozoreni = cd.filter((d) => d.upoz);
  const cl = cd.length ? +(cd.reduce((s, d) => s + d.cl, 0) / cd.length).toFixed(4) : 0;
  const ucl = cd.length ? +(cd.reduce((s, d) => s + d.ucl, 0) / cd.length).toFixed(4) : 0;
  const lcl = cd.length ? +(cd.reduce((s, d) => s + d.lcl, 0) / cd.length).toFixed(4) : 0;

  const kpiRed = [
    ["CL", `${cl}${sufiks}`, C.zuta, "Centralna linija"],
    ["UCL", `${ucl}${sufiks}`, C.crvena, "+3σ"],
    ["LCL", `${lcl}${sufiks}`, C.zelena, "-3σ"],
    ["TAČAKA", cd.length, C.plava, ""],
    ["VAN K.", upozoreni.length, upozoreni.length > 0 ? C.crvena : C.zelena,
      upozoreni.length > 0 ? "⚠" : "✓ OK"],
  ];

  if (tip === "p") {
    kpiRed.push(
      [LAB_FPY_KRATKO, rtyPct ?? "-", C.ljubicasta, ""],
      ["PPM", ppm != null ? ppm.toLocaleString() : "-", C.narandzasta, "kom/mil."],
      ["DPMO", dpmo != null ? dpmo.toLocaleString() : "-", "#f472b6", dpmoDefekti ? "defekti" : ""],
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, fontWeight: 700 }}>
          {naslovSekcije || (tip === "p" ? "AKTIVNA p-KARTA" : tip === "u" ? "AKTIVNA u-KARTA" : "AKTIVNA C-KARTA")}
        </div>
        {onDetalj && (
          <button
            type="button"
            onClick={onDetalj}
            style={{
              background: "none",
              border: `1px solid ${C.plava}`,
              borderRadius: 6,
              color: C.plava,
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Detalj →
          </button>
        )}
      </div>

      <div style={{ color: C.border, fontSize: 9, marginBottom: 10, letterSpacing: 0.5 }}>
        Ista logika kao SPC KARTE · cela istorija dela (bez ograničenja perioda filtera)
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {kpiRed.map(([n, v, b, o]) => (
          <div
            key={n}
            style={{
              background: C.panel,
              border: `1px solid ${b}25`,
              borderRadius: 8,
              padding: "10px 14px",
              textAlign: "center",
              minWidth: 84,
            }}
          >
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 3 }}>{n}</div>
            <div style={{ color: b, fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            {o && <div style={{ color: C.sivi, fontSize: 8, marginTop: 1 }}>{o}</div>}
          </div>
        ))}
      </div>

      <TrendUpozorenje podaci={cd} C={C} />

      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>
        <strong style={{ color: boja }}>{naziv}</strong>
        {" — "}
        {opis}
        {tip === "p" && nBar != null && <> · n̄ = {Math.round(nBar)}</>}
        {grupisanje === "komad" && nTacaka != null && <> · {nTacaka} komada na grafikonu</>}
      </div>

      {grupisanje === "komad" && (nTacaka ?? 0) > 1 && (
        <div style={{
          background: `${C.plava}12`,
          border: `1px solid ${C.plava}35`,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          color: C.sivi,
          fontSize: 11,
        }}>
          Grupisanje <strong style={{ color: C.plava }}>po komadu</strong> — svaka tačka = jedan komad.
        </div>
      )}

      {tip === "c" && cd.every((d) => !d.val) && (
        <div style={{
          background: `${C.zuta}12`,
          border: `1px solid ${C.zuta}40`,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          color: C.zuta,
          fontSize: 11,
        }}>
          C-karta prati broj defekata — svi unosi su OK (nema grešaka za crtanje).
        </div>
      )}

      {baselineAktivan && (
        <div style={{
          background: `${C.zuta}18`,
          border: `1px solid ${C.zuta}50`,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          color: C.zuta,
          fontSize: 11,
          fontWeight: 700,
        }}>
          📌 {formatBaselineBadge(baselineAktivan)}
          {baselineAktivan.napomena ? (
            <span style={{ color: C.sivi, fontWeight: 400 }}> · {baselineAktivan.napomena}</span>
          ) : null}
        </div>
      )}

      <SpcKontrolnaGraf
        podaci={cd}
        bojaLinije={boja}
        C={C}
        sufiks={sufiks}
        naslovKarte={naziv}
        height={400}
        formatVrednost={formatVrednost || ((v) => (Number.isFinite(v) ? String(v) : "—"))}
      />

      {upozoreni.length > 0 && (
        <div style={{
          marginTop: 12,
          background: C.nok,
          border: `1px solid ${C.crvena}30`,
          borderRadius: 8,
          padding: "10px 14px",
        }}>
          <div style={{ color: C.crvena, fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
            ⚠ WESTERN ELECTRIC — {upozoreni.length} tačaka van statističke kontrole
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {upozoreni.map((d, i) => (
              <span
                key={i}
                style={{
                  background: `${C.crvena}20`,
                  border: `1px solid ${C.crvena}40`,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  color: C.crvena,
                }}
              >
                {d.label}: {d.val}{sufiks}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
