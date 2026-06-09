import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  TIPOVI_ATRIBUTIVNE,
  TIPOVI_MERLJIVE,
  danasIso,
  ucitajBaselineListu,
  snimiBaseline,
  preuzmiGraniceIzGrafa,
} from "../lib/spcBaseline.js";

export default function SpcBaselinePanel({ C, korisnik, addToast, modul = "atributivne" }) {
  const tipovi = modul === "merljive" ? TIPOVI_MERLJIVE : TIPOVI_ATRIBUTIVNE;
  const [delovi, setDelovi] = useState([]);
  const [pozicije, setPozicije] = useState([]);
  const [idDeo, setIdDeo] = useState("");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snima, setSnima] = useState(false);
  const [ucitavaGraf, setUcitavaGraf] = useState(false);
  const [nPodgrupa, setNPodgrupa] = useState(5);
  const [form, setForm] = useState({
    tip_karte: tipovi[0]?.id || "p",
    pozicija: "",
    cl: "",
    ucl: "",
    lcl: "",
    vazi_od: danasIso(),
    napomena: "",
  });

  useEffect(() => {
    const tabela = modul === "merljive" ? "sop_deo_varijabilni" : "delovi";
    const kolone = modul === "merljive" ? "id_deo,naziv_dela" : "id_deo,naziv_dela";
    supabase.from(tabela).select(kolone).order("id_deo")
      .then(({ data }) => setDelovi(data || []));
  }, [modul]);

  useEffect(() => {
    if (modul !== "merljive" || !idDeo) {
      setPozicije([]);
      return;
    }
    supabase.from("karakteristike_merljive")
      .select("pozicija")
      .eq("id_deo", idDeo)
      .order("pozicija")
      .then(({ data }) => {
        const uniq = [...new Set((data || []).map((r) => r.pozicija).filter(Boolean))];
        setPozicije(uniq);
      });
  }, [modul, idDeo]);

  useEffect(() => {
    if (modul !== "merljive" || !idDeo) return;
    supabase.from("sop_deo_varijabilni")
      .select("broj_merenja")
      .eq("id_deo", idDeo)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.broj_merenja) setNPodgrupa(Number(data.broj_merenja) || 5);
      });
  }, [modul, idDeo]);

  const ucitaj = useCallback(async () => {
    if (!idDeo) {
      setLista([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await ucitajBaselineListu(supabase, { idDeo, modul });
      setLista(rows);
    } catch (e) {
      addToast?.(e.message, "greska");
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, [idDeo, modul, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const dodaj = async () => {
    if (snima) return;
    setSnima(true);
    const { ok, error } = await snimiBaseline(supabase, {
      id_deo: idDeo,
      tip_karte: form.tip_karte,
      pozicija: modul === "merljive" && form.pozicija ? form.pozicija : null,
      cl: form.cl,
      ucl: form.ucl,
      lcl: form.lcl,
      vazi_od: form.vazi_od,
      napomena: form.napomena,
    }, korisnik);
    setSnima(false);
    if (!ok) {
      addToast?.(error?.message || "Greška pri snimanju", "greska");
      return;
    }
    addToast?.("✓ Baseline sačuvan", "uspeh");
    setForm((f) => ({ ...f, napomena: "" }));
    ucitaj();
  };

  const preuzmiIzGrafa = async () => {
    if (ucitavaGraf) return;
    if (modul === "merljive" && !form.pozicija) {
      addToast?.("Izaberi poziciju pre preuzimanja", "greska");
      return;
    }
    setUcitavaGraf(true);
    try {
      const g = await preuzmiGraniceIzGrafa(supabase, {
        modul,
        idDeo,
        tipKarte: form.tip_karte,
        pozicija: form.pozicija,
        nPodgrupa,
      });
      if (!g) {
        addToast?.("Nema dovoljno podataka u bazi za izračun granica", "greska");
        return;
      }
      const napomenaAuto = `Preuzeto iz grafa${g.meta ? ` · ${g.meta}` : ""}`;
      setForm((f) => ({
        ...f,
        cl: String(g.cl),
        ucl: String(g.ucl),
        lcl: String(g.lcl),
        napomena: f.napomena?.trim() ? f.napomena : napomenaAuto,
      }));
      addToast?.(`✓ Granice preuzete${g.meta ? ` (${g.meta})` : ""}`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUcitavaGraf(false);
    }
  };

  const kopirajRed = (r) => {
    setForm({
      tip_karte: r.tip_karte,
      pozicija: r.pozicija || "",
      cl: String(r.cl),
      ucl: String(r.ucl),
      lcl: String(r.lcl),
      vazi_od: danasIso(),
      napomena: r.napomena || "",
    });
  };

  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "8px 10px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 4, display: "block" };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 18,
    }}>
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
        SPC BASELINE (PPAP)
      </div>
      <p style={{ color: C.sivi, fontSize: 10, marginBottom: 14, lineHeight: 1.55 }}>
        Zamrznute granice kontrolnih karti posle kvalifikacije procesa.
        Graf koristi baseline umesto automatski izračunatih granica kada postoji zapis za deo + tip
        {modul === "merljive" ? " + pozicija" : ""}.
        Pokreni SQL <strong style={{ color: C.zuta }}>22_spc_baseline_merljive.sql</strong> za merljive tipove.
      </p>

      <label style={lbl}>ID delo
        <select
          value={idDeo}
          onChange={(e) => setIdDeo(e.target.value.toUpperCase())}
          style={{ ...INP, marginBottom: 12, cursor: "pointer" }}
        >
          <option value="">— Izaberi —</option>
          {delovi.map((d) => (
            <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
          ))}
        </select>
      </label>

      {idDeo && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}>
            <label style={lbl}>Tip karte
              <select
                value={form.tip_karte}
                onChange={(e) => setForm((f) => ({ ...f, tip_karte: e.target.value }))}
                style={{ ...INP, cursor: "pointer" }}
              >
                {tipovi.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            {modul === "merljive" && (
              <label style={lbl}>Pozicija
                <select
                  value={form.pozicija}
                  onChange={(e) => setForm((f) => ({ ...f, pozicija: e.target.value }))}
                  style={{ ...INP, cursor: "pointer" }}
                >
                  <option value="">— Obavezno za merljive —</option>
                  {pozicije.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            )}
            {modul === "merljive" && ["xbar", "r"].includes(form.tip_karte) && (
              <label style={lbl}>n podgrupe
                <select
                  value={nPodgrupa}
                  onChange={(e) => setNPodgrupa(Number(e.target.value))}
                  style={{ ...INP, cursor: "pointer" }}
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
            <label style={lbl}>Važi od
              <input
                type="date"
                value={form.vazi_od}
                onChange={(e) => setForm((f) => ({ ...f, vazi_od: e.target.value }))}
                style={INP}
              />
            </label>
            <label style={lbl}>CL
              <input
                value={form.cl}
                onChange={(e) => setForm((f) => ({ ...f, cl: e.target.value }))}
                placeholder="0"
                style={INP}
              />
            </label>
            <label style={lbl}>UCL
              <input
                value={form.ucl}
                onChange={(e) => setForm((f) => ({ ...f, ucl: e.target.value }))}
                placeholder="0"
                style={INP}
              />
            </label>
            <label style={lbl}>LCL
              <input
                value={form.lcl}
                onChange={(e) => setForm((f) => ({ ...f, lcl: e.target.value }))}
                placeholder="0"
                style={INP}
              />
            </label>
          </div>

          <label style={lbl}>Napomena (PPAP revizija, lot, itd.)
            <input
              value={form.napomena}
              onChange={(e) => setForm((f) => ({ ...f, napomena: e.target.value }))}
              style={{ ...INP, marginBottom: 12 }}
            />
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              onClick={preuzmiIzGrafa}
              disabled={ucitavaGraf || (modul === "merljive" && !form.pozicija)}
              style={{
                background: ucitavaGraf ? C.hover : `${C.plava}22`,
                border: `1px solid ${C.plava}`,
                borderRadius: 8,
                color: ucitavaGraf ? C.sivi : C.plava,
                fontSize: 12,
                fontWeight: 700,
                padding: "10px 18px",
                cursor: ucitavaGraf ? "not-allowed" : "pointer",
              }}
            >
              {ucitavaGraf ? "Računam…" : "↻ Preuzmi iz trenutnog grafa"}
            </button>
            <button
              type="button"
              onClick={dodaj}
              disabled={snima || (modul === "merljive" && !form.pozicija)}
              style={{
                background: snima || (modul === "merljive" && !form.pozicija) ? C.hover : C.zuta,
                border: "none",
                borderRadius: 8,
                color: snima ? C.sivi : "#000",
                fontSize: 12,
                fontWeight: 700,
                padding: "10px 18px",
                cursor: snima ? "not-allowed" : "pointer",
              }}
            >
              {snima ? "Snima…" : "+ Novi baseline"}
            </button>
          </div>

          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
            Evidencija za {idDeo}
            {loading ? " · učitavam…" : ` · ${lista.length} zapisa`}
          </div>

          {lista.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ color: C.sivi, textAlign: "left" }}>
                    {["Tip", "Poz.", "CL", "UCL", "LCL", "Od", "Napomena", ""].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}30` }}>
                      <td style={{ padding: 6 }}>{r.tip_karte}</td>
                      <td style={{ padding: 6 }}>{r.pozicija || "—"}</td>
                      <td style={{ padding: 6 }}>{r.cl}</td>
                      <td style={{ padding: 6, color: C.crvena }}>{r.ucl}</td>
                      <td style={{ padding: 6, color: C.zelena }}>{r.lcl}</td>
                      <td style={{ padding: 6 }}>{r.vazi_od}</td>
                      <td style={{ padding: 6, color: C.sivi, maxWidth: 140 }}>{r.napomena || "—"}</td>
                      <td style={{ padding: 6 }}>
                        <button
                          type="button"
                          onClick={() => kopirajRed(r)}
                          style={{
                            background: "none",
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            color: C.sivi,
                            fontSize: 9,
                            padding: "3px 8px",
                            cursor: "pointer",
                          }}
                        >
                          Kopiraj
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
