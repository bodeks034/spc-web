import { useState } from "react";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "../lib/karakteristikaMerljive.js";

const META_KOLONE = [
  ["pogon_kod", "A–H", "Ulazna = A"],
  ["radni_nalog", "RN-2026-NT001-A", "po pogonu"],
  ["faza_naziv", "Ulazna kontrola", ""],
  ["linija_faza", "Preseraj / Karoserija…", ""],
  ["linija_id / masina_id", "43 / 1", "za atributivne"],
  ["naziv_dela / slika", "Nosač motora", ""],
  ["ukupno_kom", "50", "količina na RN"],
  ["kom_za_kontrolu_n", "3", "broj merenja u seriji"],
  ["nivo_kontrole", "DA", "opciono"],
];

export default function DefinicijaUputstvo({ C, variant = "full", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const akcent = variant === "inzenjer" ? C.plava : C.zelena;

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${akcent}35`,
        borderRadius: 8,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: akcent,
          fontSize: 11,
          fontWeight: 700,
          padding: "10px 12px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>📋 karakteristike_merljive — jedan izvor (uputstvo)</span>
        <span style={{ color: C.sivi, fontWeight: 400 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 12px 12px", color: C.sivi, fontSize: 10, lineHeight: 1.65 }}>
          {variant === "inzenjer" ? (
            <p style={{ margin: "0 0 8px" }}>
              Inženjer uvozi <strong style={{ color: C.tekst }}>samo granice</strong> (tab{" "}
              <code>karakteristike_merljive</code>) — bez auto-sync SOP/delova/RN.
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px" }}>
                Jedan tab <strong style={{ color: C.tekst }}>karakteristike_merljive</strong> — bez taba Definicija_Karakteristika.
                Na <strong style={{ color: C.tekst }}>prvom redu svake grupe po pogonu</strong> popuni meta kolone; ostali redovi istog pogona mogu ih naslediti prazni.
              </p>
              <p style={{ margin: "0 0 8px", color: C.zuta }}>
                <strong>merni_instrument = Vizuelno</strong> → red ide u <strong>atributivne</strong>; ostalo sa LSL/USL → <strong>merljive</strong>.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "2px 8px", marginBottom: 10 }}>
                {META_KOLONE.map(([name, primer, nap]) => (
                  <span key={name} style={{ display: "contents" }}>
                    <code style={{ color: C.tekst }}>{name}</code>
                    <span>{primer}</span>
                    <span>{nap}</span>
                  </span>
                ))}
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 9 }}>
                Kolone: {KARAKTERISTIKE_MERLJIVE_HEADER.join(" · ")}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                Pri uvozu merljivog Excela aplikacija automatski puni{" "}
                <code>sop_deo_varijabilni</code>, <code>delovi</code> i <code>radni_nalozi</code>.
              </p>
            </>
          )}

          <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 6 }}>NT-001 — redosled uvoza</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>Admin → uvezi <code>SPC_merljive.xlsx</code> (tab karakteristike_merljive)</li>
            <li>Proveri auto-sync: SOP + delovi + radni_nalozi</li>
            <li>Merljive → ukucaj NT-001, pogon A</li>
          </ol>
        </div>
      )}
    </div>
  );
}
