import { LAB_FPY_PCT } from "../../lib/rtyFpy.js";

function HeroBroj({ label, vrednost, boja, C, sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        background: C.panel,
        border: `2px solid ${boja}40`,
        borderRadius: 12,
        padding: "16px 12px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        boxShadow: `inset 0 0 20px ${boja}10`,
        minWidth: 0,
      }}
    >
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        color: boja,
        fontSize: 32,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
      }}>
        {vrednost}
      </div>
      {sub && (
        <div style={{ color: C.border, fontSize: 9, marginTop: 6 }}>
          {sub}
        </div>
      )}
    </Tag>
  );
}

function StatusSemafor({ vanKontrole, imaPKartu, C, onClick }) {
  let boja = C.sivi;
  let vrednost = "—";
  let opis = "Izaberi deo";
  if (imaPKartu) {
    if (vanKontrole === 0) {
      boja = C.zelena;
      vrednost = "OK";
      opis = "U kontroli";
    } else {
      boja = C.crvena;
      vrednost = `${vanKontrole} ⚠`;
      opis = "Van kontrole";
    }
  }

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        background: C.panel,
        border: `2px solid ${boja}55`,
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        boxShadow: `inset 0 0 24px ${boja}15`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: boja,
        boxShadow: `0 0 14px ${boja}88`,
      }}
      />
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>
        STATUS PROCESA
      </div>
      <div style={{ color: boja, fontSize: 28, fontWeight: 700 }}>{vrednost}</div>
      <div style={{ color: boja, fontSize: 10, fontWeight: 700 }}>{opis}</div>
      <div style={{ color: C.sivi, fontSize: 8 }}>p-karta · UCL/LCL</div>
    </Tag>
  );
}

/** Veliki KPI hero — atributivni dashboard. */
export default function SpcAtrDashboardHero({
  C,
  pBar,
  dpmo,
  ppm,
  fpy,
  vanKontrole,
  imaPKartu,
  idDeo,
  onNavigacija,
  kompakt,
  opsegPodataka,
}) {
  const pPct = (pBar * 100).toFixed(2);
  const pBoja = pBar > 0.05 ? C.crvena : pBar > 0.02 ? C.zuta : C.plava;
  const dpmoBoja = dpmo != null && dpmo > 6210 ? C.crvena : dpmo != null && dpmo > 233 ? C.zuta : C.ljubicasta;
  const fpyNum = Number(fpy);
  const fpyBoja = fpyNum >= 95 ? C.zelena : fpyNum >= 80 ? C.zuta : C.crvena;

  const nav = onNavigacija ? (spcTip) => () => onNavigacija({ tab: "karte", spcTip }) : undefined;

  const cols = kompakt
    ? "1fr 1fr"
    : "repeat(5, minmax(0, 1fr))";

  return (
    <div style={{ marginBottom: 18 }}>
      {opsegPodataka && (
        <div style={{
          color: C.sivi,
          fontSize: 9,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
          {opsegPodataka}
        </div>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 10,
      }}>
        <HeroBroj
          label="UDEO ŠKARTA (p̄)"
          vrednost={`${pPct}%`}
          boja={pBoja}
          C={C}
          sub="Neispravno / ukupno"
          onClick={nav?.("p")}
        />
        <HeroBroj
          label="DPMO"
          vrednost={dpmo != null ? dpmo.toLocaleString() : "—"}
          boja={dpmoBoja}
          C={C}
          sub="Greške / milion"
          onClick={nav?.("rty")}
        />
        <HeroBroj
          label="PPM"
          vrednost={ppm != null ? ppm.toLocaleString() : "—"}
          boja={C.narandzasta}
          C={C}
          sub="Kom/milion"
          onClick={nav?.("rty")}
        />
        <HeroBroj
          label={LAB_FPY_PCT}
          vrednost={fpy != null ? `${fpy}%` : "—"}
          boja={fpyBoja}
          C={C}
          sub="Prva proizvodnja (bez dorade)"
          onClick={nav?.("rty")}
        />
        <StatusSemafor
          vanKontrole={vanKontrole}
          imaPKartu={imaPKartu && !!idDeo}
          C={C}
          onClick={idDeo ? nav?.("p") : undefined}
        />
      </div>
    </div>
  );
}
