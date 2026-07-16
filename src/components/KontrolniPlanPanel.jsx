import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajKontrolniPlan, snimiKontrolniPlan, ucitajRevizijePlana, uvoziPlanIzKarakteristika,
} from "../lib/kontrolniPlan.js";
import { stampajEkran, preuzmiEkranPdf } from "../lib/listaEkranIzvoz.js";
import { stampajKontrolniPlan, preuzmiKontrolniPlanPdf } from "../lib/kontrolniPlanPdf.js";
import ListaIzvozDugmad from "./ListaIzvozDugmad.jsx";
import { jeKvalitetIliVise } from "../lib/uloge.js";

export default function KontrolniPlanPanel({ C, addToast, korisnik, idDeoFilter = "" }) {
  const [planovi, setPlanovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDeo, setFilterDeo] = useState(idDeoFilter);
  const [forma, setForma] = useState(null);
  const [revizije, setRevizije] = useState([]);
  const [busyEkran, setBusyEkran] = useState(false);
  const [busyForma, setBusyForma] = useState(false);
  const izvozRef = useRef(null);

  const mozeEdit = jeKvalitetIliVise(korisnik?.uloga);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await ucitajKontrolniPlan(supabase, { idDeo: filterDeo || undefined });
      setPlanovi(rows);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [filterDeo, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const otvoriRevizije = async (planId) => {
    try {
      setRevizije(await ucitajRevizijePlana(supabase, planId));
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const snimi = async () => {
    try {
      await snimiKontrolniPlan(supabase, forma, korisnik);
      addToast?.("✓ Kontrolni plan sačuvan", "uspeh");
      setForma(null);
      ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const uvozi = async () => {
    const deo = filterDeo.trim().toUpperCase();
    if (deo.length < 3) {
      addToast?.("Unesite ID dela za uvoz", "greska");
      return;
    }
    try {
      const n = await uvoziPlanIzKarakteristika(supabase, deo, korisnik);
      addToast?.(`✓ Uvezeno ${n} stavki iz karakteristika`, "uspeh");
      ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const exportNaslov = () => (filterDeo.trim()
    ? `Kontrolni plan — ${filterDeo.trim().toUpperCase()}`
    : "Kontrolni plan");

  const exportOpts = () => ({
    filterDeo,
    naslov: exportNaslov(),
  });

  const stampajEkranFn = async () => {
    if (!planovi.length) { addToast?.("Nema stavki za štampu", "greska"); return; }
    try {
      await stampajEkran(izvozRef.current, { naslov: exportNaslov(), bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfEkran = async () => {
    if (!planovi.length) { addToast?.("Nema stavki za PDF", "greska"); return; }
    setBusyEkran(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: exportNaslov(),
        prefiksFajla: "Kontrolni_plan",
        bgColor: C.bg,
      });
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyEkran(false);
    }
  };

  const stampajFormaFn = () => {
    if (!planovi.length) { addToast?.("Nema stavki za štampu", "greska"); return; }
    try {
      stampajKontrolniPlan(planovi, exportOpts());
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfForma = async () => {
    if (!planovi.length) { addToast?.("Nema stavki za PDF", "greska"); return; }
    setBusyForma(true);
    try {
      await preuzmiKontrolniPlanPdf(planovi, exportOpts());
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.tekst, fontSize: 11, padding: "8px 10px",
    boxSizing: "border-box", fontFamily: "inherit", marginBottom: 6,
  };

  const BTN_SEC = {
    fontSize: 10, padding: "6px 10px", cursor: "pointer", borderRadius: 6,
    border: `1px solid ${C.border}`, background: C.hover, color: C.tekst,
    fontWeight: 700, fontFamily: "inherit",
  };

  return (
    <div ref={izvozRef} style={{ padding: 16, flex: 1, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>KONTROLNI PLAN</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input value={filterDeo} onChange={(e) => setFilterDeo(e.target.value.toUpperCase())} placeholder="Filter ID dela" style={{ ...INP, width: 120, marginBottom: 0 }} />
          <ListaIzvozDugmad
            C={C}
            disabled={!planovi.length || loading}
            busyEkran={busyEkran}
            busyForma={busyForma}
            akcent={C.plava}
            onStampajEkran={stampajEkranFn}
            onPdfEkran={exportPdfEkran}
            onStampajForma={stampajFormaFn}
            onPdfForma={exportPdfForma}
          />
          {mozeEdit && (
            <>
              <button type="button" onClick={uvozi} style={{ fontSize: 10, padding: "6px 10px", cursor: "pointer", borderRadius: 6, border: `1px solid ${C.plava}`, background: C.hover, color: C.plava }}>Uvoz iz kar.</button>
              <button type="button" onClick={() => setForma({ id_deo: filterDeo, pozicija: "", revizija: "A", vazi_od: new Date().toISOString().split("T")[0] })}
                style={{ fontSize: 10, padding: "6px 10px", cursor: "pointer", borderRadius: 6, border: "none", background: C.plava, color: C.onAkcent, fontWeight: 700 }}>+ Stavka</button>
            </>
          )}
        </div>
      </div>

      {forma && mozeEdit && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          {["id_deo", "pogon_kod", "pozicija", "dimenzija", "metoda", "ucestalost", "reakcija", "revizija"].map((k) => (
            <input key={k} value={forma[k] || ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))}
              placeholder={k.replace("_", " ")} style={INP} />
          ))}
          <input type="date" value={forma.vazi_od || ""} onChange={(e) => setForma((p) => ({ ...p, vazi_od: e.target.value }))} style={INP} />
          <button type="button" onClick={snimi} style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, padding: "8px 16px", cursor: "pointer", fontWeight: 700, marginRight: 8 }}>Sačuvaj</button>
          <button type="button" onClick={() => setForma(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, padding: "8px 12px", cursor: "pointer" }}>Otkaži</button>
        </div>
      )}

      {loading ? <div style={{ color: C.sivi }}>Učitavanje…</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ color: C.sivi, textAlign: "left" }}>
                {["Deo", "Pogon", "Pozicija", "Dimenzija", "Metoda", "Učestalost", "Reakcija", "Rev.", "Važi od", ""].map((h) => (
                  <th key={h} style={{ padding: "6px 4px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planovi.map((p) => (
                <tr key={p.id} style={{ color: C.tekst }}>
                  <td style={{ padding: 4 }}>{p.id_deo}</td>
                  <td style={{ padding: 4 }}>{p.pogon_kod || "—"}</td>
                  <td style={{ padding: 4 }}>{p.pozicija}</td>
                  <td style={{ padding: 4 }}>{p.dimenzija || "—"}</td>
                  <td style={{ padding: 4 }}>{p.metoda || "—"}</td>
                  <td style={{ padding: 4 }}>{p.ucestalost || "—"}</td>
                  <td style={{ padding: 4, maxWidth: 120 }}>{p.reakcija || "—"}</td>
                  <td style={{ padding: 4 }}>{p.revizija}</td>
                  <td style={{ padding: 4 }}>{p.vazi_od}</td>
                  <td style={{ padding: 4 }}>
                    <button type="button" onClick={() => otvoriRevizije(p.id)} style={{ fontSize: 9, cursor: "pointer", color: C.plava, background: "none", border: "none" }}>Rev.</button>
                    {mozeEdit && (
                      <button type="button" onClick={() => setForma(p)} style={{ fontSize: 9, cursor: "pointer", color: C.sivi, background: "none", border: "none", marginLeft: 4 }}>✎</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revizije.length > 0 && (
        <div style={{ marginTop: 16, background: C.bg, borderRadius: 8, padding: 10, fontSize: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.tekst }}>Istorija revizija</div>
          {revizije.map((r) => (
            <div key={r.id} style={{ color: C.sivi, marginBottom: 4 }}>
              {new Date(r.created_at).toLocaleString("sr-RS")} · {r.radnik_ime || "—"} · {r.polje}: {r.stara_vrednost || "—"} → {r.nova_vrednost || "—"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
