import { RPN_SUMMARY_POLJA, formatPoboljsanjePct, agregirajRpnSummary } from "../../lib/pfmeaCpPolja.js";

function prikazVrednosti(key, r) {
  const v = r[key];
  if (v == null || v === "") return "—";
  if (key === "poboljsanje") return formatPoboljsanjePct(v);
  return String(v);
}

function RpnRedKartica({ red, C, naslovBlok, istaknuto = false }) {
  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const val = { color: C.tekst, fontSize: 12, whiteSpace: "pre-wrap" };
  const metrike = RPN_SUMMARY_POLJA.filter((p) => p.short);

  return (
    <div style={{
      background: istaknuto ? `${C.plava}12` : C.panel,
      border: `1px solid ${istaknuto ? C.plava : C.border}`,
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 10,
    }}>
      {naslovBlok && (
        <div style={{
          color: C.plava, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10,
        }}>
          {naslovBlok}
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        <span style={lbl}>{RPN_SUMMARY_POLJA[0].label}</span>
        <div style={{ ...val, fontWeight: istaknuto ? 700 : 600 }}>{prikazVrednosti("dio", red)}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={lbl}>{RPN_SUMMARY_POLJA[1].label}</span>
        <div style={val}>{prikazVrednosti("mod_greske", red)}</div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
        gap: 10,
      }}>
        {metrike.map((p) => (
          <div key={p.key}>
            <span style={lbl}>{p.label}</span>
            <div style={{
              ...val,
              fontWeight: p.key.startsWith("rpn") ? 700 : 400,
              color: p.key === "rpn_after" ? C.zelena : C.tekst,
            }}>
              {prikazVrednosti(p.key, red)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RpnSummaryPregled({ redovi, C, filterTekst, praznoPoruka }) {
  const q = String(filterTekst || "").trim().toLowerCase();
  const prikaz = q
    ? (redovi || []).filter((r) => !r._agregat && Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
    : (redovi || []).filter((r) => !r._agregat);

  const { prosek, ukupno } = agregirajRpnSummary(prikaz);

  return (
    <div>
      <div style={{
        color: C.plava, fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
        marginBottom: 6, paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
      }}>
        RPN SUMMARY — Pregled poboljšanja rizika
      </div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 14 }}>
        Automatski iz PFMEA stavki · RPN before = S×O×D · RPN after = S×O×D (nova ocena)
      </div>

      {!prikaz.length ? (
        <div style={{ color: C.sivi, fontStyle: "italic", padding: 16 }}>
          {praznoPoruka || "Nema podataka — unesite PFMEA stavke (S, O, D, RPN pre/posle)."}
        </div>
      ) : (
        <>
          {prikaz.map((r, i) => (
            <RpnRedKartica key={`${r.dio}-${r.mod_greske}-${i}`} red={r} C={C} />
          ))}

          {prosek && (
            <RpnRedKartica
              red={prosek}
              C={C}
              naslovBlok="PROSEK"
              istaknuto
            />
          )}
          {ukupno && (
            <RpnRedKartica
              red={ukupno}
              C={C}
              naslovBlok="UKUPNO"
              istaknuto
            />
          )}
        </>
      )}
    </div>
  );
}
