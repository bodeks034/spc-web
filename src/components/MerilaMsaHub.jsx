import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import KalibracijaMerilaPanel from "./KalibracijaMerilaPanel.jsx";
import GageRRPanel from "./GageRRPanel.jsx";
import MsaKalendarPanel from "./MsaKalendarPanel.jsx";

/** Hub: merila · kalibracija · Gage R&R · MSA kalendar. */
export default function MerilaMsaHub({ C, addToast, korisnik }) {
  const [pod, setPod] = useState({ merila: 0, isteklo: 0, uskoro: 0, studije: 0, msa: 0 });
  const [podtab, setPodtab] = useState("pregled");

  useEffect(() => {
    (async () => {
      const [mer, gage, msa] = await Promise.all([
        supabase.from("merila").select("id, kalibracije(sledeca_kal)").eq("aktivno", true),
        supabase.from("gage_rr_studije").select("id", { count: "exact", head: true }),
        supabase.from("msa_kalendar").select("sledeca_studija"),
      ]);
      const lista = mer.data || [];
      let isteklo = 0; let uskoro = 0;
      lista.forEach((m) => {
        const kal = m.kalibracije?.sort?.((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))?.[0]
          || m.kalibracije?.[0];
        if (!kal?.sledeca_kal) return;
        const d = Math.ceil((new Date(kal.sledeca_kal) - new Date()) / 86400000);
        if (d < 0) isteklo += 1;
        else if (d < 30) uskoro += 1;
      });
      const msaUskoro = (msa.data || []).filter((r) => {
        if (!r.sledeca_studija) return false;
        const d = Math.ceil((new Date(r.sledeca_studija) - new Date()) / 86400000);
        return d <= 30;
      }).length;
      setPod({
        merila: lista.length,
        isteklo,
        uskoro,
        studije: gage.count || 0,
        msa: msaUskoro,
      });
    })();
  }, [podtab]);

  const TAB = [
    ["pregled", "PREGLED"],
    ["kalibracija", "KALIBRACIJA"],
    ["gage", "GAGE R&R"],
    ["msa", "MSA KALENDAR"],
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {TAB.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setPodtab(id)}
            style={{
              background: podtab === id ? `${C.plava}22` : C.hover,
              border: `1px solid ${podtab === id ? C.plava : C.border}`,
              borderRadius: 6, color: podtab === id ? C.plava : C.sivi,
              fontSize: 9, fontWeight: 700, padding: "6px 10px", cursor: "pointer",
            }}>
            {label}
          </button>
        ))}
      </div>

      {podtab === "pregled" && (
        <div style={{ padding: 18, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            ["MERILA", pod.merila, C.plava],
            ["KAL. ISTEKLO", pod.isteklo, C.crvena],
            ["KAL. USKORO", pod.uskoro, C.zuta],
            ["Gage R&R", pod.studije, C.ljubicasta || C.plava],
            ["MSA ≤30d", pod.msa, C.narandzasta || C.zuta],
          ].map(([l, v, b]) => (
            <div key={l} style={{ background: C.panel, border: `1px solid ${b}40`, borderRadius: 10, padding: "16px 20px", minWidth: 100, textAlign: "center" }}>
              <div style={{ color: b, fontSize: 22, fontWeight: 700 }}>{v}</div>
              <div style={{ color: C.sivi, fontSize: 9, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {podtab === "kalibracija" && <KalibracijaMerilaPanel korisnik={korisnik} C={C} addToast={addToast} />}
      {podtab === "gage" && <GageRRPanel C={C} addToast={addToast} korisnik={korisnik} />}
      {podtab === "msa" && <MsaKalendarPanel C={C} addToast={addToast} />}
    </div>
  );
}
