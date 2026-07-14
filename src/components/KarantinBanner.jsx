/** Crveni banner kad je deo/RN u karantinu (HOLD). */

export default function KarantinBanner({ C, karantin, kompakt = false, inline = false }) {
  if (!karantin?.aktivan) return null;
  const z = karantin.zapisi?.[0];
  const a = karantin.alarmi?.[0];
  const idPrikaz = z?.id_deo || a?.id_deo || karantin.idDeo;
  const razlogPrikaz = z?.razlog || karantin.razlog || (a ? `SPC karantin: ${a.pravilo}` : null);
  const tekst = [
    idPrikaz || "deo",
    z?.radni_nalog ? `RN ${z.radni_nalog}` : "",
    razlogPrikaz || "",
  ].filter(Boolean).join(" · ");

  return (
    <div
      title={inline ? `KARANTIN — ${tekst}` : undefined}
      style={{
        background: `${C.crvena}18`,
        border: `1px solid ${C.crvena}`,
        borderRadius: inline ? 6 : (kompakt ? 6 : 8),
        padding: inline ? "6px 10px" : (kompakt ? "8px 12px" : "10px 16px"),
        marginBottom: inline ? 0 : (kompakt ? 8 : 12),
        color: C.tekst,
        fontSize: inline ? 9 : (kompakt ? 10 : 11),
        lineHeight: 1.35,
        width: inline ? "100%" : undefined,
        minWidth: inline ? 0 : undefined,
        boxSizing: "border-box",
      }}
    >
      <span style={{
        display: "block",
        wordBreak: "break-word",
      }}
      >
        <strong style={{ color: C.crvena }}>⛔ KARANTIN</strong>
        {!inline && " (HOLD)"}
        {" — "}
        {tekst}
      </span>
      {!inline && karantin?.alarmi?.length > 0 && !karantin?.zapisi?.length && (
        <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 4 }}>
          SPC alarm u karantinu — proverite odobrenja QA.
        </span>
      )}
    </div>
  );
}
