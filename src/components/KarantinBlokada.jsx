import { tekstKarantinPolja } from "../lib/karantinProvera.js";

/** Blokira liniju dok je deo/RN u HOLD karantinu. */
export default function KarantinBlokada({
  C,
  karantin,
  idDeo = "",
  radniNalog = "",
  nazivDela = "",
  onOsvezi,
  podnaslov = "",
}) {
  if (!karantin?.aktivan) return null;

  const z = karantin.zapisi?.[0];
  const a = karantin.alarmi?.[0];
  const tekst = tekstKarantinPolja(karantin);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="karantin-blok-naslov"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 11900,
        padding: 16,
      }}
    >
      <div style={{
        background: C.panel,
        border: `2px solid ${C.crvena}`,
        borderRadius: 14,
        padding: "24px 28px",
        maxWidth: 480,
        width: "100%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}>
        <div style={{ color: C.crvena, fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div id="karantin-blok-naslov" style={{ color: C.tekst, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          KARANTIN — linija blokirana
        </div>
        {podnaslov && (
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>{podnaslov}</div>
        )}
        <div style={{
          color: C.crvena,
          fontSize: 11,
          marginBottom: 12,
          background: `${C.crvena}14`,
          padding: "10px 12px",
          borderRadius: 8,
          lineHeight: 1.55,
        }}>
          Unos i nastavak proizvodnje nisu dozvoljeni dok kvalitet/admin ne pusti deo ili radni nalog iz HOLD-a.
        </div>
        <div style={{
          color: C.sivi,
          fontSize: 12,
          marginBottom: 16,
          lineHeight: 1.65,
          background: C.bg,
          borderRadius: 8,
          padding: "10px 12px",
          border: `1px solid ${C.border}`,
        }}>
          {idDeo && (
            <>
              ID: <strong style={{ color: C.tekst }}>{String(idDeo).toUpperCase()}</strong>
              {nazivDela ? ` — ${nazivDela}` : ""}
              <br />
            </>
          )}
          {(radniNalog || z?.radni_nalog) && (
            <>
              RN: <strong style={{ color: C.tekst }}>{radniNalog || z?.radni_nalog}</strong>
              <br />
            </>
          )}
          <span style={{ color: C.tekst }}>{tekst}</span>
          {z?.created_at && (
            <>
              <br />
              <span style={{ fontSize: 10 }}>
                Od: {new Date(z.created_at).toLocaleString("sr-RS")}
              </span>
            </>
          )}
          {a && !z && (
            <>
              <br />
              <span style={{ fontSize: 10 }}>SPC alarm #{a.id} · {a.pravilo}</span>
            </>
          )}
        </div>
        {typeof onOsvezi === "function" && (
          <button
            type="button"
            onClick={onOsvezi}
            style={{
              background: C.hover,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.tekst,
              fontSize: 12,
              fontWeight: 700,
              padding: "10px 18px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            ↻ Proveri ponovo
          </button>
        )}
      </div>
    </div>
  );
}
