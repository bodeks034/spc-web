import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  statusMerilaKalibracije,
  filtrirajMerila,
  stampajMsaMerila,
  preuzmiMsaMerilaPdf,
} from "../lib/msaMerilaPdf.js";
import { stampajEkran, preuzmiEkranPdf } from "../lib/listaEkranIzvoz.js";
import ListaIzvozDugmad from "./ListaIzvozDugmad.jsx";

export default function KalibracijaMerilaPanel({ korisnik, C, addToast }) {
  const [merila, setMerila] = useState([]);
  const [forma, setForma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("sva");
  const [busyEkran, setBusyEkran] = useState(false);
  const [busyForma, setBusyForma] = useState(false);
  const izvozRef = useRef(null);
  const DANA_UPOZORENJE = 30;

  useEffect(() => { ucitaj(); }, []);

  const ucitaj = async () => {
    const { data } = await supabase.from("merila")
      .select("*,kalibracije(datum_kal,sledeca_kal,rezultat,sertifikat_br,napomena)")
      .eq("aktivno", true).order("naziv");
    setMerila(data || []); setLoading(false);
  };

  const getStatus = (m) => {
    const s = statusMerilaKalibracije(m, DANA_UPOZORENJE);
    const boja = s.nivo === "ok" ? C.zelena
      : s.nivo === "uskoro" ? C.zuta
      : s.nivo === "nepoznato" ? C.sivi
      : C.crvena;
    return { label: s.label, boja, dani: s.dani };
  };

  const filtrirani = filtrirajMerila(merila, filter);

  const dodajMerilo = async (form) => {
    const { data, error } = await supabase.from("merila").insert(form)
      .select("*,kalibracije(datum_kal,sledeca_kal,rezultat)").single();
    if (!error) { setMerila(p => [data, ...p]); setForma(null); addToast("✓ Merilo dodato", "uspeh"); }
    else addToast(error.message, "greska");
  };

  const dodajKalibraciju = async (merilo_id, form) => {
    const { error } = await supabase.from("kalibracije").insert({ ...form, merilo_id });
    if (!error) { addToast("✓ Kalibracija evidentirana", "uspeh"); ucitaj(); setForma(null); }
    else addToast(error.message, "greska");
  };

  const isteklo = merila.filter(m => getStatus(m).dani !== null && getStatus(m).dani < 0).length;
  const uskoro = merila.filter(m => {
    const d = getStatus(m).dani;
    return d !== null && d >= 0 && d < DANA_UPOZORENJE;
  }).length;

  const exportOpts = { filter, naslov: "MSA · Merila / kalibracija" };

  const stampajEkranFn = async () => {
    if (!filtrirani.length) { addToast?.("Nema merila za štampu", "greska"); return; }
    try {
      await stampajEkran(izvozRef.current, { naslov: exportOpts.naslov, bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfEkran = async () => {
    if (!filtrirani.length) { addToast?.("Nema merila za PDF", "greska"); return; }
    setBusyEkran(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: exportOpts.naslov,
        prefiksFajla: "MSA_Merila",
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
    if (!filtrirani.length) { addToast?.("Nema merila za štampu", "greska"); return; }
    try {
      stampajMsaMerila(merila, exportOpts);
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfForma = async () => {
    if (!filtrirani.length) { addToast?.("Nema merila za PDF", "greska"); return; }
    setBusyForma(true);
    try {
      await preuzmiMsaMerilaPdf(merila, exportOpts);
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
  };

  const BTN_SEC = {
    background: C.hover, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 11, fontWeight: 700, padding: "8px 12px", cursor: "pointer",
    fontFamily: "inherit",
  };

  if (forma === "novo_merilo") {
    return (
      <div style={{ padding: 18, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button type="button" onClick={() => setForma(null)} style={{ background: "none", border: "none", color: C.sivi, fontSize: 14, cursor: "pointer" }}>←</button>
          <span style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>Novo merilo</span>
        </div>
        <NovoMeriloForma onSnimi={dodajMerilo} onOtkazati={() => setForma(null)} C={C} INP={INP} />
      </div>
    );
  }

  if (forma?.tip === "kalibracija") {
    return (
      <div style={{ padding: 18, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button type="button" onClick={() => setForma(null)} style={{ background: "none", border: "none", color: C.sivi, fontSize: 14, cursor: "pointer" }}>←</button>
          <span style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>Nova kalibracija — {forma.merilo.naziv}</span>
        </div>
        <NovaKalibracijaForma onSnimi={(f) => dodajKalibraciju(forma.merilo.id, f)}
          onOtkazati={() => setForma(null)} C={C} INP={INP} />
      </div>
    );
  }

  return (
    <div ref={izvozRef} style={{
      padding: 18,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      flex: 1,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, gap: 10, flexWrap: "wrap", flexShrink: 0,
      }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
          KALIBRACIJA MERILA
          {isteklo > 0 && (
            <span style={{ background: C.crvena, color: C.onAkcent, fontSize: 10, borderRadius: 10, padding: "1px 7px", marginLeft: 8 }}>
              {isteklo} isteklo
            </span>
          )}
          {uskoro > 0 && (
            <span style={{ background: C.zuta, color: C.onZuta, fontSize: 10, borderRadius: 10, padding: "1px 7px", marginLeft: 6 }}>
              {uskoro} uskoro
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ListaIzvozDugmad
            C={C}
            disabled={!filtrirani.length || loading}
            busyEkran={busyEkran}
            busyForma={busyForma}
            akcent={C.plava}
            onStampajEkran={stampajEkranFn}
            onPdfEkran={exportPdfEkran}
            onStampajForma={stampajFormaFn}
            onPdfForma={exportPdfForma}
          />
          <button type="button" onClick={() => setForma("novo_merilo")}
            style={{ background: C.plava, border: "none", borderRadius: 8, color: C.onAkcent, fontSize: 12, fontWeight: 700, padding: "9px 16px", cursor: "pointer" }}>
            + Novo merilo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: "wrap" }}>
        {[["sva", "Sva"], ["uskoro", `Uskoro (${uskoro})`], ["istekla", `Istekla (${isteklo})`]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} style={{
            background: filter === v ? C.plava : "none",
            border: `1px solid ${filter === v ? C.plava : C.border}`,
            borderRadius: 8, color: filter === v ? C.onAkcent : C.sivi, fontSize: 11,
            padding: "6px 14px", cursor: "pointer",
          }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 12,
      }}>
        {loading ? (
          <div style={{ color: C.sivi, fontSize: 12, padding: 20 }}>Učitavanje...</div>
        ) : !filtrirani.length ? (
          <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
            {filter === "sva" ? "Nema merila — dodaj prvo merilo" : "Nema merila u ovom filteru"}
          </div>
        ) : filtrirani.map((m) => {
          const stat = getStatus(m);
          const posKal = m.kalibracije?.sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];
          return (
            <div key={m.id} style={{
              background: C.panel, border: `1px solid ${stat.boja}30`,
              borderRadius: 12, padding: 16, marginBottom: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: C.tekst, fontWeight: 700, fontSize: 14 }}>📏 {m.naziv}</span>
                    {m.serijski_broj && <span style={{ color: C.border, fontSize: 11 }}>S/N: {m.serijski_broj}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.sivi }}>
                    {m.tip && <span>{m.tip}</span>}
                    {m.lokacija && <span>📍 {m.lokacija}</span>}
                    {m.opseg_min != null && <span>Opseg: {m.opseg_min}–{m.opseg_max} {m.jedinica}</span>}
                  </div>
                </div>
                <span style={{
                  background: `${stat.boja}20`, color: stat.boja, fontSize: 10, fontWeight: 700,
                  padding: "4px 10px", borderRadius: 10, letterSpacing: 0.5, flexShrink: 0,
                }}>
                  {stat.label}
                </span>
              </div>
              {posKal && (
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.sivi, marginBottom: 10 }}>
                  <span>Posl. kal: <strong style={{ color: C.tekst }}>{posKal.datum_kal}</strong></span>
                  <span>Sledeća: <strong style={{ color: stat.boja }}>{posKal.sledeca_kal}</strong></span>
                  {posKal.sertifikat_br && <span>Cert: {posKal.sertifikat_br}</span>}
                </div>
              )}
              <button type="button" onClick={() => setForma({ tip: "kalibracija", merilo: m })}
                style={{
                  background: `${C.zelena}20`, border: `1px solid ${C.zelena}40`, borderRadius: 7,
                  color: C.zelena, fontSize: 11, fontWeight: 700, padding: "6px 14px", cursor: "pointer",
                }}>
                + Evidentiraj kalibraciju
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NovoMeriloForma({ onSnimi, onOtkazati, C, INP }) {
  const [f, setF] = useState({ naziv: "", serijski_broj: "", tip: "", opseg_min: "", opseg_max: "", jedinica: "mm", lokacija: "" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[["NAZIV MERILA", "naziv", "text", "npr. Mikrometar 0-25mm"],
        ["SERIJSKI BROJ", "serijski_broj", "text", ""],
        ["TIP", "tip", "text", "Mikrometar, Čigra, Pomično..."],
        ["LOKACIJA", "lokacija", "text", "Linija 1, Skladište..."],
      ].map(([l, k, t, ph]) => (
        <div key={k}>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>{l}</div>
          <input type={t} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
            placeholder={ph} style={INP} />
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>OPSEG MIN</div>
          <input type="number" value={f.opseg_min} onChange={(e) => setF((p) => ({ ...p, opseg_min: e.target.value }))} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>OPSEG MAX</div>
          <input type="number" value={f.opseg_max} onChange={(e) => setF((p) => ({ ...p, opseg_max: e.target.value }))} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>JEDINICA</div>
          <input value={f.jedinica} onChange={(e) => setF((p) => ({ ...p, jedinica: e.target.value }))} style={INP} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" onClick={() => onSnimi(f)} disabled={!f.naziv}
          style={{
            flex: 1, background: f.naziv ? C.zelena : C.hover, border: "none", borderRadius: 8,
            color: f.naziv ? C.onAkcent : C.sivi, fontSize: 13, fontWeight: 700, padding: "12px", cursor: "pointer",
          }}>
          Snimi merilo
        </button>
        <button type="button" onClick={onOtkazati} style={{
          background: "none", border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.sivi, fontSize: 13, padding: "12px 16px", cursor: "pointer",
        }}>Otkaži</button>
      </div>
    </div>
  );
}

function NovaKalibracijaForma({ onSnimi, onOtkazati, C, INP }) {
  const danas = new Date().toISOString().split("T")[0];
  const za12m = new Date(); za12m.setFullYear(za12m.getFullYear() + 1);
  const [f, setF] = useState({
    datum_kal: danas, sledeca_kal: za12m.toISOString().split("T")[0],
    izvrsio: "", sertifikat_br: "", rezultat: "prolaz", napomena: "",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>DATUM KALIBRACIJE</div>
          <input type="date" value={f.datum_kal} onChange={(e) => setF((p) => ({ ...p, datum_kal: e.target.value }))} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>SLEDEĆA KALIBRACIJA</div>
          <input type="date" value={f.sledeca_kal} onChange={(e) => setF((p) => ({ ...p, sledeca_kal: e.target.value }))} style={INP} />
        </div>
      </div>
      {[["IZVRŠIO", "izvrsio", "Ime laboratorije ili osobe"],
        ["BROJ SERTIFIKATA", "sertifikat_br", "CAL-2024-001"],
      ].map(([l, k, ph]) => (
        <div key={k}>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>{l}</div>
          <input value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph} style={INP} />
        </div>
      ))}
      <div>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>REZULTAT</div>
        <select value={f.rezultat} onChange={(e) => setF((p) => ({ ...p, rezultat: e.target.value }))}
          style={{ ...INP, cursor: "pointer" }}>
          <option value="prolaz">✓ Prolaz</option>
          <option value="uslovni">⚠ Uslovni prolaz</option>
          <option value="pad">✗ Pad</option>
        </select>
      </div>
      <div>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>NAPOMENA</div>
        <textarea value={f.napomena} onChange={(e) => setF((p) => ({ ...p, napomena: e.target.value }))}
          rows={2} style={{ ...INP, resize: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => onSnimi(f)}
          style={{
            flex: 1, background: C.zelena, border: "none", borderRadius: 8, color: C.onAkcent,
            fontSize: 13, fontWeight: 700, padding: "12px", cursor: "pointer",
          }}>
          Evidentiraj
        </button>
        <button type="button" onClick={onOtkazati} style={{
          background: "none", border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.sivi, fontSize: 13, padding: "12px 16px", cursor: "pointer",
        }}>Otkaži</button>
      </div>
    </div>
  );
}
