/** Panel plana uzorkovanja — po turi, cilj, urađeno, tura (Faza 1, bez timera). */

export default function PlanUzorkovanjaPanel({ C, plan, ucestalost }) {
  if (!plan) return null;

  const { poTuri, ciljKom, uradjenoKom, turaBroj, brojTura, zavrseno } = plan;
  const imaCilj = ciljKom > 0;
  const bojaNapredak = zavrseno ? C.zelena : uradjenoKom > 0 ? C.zuta : C.sivi;

  return (
    <div style={{
      marginTop: 6,
      paddingTop: 6,
      borderTop: `1px solid ${C.zelena}26`,
    }}>
      <div style={{
        color: C.zelena,
        fontSize: 8,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 4,
      }}>
        Plan uzorkovanja
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px", fontSize: 9 }}>
        <span style={{ color: C.sivi }}>Po turi</span>
        <span style={{ color: C.tekst, fontWeight: 700, textAlign: "right" }}>{poTuri} kom</span>
        <span style={{ color: C.sivi }}>Cilj</span>
        <span style={{ color: C.tekst, fontWeight: 700, textAlign: "right" }}>
          {imaCilj ? `${ciljKom} kom` : "—"}
        </span>
        <span style={{ color: C.sivi }}>Urađeno</span>
        <span style={{ color: bojaNapredak, fontWeight: 700, textAlign: "right" }}>
          {imaCilj ? `${uradjenoKom}/${ciljKom}` : `${uradjenoKom} kom`}
        </span>
        {imaCilj && brojTura > 0 && (
          <>
            <span style={{ color: C.sivi }}>Tura</span>
            <span style={{ color: bojaNapredak, fontWeight: 700, textAlign: "right" }}>
              {Math.min(turaBroj, brojTura)}/{brojTura}
            </span>
          </>
        )}
      </div>
      {ucestalost && (
        <div style={{ color: C.sivi, fontSize: 8, marginTop: 5, lineHeight: 1.3 }}>
          Učestalost: {ucestalost}
        </div>
      )}
    </div>
  );
}
