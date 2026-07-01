import { bojaKapabiliteta } from "../../lib/varijabilneSpcStats.js";

function opisKapabiliteta(v) {
  if (v == null || !Number.isFinite(v)) return "Nema podataka";
  if (v >= 1.33) return "Sposoban";
  if (v >= 1.0) return "Optimizacija";
  return "Van specifikacije";
}

function stabilnostStatus({ vanX, vanR, podgrupe, imaPoziciju, C }) {
  if (!imaPoziciju) {
    return { boja: C.sivi, vrednost: "—", opis: "Izaberi karakteristiku", detalj: "X̄/R karte" };
  }
  if (podgrupe < 2) {
    return { boja: C.sivi, vrednost: "—", opis: "Nedovoljno podgrupa", detalj: `Potrebno n=${podgrupe || 0}` };
  }
  const uk = (vanX || 0) + (vanR || 0);
  if (uk === 0) {
    return { boja: C.zelena, vrednost: "OK", opis: "U kontroli", detalj: "X̄ i R bez upozorenja" };
  }
  return {
    boja: C.crvena,
    vrednost: `${uk} ⚠`,
    opis: "Van kontrole",
    detalj: `X̄: ${vanX || 0} · R: ${vanR || 0}`,
  };
}

function SemaforCelija({
  C,
  naslov,
  podnaslov,
  vrednost,
  boja,
  opis,
  detalj,
  onClick,
  kompakt,
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        background: C.panel,
        border: `2px solid ${boja}55`,
        borderRadius: 12,
        padding: kompakt ? "12px 10px" : "16px 14px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        boxShadow: `inset 0 0 24px ${boja}12`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: kompakt ? 14 : 18,
          height: kompakt ? 14 : 18,
          borderRadius: "50%",
          background: boja,
          boxShadow: `0 0 12px ${boja}88`,
          flexShrink: 0,
        }}
        aria-hidden
      />
      <div style={{ color: C.sivi, fontSize: kompakt ? 8 : 9, letterSpacing: 1, fontWeight: 700, lineHeight: 1.2 }}>
        {naslov}
      </div>
      {podnaslov && (
        <div style={{ color: C.border, fontSize: 8, letterSpacing: 0.5 }}>
          {podnaslov}
        </div>
      )}
      <div style={{
        color: boja,
        fontSize: kompakt ? 22 : 28,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
      }}>
        {vrednost}
      </div>
      <div style={{ color: boja, fontSize: kompakt ? 10 : 11, fontWeight: 700 }}>
        {opis}
      </div>
      {detalj && (
        <div style={{ color: C.sivi, fontSize: 9, lineHeight: 1.3 }}>
          {detalj}
        </div>
      )}
    </Tag>
  );
}

/** Tri semafora: stabilnost (X̄/R), potencijal (Cp), sposobnost (Cpk). */
export default function SpcKapabilitetSemafor({
  C,
  cpk,
  vanX = 0,
  vanR = 0,
  podgrupe = 0,
  pozicija,
  onOpenTab,
  kompakt = false,
}) {
  const imaPoziciju = !!pozicija;
  const stab = stabilnostStatus({ vanX, vanR, podgrupe, imaPoziciju, C });
  const cpVal = cpk?.cp;
  const cpkVal = cpk?.cpk;
  const bojaCp = bojaKapabiliteta(cpVal, C);
  const bojaCpk = bojaKapabiliteta(cpkVal, C);

  const gridCols = kompakt ? "1fr" : "repeat(3, minmax(0, 1fr))";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: kompakt ? 10 : 12,
      }}>
        <SemaforCelija
          C={C}
          naslov="STABILNOST PROCESA"
          podnaslov="X̄ / R karte"
          vrednost={stab.vrednost}
          boja={stab.boja}
          opis={stab.opis}
          detalj={stab.detalj}
          onClick={onOpenTab && imaPoziciju ? () => onOpenTab("xbar") : undefined}
          kompakt={kompakt}
        />
        <SemaforCelija
          C={C}
          naslov="POTENCIJAL PROCESA"
          podnaslov="Cp"
          vrednost={cpVal != null ? cpVal : "—"}
          boja={imaPoziciju && cpVal != null ? bojaCp : C.sivi}
          opis={imaPoziciju && cpVal != null ? opisKapabiliteta(cpVal) : "Izaberi karakteristiku"}
          detalj={imaPoziciju && cpVal != null ? "Cilj ≥ 1,33" : undefined}
          onClick={onOpenTab && imaPoziciju && cpVal != null ? () => onOpenTab("cpk") : undefined}
          kompakt={kompakt}
        />
        <SemaforCelija
          C={C}
          naslov="SPOSOBNOST PROCESA"
          podnaslov="Cpk"
          vrednost={cpkVal != null ? cpkVal : "—"}
          boja={imaPoziciju && cpkVal != null ? bojaCpk : C.sivi}
          opis={imaPoziciju && cpkVal != null ? opisKapabiliteta(cpkVal) : "Izaberi karakteristiku"}
          detalj={imaPoziciju && cpkVal != null ? "Cpk < 1 → hitno" : undefined}
          onClick={onOpenTab && imaPoziciju && cpkVal != null ? () => onOpenTab("cpk") : undefined}
          kompakt={kompakt}
        />
      </div>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
        fontSize: 9,
        color: C.border,
        justifyContent: "center",
      }}>
        <span><span style={{ color: C.zelena }}>●</span> ≥ 1,33 sposoban</span>
        <span><span style={{ color: C.zuta }}>●</span> 1,00–1,33 optimizacija</span>
        <span><span style={{ color: C.crvena }}>●</span> &lt; 1,00 hitno</span>
      </div>
    </div>
  );
}

export { opisKapabiliteta, stabilnostStatus };
