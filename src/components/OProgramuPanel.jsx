import { getBrending } from "../lib/brending.js";
import { formatujDatumLicence } from "../lib/licenca.js";
import LogoFirme from "./LogoFirme.jsx";

/** Admin — O programu, autor, podrška, licenca. */
export default function OProgramuPanel({ licenca, C }) {
  const b = getBrending();

  const red = (label, vrednost) => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "7px 0",
      borderBottom: `1px solid ${C.hover}`,
      fontSize: 11,
      flexWrap: "wrap",
    }}>
      <span style={{ color: C.sivi }}>{label}</span>
      <span style={{ color: C.tekst, fontWeight: 600, textAlign: "right" }}>{vrednost || "—"}</span>
    </div>
  );

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{
        color: C.tekst,
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 14,
        letterSpacing: 1,
      }}>
        O PROGRAMU
      </div>

      <div style={{ marginBottom: 16 }}>
        <LogoFirme velicina="srednji" C={C} centar={false} />
      </div>

      {red("Aplikacija", b.nazivAplikacije)}
      {red("Verzija", `v${b.verzija}`)}
      {red("Firma (klijent)", b.nazivFirme)}
      {red("Razvoj", b.razvojNaziv)}
      {red("Autor", b.razvojAutor)}
      {red("Email", b.razvojEmail)}
      {red("Telefon", b.razvojTel)}

      {licenca && (
        <>
          <div style={{ marginTop: 14, fontSize: 9, color: C.sivi, letterSpacing: 0.8 }}>LICENCA</div>
          {red("Status", licenca.ok === false ? "Blokirana" : (licenca.offlineGrace ? "Offline grace" : "Aktivna"))}
          {licenca.vazi_do && red("Važi do", formatujDatumLicence(licenca.vazi_do))}
          {licenca.tenant_id && red("Tenant", licenca.tenant_id)}
          {licenca.deployment && red("Okruženje", licenca.deployment)}
        </>
      )}

      <div style={{ color: C.sivi, fontSize: 10, marginTop: 14, lineHeight: 1.6 }}>
        Za produženje licence ili tehničku podršku kontaktirajte dobavljača softvera
        {b.razvojKontakt ? ` (${b.razvojKontakt})` : "."}
      </div>
    </div>
  );
}
