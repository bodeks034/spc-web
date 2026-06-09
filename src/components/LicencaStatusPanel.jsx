import { formatujDatumLicence, normalizujModuli } from "../lib/licenca.js";

/** Pregled licence (read-only) — admin. */
export default function LicencaStatusPanel({ licenca, C, kompakt = false }) {
  const moduli = normalizujModuli(licenca?.moduli);
  const ok = licenca?.ok !== false;
  const boja = ok ? (licenca?.offlineGrace ? C.zuta : C.zelena) : C.crvena;

  const red = (label, vrednost, accent) => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: kompakt ? "6px 0" : "8px 0",
      borderBottom: `1px solid ${C.hover}`,
      fontSize: kompakt ? 10 : 11,
    }}>
      <span style={{ color: C.sivi }}>{label}</span>
      <span style={{ color: accent || C.tekst, fontWeight: 600, textAlign: "right" }}>{vrednost}</span>
    </div>
  );

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${boja}44`,
      borderRadius: 10,
      padding: kompakt ? "12px 14px" : "16px 18px",
    }}>
      <div style={{
        color: boja,
        fontSize: kompakt ? 11 : 12,
        fontWeight: 700,
        letterSpacing: 1,
        marginBottom: kompakt ? 8 : 12,
      }}>
        📜 LICENCA {licenca?.offlineGrace ? "· OFFLINE GRACE" : ""}
      </div>

      {red("Status", ok ? (licenca?.offlineGrace ? "Keš (mreža nedostupna)" : "Aktivna") : "Blokirana", boja)}
      {licenca?.vazi_do && red("Važi do", formatujDatumLicence(licenca.vazi_do))}
      {licenca?.tenant_id && red("Tenant", licenca.tenant_id)}
      {licenca?.deployment && red("Okruženje", licenca.deployment)}
      {licenca?.max_korisnika != null && red("Max korisnika", String(licenca.max_korisnika))}
      {licenca?.napomena && red("Napomena", licenca.napomena, C.sivi)}
      {licenca?.kod && !ok && red("Kod", licenca.kod, C.crvena)}

      <div style={{ marginTop: 10, fontSize: 9, color: C.sivi, letterSpacing: 0.8 }}>MODULI</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {[
          ["atributivne", "Atributivne"],
          ["varijabilne", "Merljive"],
          ["admin", "Admin"],
        ].map(([id, label]) => {
          const uklj = moduli[id] !== false;
          return (
            <span key={id} style={{
              fontSize: 9,
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${uklj ? C.zelena : C.border}`,
              color: uklj ? C.zelena : C.sivi,
              background: uklj ? `${C.zelena}12` : C.hover,
            }}>
              {uklj ? "✓" : "✗"} {label}
            </span>
          );
        })}
      </div>

      {licenca?.slojevi && (
        <div style={{ marginTop: 10, fontSize: 9, color: C.border }}>
          Slojevi: server {licenca.slojevi.server ? "✓" : "—"}
          {licenca.slojevi.fajl ? ` · fajl ${licenca.slojevi.fajl}` : ""}
        </div>
      )}
    </div>
  );
}
