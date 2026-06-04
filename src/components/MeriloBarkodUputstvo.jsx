import { useState } from "react";

const STILOVI = (C) => ({
  wrap: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    cursor: "pointer",
    userSelect: "none",
  },
  body: { padding: "0 18px 18px", fontSize: 12, color: C.tekst, lineHeight: 1.55 },
  h3: { color: C.plava, fontSize: 11, letterSpacing: 1.1, margin: "16px 0 8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 10 },
  th: { textAlign: "left", color: C.sivi, padding: "6px 8px", borderBottom: `1px solid ${C.border}` },
  td: { padding: "6px 8px", borderBottom: `1px solid ${C.border}40`, verticalAlign: "top" },
  code: { fontFamily: "monospace", color: C.zuta, fontSize: 11 },
  note: { color: C.sivi, fontSize: 11, marginTop: 8 },
  link: { color: C.plava, fontSize: 10 },
});

export default function MeriloBarkodUputstvo({ C, defaultOpen = false, kompakt }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = STILOVI(C);

  return (
    <div style={s.wrap}>
      <div
        role="button"
        tabIndex={0}
        style={s.head}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => e.key === "Enter" && setOpen(v => !v)}
      >
        <span style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          UPUTSTVO · BARKOD ČITAČ I DIGITALNA MERILA
        </span>
        <span style={{ color: C.plava, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={s.body}>
          {!kompakt && (
            <p style={s.note}>
              Detaljno uputstvo u repou: <span style={s.link}>docs/UPUTSTVO_BARKOD_I_MERILA.md</span>
            </p>
          )}

          <div style={{
            ...s.note,
            background: `${C.plava}12`,
            border: `1px solid ${C.plava}40`,
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}>
            <strong style={{ color: C.plava }}>Kako radi sa aplikacijom i Supabase-om</strong>
            <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
              <li><strong>Povezivanje:</strong> USB na PC → Chrome/Edge → SPC Web (ne direktno na cloud).</li>
              <li><strong>Na ekranu:</strong> barkod = ID dela; merilo = vrednosti u kolonama + OK/NOK odmah.</li>
              <li><strong>U bazu:</strong> merljive posle <strong>Sačuvaj seriju</strong> → <span style={s.code}>merenja_varijabilna</span>;
                atributivne posle <strong>Zapiši</strong> → <span style={s.code}>kontrolni_log</span>.</li>
              <li><strong>SPC karte:</strong> merljive karte čitaju sačuvana merenja iz baze (isto kao ručni unos).</li>
            </ul>
          </div>

          <div style={s.h3}>BARKOD ČITAČ — POVEZIVANJE</div>
          <ol style={{ margin: "0 0 10px 18px", padding: 0 }}>
            <li>USB u računar — Windows vidi čitač kao <strong>tastaturu</strong> (bez drajvera).</li>
            <li>Na čitaču uključite <strong>suffix Enter</strong> (CR/LF na kraju skena).</li>
            <li>Chrome ili Edge — otvorite modul <strong>Atributivne</strong> ili <strong>Merljive → Unos</strong>.</li>
            <li>Skenirajte etiketu na polje <strong>ID dela</strong> ili u prazan deo ekrana.</li>
          </ol>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Format etikete</th>
                <th style={s.th}>Primer</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={s.td}>Samo ID</td><td style={s.td}><span style={s.code}>5502-A</span></td></tr>
              <tr><td style={s.td}>ID + nalog</td><td style={s.td}><span style={s.code}>5502-A|RN-2024-015</span></td></tr>
              <tr><td style={s.td}>+ datum + smena</td><td style={s.td}><span style={s.code}>5502-A|RN-15|2026-06-04|2</span></td></tr>
              <tr><td style={s.td}>JSON</td><td style={s.td}><span style={s.code}>{'{"id_deo":"5502-A","smena":2}'}</span></td></tr>
            </tbody>
          </table>

          <div style={s.h3}>DIGITALNA MERILA — POVEZIVANJE (merljive)</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Način</th>
                <th style={s.th}>Hardver</th>
                <th style={s.th}>U aplikaciji</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}><strong>Serial</strong></td>
                <td style={s.td}>RS-232 ili USB-serial adapter → COM port; merilo 9600 8N1</td>
                <td style={s.td}>Panel ispod ID dela → <strong>Poveži serial</strong> (Chrome/Edge, HTTPS)</td>
              </tr>
              <tr>
                <td style={s.td}><strong>Izvoz</strong></td>
                <td style={s.td}>Izvoz sa merila / MeasurLink u .txt ili .csv</td>
                <td style={s.td}>Nalepi ili <strong>Fajl</strong> → <strong>Uvezi u kolone</strong></td>
              </tr>
              <tr>
                <td style={s.td}><strong>Wedge</strong></td>
                <td style={s.td}>Merilo šalje broj kao tastatura</td>
                <td style={s.td}>Klik u polje dimenzije → pošalji merenje sa merila + Enter</td>
              </tr>
            </tbody>
          </table>
          <p style={s.note}>
            Linije: <span style={s.code}>12.345</span> ili <span style={s.code}>D1;12.5</span> (ime kolone = dimenzija u šablonu).
            Izbor <strong>Aktivna dimenzija</strong>: Auto = sledeća prazna kolona.
          </p>
        </div>
      )}
    </div>
  );
}
