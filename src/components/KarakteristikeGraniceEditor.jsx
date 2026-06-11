import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajRevizije, azurirajKarakteristikuSaRevizijom } from "../lib/karakteristikeRevizija.js";
import { uniqueDeloviIzSop } from "../lib/pogonSop.js";

export default function KarakteristikeGraniceEditor({ C, korisnik, addToast }) {
  const [delovi, setDelovi] = useState([]);
  const [idDeo, setIdDeo] = useState("");
  const [rows, setRows] = useState([]);
  const [revizije, setRevizije] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    supabase.from("sop_deo_varijabilni").select("id_deo,pogon_kod,naziv_dela").order("id_deo")
      .then(({ data }) => setDelovi(uniqueDeloviIzSop(data || [])));
  }, []);

  const ucitaj = useCallback(async () => {
    if (!idDeo) return;
    setLoading(true);
    const [kRes, rRes] = await Promise.all([
      supabase.from("karakteristike_merljive").select("*").eq("id_deo", idDeo).order("pozicija"),
      ucitajRevizije(supabase, { idDeo, limit: 30 }),
    ]);
    setRows(kRes.data || []);
    setRevizije(rRes.data || []);
    if (kRes.error) addToast?.(kRes.error.message, "greska");
    setLoading(false);
  }, [idDeo, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const startEdit = (r) => {
    setEditId(r.id);
    setForm({
      lsl: r.lsl ?? "",
      usl: r.usl ?? "",
      nominala: r.nominala ?? "",
      lsl_text: r.lsl_text ?? "",
      usl_text: r.usl_text ?? "",
      jedinica: r.jedinica ?? "",
      naziv_mere: r.naziv_mere ?? "",
    });
  };

  const snimi = async (stari) => {
    const { ok, error } = await azurirajKarakteristikuSaRevizijom(supabase, stari, form, korisnik);
    if (!ok) {
      addToast?.(error?.message || "Greška", "greska");
      return;
    }
    addToast?.("✓ Granice ažurirane · revizija evidentirana", "uspeh");
    setEditId(null);
    ucitaj();
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 4, color: C.tekst, fontSize: 10, padding: "4px 6px", boxSizing: "border-box",
  };

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18,
    }}>
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
        REVIZIJA GRANICA (LSL / USL / NOMINALA)
      </div>
      <p style={{ color: C.sivi, fontSize: 10, marginBottom: 12, lineHeight: 1.5 }}>
        Svaka izmena se upisuje u <code style={{ color: C.zuta }}>karakteristike_revizija</code>.
        Pokreni SQL <strong>18_karakteristike_revizija.sql</strong>.
      </p>

      <select value={idDeo} onChange={e => setIdDeo(e.target.value.toUpperCase())}
        style={{ ...INP, marginBottom: 12, padding: "8px 10px", fontSize: 11 }}>
        <option value="">— Izaberi ID delo —</option>
        {delovi.map(d => (
          <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
        ))}
      </select>

      {loading && <div style={{ color: C.sivi, fontSize: 11 }}>Učitavam…</div>}

      {idDeo && !loading && (
        <>
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ color: C.sivi, textAlign: "left" }}>
                  {["Poz.", "LSL", "USL", "Nom.", "Jed.", ""].map(h => (
                    <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}30` }}>
                    <td style={{ padding: 6 }}>{r.pozicija}</td>
                    <td style={{ padding: 6 }}>
                      {editId === r.id
                        ? <input style={INP} value={form.lsl} onChange={e => setForm(f => ({ ...f, lsl: e.target.value }))} />
                        : (r.lsl_text ?? r.lsl)}
                    </td>
                    <td style={{ padding: 6 }}>
                      {editId === r.id
                        ? <input style={INP} value={form.usl} onChange={e => setForm(f => ({ ...f, usl: e.target.value }))} />
                        : (r.usl_text ?? r.usl)}
                    </td>
                    <td style={{ padding: 6 }}>
                      {editId === r.id
                        ? <input style={INP} value={form.nominala} onChange={e => setForm(f => ({ ...f, nominala: e.target.value }))} />
                        : r.nominala}
                    </td>
                    <td style={{ padding: 6 }}>{r.jedinica}</td>
                    <td style={{ padding: 6 }}>
                      {editId === r.id ? (
                        <>
                          <button type="button" onClick={() => snimi(r)}
                            style={{ fontSize: 9, color: C.zelena, cursor: "pointer", marginRight: 6, background: "none", border: "none" }}>
                            Sačuvaj
                          </button>
                          <button type="button" onClick={() => setEditId(null)}
                            style={{ fontSize: 9, color: C.sivi, cursor: "pointer", background: "none", border: "none" }}>
                            Otkaži
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => startEdit(r)}
                          style={{ fontSize: 9, color: C.plava, cursor: "pointer", background: "none", border: "none" }}>
                          Izmeni
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>POSLEDNJE REVIZIJE</div>
          <div style={{ maxHeight: 160, overflow: "auto", fontSize: 9 }}>
            {revizije.length === 0 && <div style={{ color: C.border }}>Nema revizija</div>}
            {revizije.map(rv => (
              <div key={rv.id} style={{ padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
                {new Date(rv.created_at).toLocaleString("sr-RS")} · {rv.pozicija} · {rv.polje}: {rv.stara_vrednost} → {rv.nova_vrednost}
                {rv.radnik_ime && <span style={{ color: C.border }}> ({rv.radnik_ime})</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
