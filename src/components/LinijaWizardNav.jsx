/** Koraci Modula 1 (linija) — vizuelni indikator toka. */
export default function LinijaWizardNav({
  korak,
  koraci,
  C,
  akcent,
  kompakt = false,
}) {
  const boja = akcent || C.plava;
  const idx = koraci.findIndex(k => k.id === korak);
  const trenutni = idx >= 0 ? idx : 0;

  return (
    <div style={{
      flexShrink: 0,
      padding: kompakt ? "8px 10px 6px" : "10px 14px 8px",
      background: C.panel,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        display: "flex",
        gap: kompakt ? 4 : 6,
        marginBottom: kompakt ? 4 : 6,
      }}>
        {koraci.map((k, i) => (
          <div
            key={k.id}
            style={{
              flex: 1,
              height: kompakt ? 3 : 4,
              borderRadius: 2,
              background: i <= trenutni ? boja : C.hover,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{
          color: boja,
          fontSize: kompakt ? 9 : 10,
          fontWeight: 700,
          letterSpacing: 0.8,
        }}>
          {koraci[trenutni]?.label || korak}
        </span>
        <span style={{ color: C.sivi, fontSize: kompakt ? 8 : 9 }}>
          {trenutni + 1} / {koraci.length}
        </span>
      </div>
    </div>
  );
}

export const KORACI_ATRIB_LINIJA = [
  { id: "id", label: "ID DELA" },
  { id: "poka", label: "POKA-YOKE" },
  { id: "unos", label: "UNOS MERENJA" },
  { id: "lista", label: "LISTA / SNIMI" },
];

export const KORACI_ATRIB_KONTROLOR = [
  { id: "id", label: "ID DELA" },
  { id: "poka", label: "POKA-YOKE" },
  { id: "unos", label: "UNOS MERENJA" },
  { id: "snimi", label: "SNIMI" },
];

export const KORACI_MERLJIVE_LINIJA = [
  { id: "id", label: "ID / SERIJA" },
  { id: "poka", label: "POKA-YOKE" },
  { id: "fai", label: "FAI" },
  { id: "unos", label: "UNOS MERENJA" },
];

export const KORACI_MERLJIVE_KONTROLOR = [
  { id: "id", label: "ID / SERIJA" },
  { id: "poka", label: "POKA-YOKE" },
  { id: "fai", label: "FAI" },
  { id: "unos", label: "UNOS MERENJA" },
];
