import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchDeloviListaZaRn } from "../../lib/sifrarnikApi.js";
import {
  fetchMomentJobovi,
  fetchMomentJobDetalj,
  upsertMomentJob,
  deleteMomentJob,
  upsertMomentKorak,
  deleteMomentKorak,
  upsertMomentPozicija,
  deleteMomentPozicija,
  fetchMomentKlucevi,
  upsertMomentKljuc,
  uvoziKompletanSifrarnik,
  izveziMomentJobJson,
  kompletSeed,
} from "../../lib/momentKljucApi.js";
import { preuzmiMomentJobJson, MOMENT_VENDOR_NAZIV } from "../../lib/momentKljuc.js";
import { uveziMomentProtokolFajlove } from "../../lib/momentIzvozUvoz.js";
import { urlCrtezAsset } from "../../lib/crtezAssets.js";
import CrtezSplitModal from "../CrtezSplitModal.jsx";
import MomentKljucListPanel from "./MomentKljucListPanel.jsx";
import {
  MomentPfmeaMetodologijaPanel,
  MomentPfmeaOblaciciRed,
  MomentPfmeaKalkulator,
} from "../moment/MomentPfmeaOblacic.jsx";
import MomentPfmeaCpPicker from "../moment/MomentPfmeaCpPicker.jsx";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";

const PRAZAN_JOB = {
  id_deo: kompletSeed.meta.id_deo,
  kod_job: "",
  naziv: "",
  tip_vozila: kompletSeed.meta.tip_vozila,
  operacija: kompletSeed.meta.operacija,
  pogon_kod: "",
  linija: "",
  vendor_profil: "atlas",
  revizija: "A",
  aktivan: true,
  napomena: "",
};

const PRAZAN_KORAK = {
  redosled: 1,
  poz_br: "",
  prolaz: 1,
  tip: "NM",
  cilj_nm: "",
  tol_min: "",
  tol_max: "",
  ugao_cilj: "",
  ugao_tol: "",
  klasifikacija: "VSK",
  varijanta: "",
  napomena: "",
};

const PRAZAN_POZ = { poz_br: "", opis: "", klasifikacija: "STD" };

const PRAZAN_KLJUC = {
  naziv: "",
  serijski_broj: "",
  vendor_profil: "atlas",
  linija_stanica: "",
  lokacija: "",
};

const VENDORI = Object.entries(MOMENT_VENDOR_NAZIV).map(([id, label]) => ({ id, label }));
const KLASE = ["VSK", "KSK", "STD"];
const TIPOVI = ["NM", "NM_UGAO", "STAGED"];

export default function MomentKljucHub({ C, addToast }) {
  const [podtab, setPodtab] = useState("list");
  const [jobovi, setJobovi] = useState([]);
  const [izabraniJobId, setIzabraniJobId] = useState(null);
  const [detalj, setDetalj] = useState(null);
  const [kljucevi, setKljucevi] = useState([]);
  const [delovi, setDelovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uvozi, setUvozi] = useState(false);
  const [uvoziProtokol, setUvoziProtokol] = useState(false);
  const protokolInputRef = useRef(null);
  const [formaJob, setFormaJob] = useState(null);
  const [formaKorak, setFormaKorak] = useState(null);
  const [formaPoz, setFormaPoz] = useState(null);
  const [formaKljuc, setFormaKljuc] = useState(null);
  const [crtezUrl, setCrtezUrl] = useState(null);
  const [zoomCrtez, setZoomCrtez] = useState(false);
  const [filterDeo, setFilterDeo] = useState("");
  const INP = inpStyle(C);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [j, k, d] = await Promise.all([
        fetchMomentJobovi(supabase),
        fetchMomentKlucevi(supabase),
        fetchDeloviListaZaRn(),
      ]);
      setJobovi(j);
      setKljucevi(k);
      setDelovi(d);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const ucitajDetalj = useCallback(async (jobId) => {
    if (!jobId) { setDetalj(null); setCrtezUrl(null); return; }
    try {
      const p = await fetchMomentJobDetalj(supabase, jobId);
      setDetalj(p);
      if (p?.crtez) {
        const u = await urlCrtezAsset(p.crtez);
        setCrtezUrl(u);
      } else {
        setCrtezUrl(null);
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);
  useEffect(() => { ucitajDetalj(izabraniJobId); }, [izabraniJobId, ucitajDetalj]);

  const filtriraniJobovi = useMemo(() => {
    if (!filterDeo.trim()) return jobovi;
    const q = filterDeo.toUpperCase();
    return jobovi.filter((j) => String(j.id_deo || "").includes(q) || String(j.kod_job || "").toUpperCase().includes(q));
  }, [jobovi, filterDeo]);

  const pokreniUvoz = async (zameni = false) => {
    setUvozi(true);
    try {
      const r = await uvoziKompletanSifrarnik(supabase, { zameniPostojece: zameni });
      const greskeTekst = r.greske.length
        ? ` · ${r.greske.length} grešaka: ${r.greske.slice(0, 2).join("; ")}${r.greske.length > 2 ? "…" : ""}`
        : "";
      addToast?.(
        `✓ Uvoz (${r.id_deo || kompletSeed.meta.id_deo}): ${r.jobovi} job · ${r.pozicije} poz · ${r.koraci} kor · ${r.kljucevi} ključeva`
        + greskeTekst,
        r.greske.length ? "greska" : "uspeh",
      );
      if (r.greske.length) console.warn("Moment uvoz greške:", r.greske);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUvozi(false);
    }
  };

  const snimiJob = async () => {
    try {
      await upsertMomentJob(supabase, formaJob);
      addToast?.("✓ JOB sačuvan", "uspeh");
      setFormaJob(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const obrisiJob = async (id) => {
    if (!window.confirm("Obrisati JOB i sve korake/pozicije?")) return;
    try {
      await deleteMomentJob(supabase, id);
      if (izabraniJobId === id) setIzabraniJobId(null);
      addToast?.("Obrisano", "uspeh");
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const snimiKorak = async () => {
    try {
      await upsertMomentKorak(supabase, { ...formaKorak, job_id: izabraniJobId });
      addToast?.("✓ Korak sačuvan", "uspeh");
      setFormaKorak(null);
      await ucitajDetalj(izabraniJobId);
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const snimiPoz = async () => {
    try {
      await upsertMomentPozicija(supabase, { ...formaPoz, job_id: izabraniJobId });
      addToast?.("✓ Pozicija sačuvana", "uspeh");
      setFormaPoz(null);
      await ucitajDetalj(izabraniJobId);
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const snimiKljuc = async () => {
    try {
      await upsertMomentKljuc(supabase, formaKljuc);
      addToast?.("✓ Ključ sačuvan", "uspeh");
      setFormaKljuc(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const izveziJson = async () => {
    if (!izabraniJobId) return;
    try {
      const json = await izveziMomentJobJson(supabase, izabraniJobId);
      const kod = detalj?.job?.kod_job || "job";
      preuzmiMomentJobJson(json, `moment_${kod}.json`);
      addToast?.("JSON izvezen", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const uveziProtokolSaFajla = async (e) => {
    const files = e.target.files;
    if (!files?.length || !izabraniJobId || !detalj?.job) return;
    setUvoziProtokol(true);
    try {
      const r = await uveziMomentProtokolFajlove(supabase, files, {
        jobId: izabraniJobId,
        idDeo: detalj.job.id_deo,
        vendorProfil: detalj.job.vendor_profil || "generic",
      });
      if (r.uvezeno) addToast?.(`✓ Uvezeno ${r.uvezeno} očitavanja u protokol`, "uspeh");
      else addToast?.("Nema uvezenih redova — proverite format fajla", "greska");
      if (r.greske?.length) console.warn("Moment protokol uvoz:", r.greske);
    } catch (err) {
      addToast?.(err.message, "greska");
    } finally {
      setUvoziProtokol(false);
      e.target.value = "";
    }
  };

  const TABOVI = [
    ["list", "Jedan list"],
    ["jobovi", "JOB-ovi"],
    ["koraci", "Koraci sekvence"],
    ["pozicije", "Pozicije (Poz. br.)"],
    ["kljucevi", "Ključevi na liniji"],
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>
          DIGITALNI MOMENTNI KLJUČ — ŠIFRARNIK
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
          Inženjeri unose sve na tabu <strong>Jedan list</strong> — sistem automatski raspoređuje u JOB / pozicije / korake.
          Napredno: JOB-ovi, koraci, ključevi. Kompletan paket: <strong>{kompletSeed.jobs.length} job-ova</strong>.
        </div>
        <MomentPfmeaMetodologijaPanel C={C} />
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" disabled={uvozi} onClick={() => pokreniUvoz(false)}
            style={btnStyle(C, C.zelena)}>
            {uvozi ? "Uvozim…" : "⬇ Učitaj kompletan šifrarnik"}
          </button>
          {izabraniJobId && (
            <>
              <button type="button" onClick={izveziJson} style={btnStyle(C, C.plava)}>
                📤 Export JSON
              </button>
              <button type="button" disabled={uvoziProtokol}
                onClick={() => protokolInputRef.current?.click()}
                style={btnStyle(C, C.narandzasta || "#c77800")}>
                {uvoziProtokol ? "Uvozim…" : "📂 Uvezi protokol (CSV/TXT)"}
              </button>
              <input ref={protokolInputRef} type="file" accept=".csv,.txt,.log,.xml,.json"
                multiple style={{ display: "none" }} onChange={uveziProtokolSaFajla} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TABOVI.map(([id, naziv]) => (
          <button key={id} type="button" onClick={() => setPodtab(id)}
            style={{
              background: podtab === id ? `${C.zelena}18` : "transparent",
              border: `1px solid ${podtab === id ? C.zelena : C.border}`,
              borderRadius: 6, padding: "6px 12px", cursor: "pointer",
              fontSize: 10, fontWeight: podtab === id ? 700 : 400,
              color: podtab === id ? C.zelena : C.sivi,
            }}>
            {naziv}
          </button>
        ))}
      </div>

      {podtab === "list" && (
        <MomentKljucListPanel C={C} addToast={addToast} />
      )}

      {podtab === "jobovi" && (
        <CrudShell C={C} loading={loading} count={filtriraniJobovi.length} tabela="moment_job"
          onAdd={() => setFormaJob({ ...PRAZAN_JOB })} addLabel="+ JOB">
          <input value={filterDeo} onChange={(e) => setFilterDeo(e.target.value)}
            placeholder="Filter ID deo / kod job…" style={{ ...INP, marginBottom: 10, maxWidth: 280 }} />
          {formaJob && (
            <JobForma C={C} forma={formaJob} setForma={setFormaJob} delovi={delovi}
              onSave={snimiJob} onCancel={() => setFormaJob(null)} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: crtezUrl ? "1fr 220px" : "1fr", gap: 12 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <TableHead C={C} cols={["", "ID DEO", "JOB", "NAZIV", "OP.", "VENDOR", "KOR", ""]}
                widths="28px 100px 72px 1fr 72px 72px 40px 52px" />
              {filtriraniJobovi.map((j, i) => (
                <TableRow key={j.id} C={C} i={i}
                  onClick={() => setIzabraniJobId(j.id)}
                  highlight={izabraniJobId === j.id}
                  cols={[
                    izabraniJobId === j.id ? "▸" : "",
                    j.id_deo,
                    j.kod_job,
                    j.naziv,
                    j.operacija || "—",
                    j.vendor_profil || "—",
                    detalj?.job?.id === j.id ? detalj.koraci.length : "…",
                    <RowActions key="a" C={C}
                      onEdit={() => setFormaJob({ ...j })}
                      onDelete={() => obrisiJob(j.id)} />,
                  ]}
                  widths="28px 100px 72px 1fr 72px 72px 40px 52px" />
              ))}
            </div>
            {crtezUrl && detalj?.job && (
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8 }}>
                <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6, textAlign: "center" }}>
                  {detalj.job.kod_job} · dijagram
                </div>
                <button
                  type="button"
                  onClick={() => setZoomCrtez(true)}
                  title="Otvori dijagram — zoom i pomeranje"
                  style={{
                    display: "block", width: "100%", padding: 0, border: "none",
                    background: "transparent", cursor: "zoom-in",
                  }}
                >
                  <img src={crtezUrl} alt="" style={{ width: "100%", height: "auto", maxHeight: 200, objectFit: "contain" }} />
                </button>
                <div style={{ color: C.sivi, fontSize: 8, textAlign: "center", marginTop: 4 }}>
                  Klik za zoom · ⛶
                </div>
              </div>
            )}
          </div>
        </CrudShell>
      )}

      {podtab === "koraci" && (
        <KorakPanel C={C} detalj={detalj} izabraniJobId={izabraniJobId}
          formaKorak={formaKorak} setFormaKorak={setFormaKorak}
          onAdd={() => setFormaKorak({
            ...PRAZAN_KORAK,
            redosled: (detalj?.koraci?.length || 0) + 1,
            job_id: izabraniJobId,
          })}
          onSave={snimiKorak}
          onDelete={async (id) => {
            await deleteMomentKorak(supabase, id);
            await ucitajDetalj(izabraniJobId);
          }}
          addToast={addToast} />
      )}

      {podtab === "pozicije" && (
        <PozicijaPanel C={C} detalj={detalj} izabraniJobId={izabraniJobId}
          formaPoz={formaPoz} setFormaPoz={setFormaPoz}
          onAdd={() => setFormaPoz({ ...PRAZAN_POZ, job_id: izabraniJobId })}
          onSave={snimiPoz}
          onDelete={async (id) => {
            await deleteMomentPozicija(supabase, id);
            await ucitajDetalj(izabraniJobId);
          }} />
      )}

      {podtab === "kljucevi" && (
        <CrudShell C={C} loading={loading} count={kljucevi.length} tabela="merila (momentni_kljuc)"
          onAdd={() => setFormaKljuc({ ...PRAZAN_KLJUC })} addLabel="+ Ključ">
          {formaKljuc && (
            <KljucForma C={C} forma={formaKljuc} setForma={setFormaKljuc}
              onSave={snimiKljuc} onCancel={() => setFormaKljuc(null)} />
          )}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <TableHead C={C} cols={["NAZIV", "SN", "VENDOR", "STANICA", "LOKACIJA", ""]}
              widths="1fr 90px 80px 70px 1fr 52px" />
            {kljucevi.map((m, i) => (
              <TableRow key={m.id} C={C} i={i} cols={[
                m.naziv,
                m.serijski_broj || "—",
                m.vendor_profil || "—",
                m.linija_stanica || "—",
                m.lokacija || "—",
                <RowActions key="a" C={C} onEdit={() => setFormaKljuc({ ...m })} />,
              ]} widths="1fr 90px 80px 70px 1fr 52px" />
            ))}
          </div>
        </CrudShell>
      )}
      {zoomCrtez && crtezUrl && (
        <CrtezSplitModal
          url={crtezUrl}
          C={C}
          onClose={() => setZoomCrtez(false)}
          title={detalj?.job ? `${detalj.job.kod_job} — dijagram` : "Dijagram JOB"}
        />
      )}
    </div>
  );
}

function JobForma({ C, forma, setForma, delovi, onSave, onCancel }) {
  const INP = inpStyle(C);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ fontSize: 10, color: C.sivi }}>ID deo *
          <input list="moment-delovi" value={forma.id_deo}
            onChange={(e) => setForma((p) => ({ ...p, id_deo: e.target.value.toUpperCase() }))} style={INP} />
          <datalist id="moment-delovi">
            {delovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
          </datalist>
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>Kod JOB *
          <input value={forma.kod_job} onChange={(e) => setForma((p) => ({ ...p, kod_job: e.target.value }))} style={INP} />
        </label>
        <label style={{ fontSize: 10, color: C.sivi, gridColumn: "1 / -1" }}>Naziv *
          <input value={forma.naziv} onChange={(e) => setForma((p) => ({ ...p, naziv: e.target.value }))} style={INP} />
        </label>
        {[
          ["Operacija", "operacija"], ["Tip vozila", "tip_vozila"], ["Linija", "linija"], ["Revizija", "revizija"],
        ].map(([l, k]) => (
          <label key={k} style={{ fontSize: 10, color: C.sivi }}>{l}
            <input value={forma[k] || ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
          </label>
        ))}
        <label style={{ fontSize: 10, color: C.sivi }}>Vendor profil
          <select value={forma.vendor_profil || ""} onChange={(e) => setForma((p) => ({ ...p, vendor_profil: e.target.value }))} style={INP}>
            {VENDORI.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onSave} style={btnStyle(C, C.zelena)}>Sačuvaj</button>
        <button type="button" onClick={onCancel} style={btnStyle(C, C.sivi)}>Otkaži</button>
      </div>
    </div>
  );
}

function KorakPanel({ C, detalj, izabraniJobId, formaKorak, setFormaKorak, onAdd, onSave, onDelete, addToast }) {
  if (!izabraniJobId) {
    return <div style={{ color: C.sivi, fontSize: 11, padding: 20 }}>Izaberite JOB u tabu „JOB-ovi“.</div>;
  }
  const koraci = detalj?.koraci || [];
  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
        {detalj?.job?.kod_job} · {detalj?.job?.id_deo} — {koraci.length} koraka
      </div>
      <button type="button" onClick={onAdd} style={{ ...btnStyle(C, C.zelena), marginBottom: 10 }}>+ Korak</button>
      {formaKorak && (
        <KorakForma
          C={C}
          idDeo={detalj?.job?.id_deo}
          forma={formaKorak}
          setForma={setFormaKorak}
          onSave={onSave}
          onCancel={() => setFormaKorak(null)}
        />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <TableHead C={C} cols={["#", "POZ", "PROL", "TIP", "CILJ Nm", "TOL", "KLASA", ""]}
          widths="36px 48px 40px 72px 72px 100px 48px 44px" />
        {koraci.map((k, i) => (
          <TableRow key={k.id} C={C} i={i} cols={[
            k.redosled,
            k.poz_br || "—",
            k.prolaz,
            k.tip,
            k.cilj_nm ?? "—",
            k.tol_min != null ? `${k.tol_min}–${k.tol_max}` : "—",
            <span key="k" style={{ color: k.klasifikacija === "VSK" ? C.crvena : k.klasifikacija === "KSK" ? C.zuta : C.sivi }}>{k.klasifikacija}</span>,
            <RowActions key="a" C={C}
              onEdit={() => setFormaKorak({ ...k })}
              onDelete={async () => {
                if (!window.confirm("Obrisati korak?")) return;
                try { await onDelete(k.id); } catch (e) { addToast?.(e.message, "greska"); }
              }} />,
          ]} widths="36px 48px 40px 72px 72px 100px 48px 44px" />
        ))}
      </div>
    </div>
  );
}

function KorakForma({ C, idDeo, forma, setForma, onSave, onCancel }) {
  const INP = inpStyle(C);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          ["Redosled", "redosled", "number"], ["Poz. br.", "poz_br", "text"], ["Prolaz", "prolaz", "number"],
          ["Tip", "tip", "select"], ["Cilj Nm", "cilj_nm", "number"], ["Tol min", "tol_min", "number"],
          ["Tol max", "tol_max", "number"], ["Ugao °", "ugao_cilj", "number"], ["Ugao tol", "ugao_tol", "number"],
          ["Klasa", "klasifikacija", "select"], ["Varijanta", "varijanta", "text"],
          ["Torque ID", "torque_id", "text"], ["PFMEA veza", "pfmea_veza", "text"],
        ].map(([l, k, t]) => (
          <label key={k} style={{ fontSize: 9, color: C.sivi }}>{l}
            {t === "select" && k === "tip" ? (
              <select value={forma[k]} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP}>
                {TIPOVI.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : t === "select" ? (
              <select value={forma[k]} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP}>
                {KLASE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input type={t} value={forma[k] ?? ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
            )}
          </label>
        ))}
      </div>
      <MomentPfmeaOblaciciRed C={C} ids={["VSK", "KSK", "STD"]} kompakt naslov="KLASIFIKACIJA" />
      <MomentPfmeaKalkulator
        C={C}
        onPredlog={(klasa) => setForma((p) => ({ ...p, klasifikacija: klasa }))}
      />
      <MomentPfmeaCpPicker
        C={C}
        idDeo={idDeo}
        vrednosti={forma}
        kompakt
        onPrimeni={(polja) => setForma((p) => ({ ...p, ...polja }))}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onSave} style={btnStyle(C, C.zelena)}>Sačuvaj</button>
        <button type="button" onClick={onCancel} style={btnStyle(C, C.sivi)}>Otkaži</button>
      </div>
    </div>
  );
}

function PozicijaPanel({ C, detalj, izabraniJobId, formaPoz, setFormaPoz, onAdd, onSave, onDelete }) {
  if (!izabraniJobId) {
    return <div style={{ color: C.sivi, fontSize: 11, padding: 20 }}>Izaberite JOB u tabu „JOB-ovi“.</div>;
  }
  const poz = detalj?.pozicije || [];
  const INP = inpStyle(C);
  return (
    <div>
      <button type="button" onClick={onAdd} style={{ ...btnStyle(C, C.zelena), marginBottom: 10 }}>+ Pozicija</button>
      {formaPoz && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: 8 }}>
            <input placeholder="Poz. br." value={formaPoz.poz_br} onChange={(e) => setFormaPoz((p) => ({ ...p, poz_br: e.target.value }))} style={INP} />
            <input placeholder="Opis" value={formaPoz.opis || ""} onChange={(e) => setFormaPoz((p) => ({ ...p, opis: e.target.value }))} style={INP} />
            <select value={formaPoz.klasifikacija || "STD"} onChange={(e) => setFormaPoz((p) => ({ ...p, klasifikacija: e.target.value }))} style={INP}>
              {KLASE.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onSave} style={btnStyle(C, C.zelena)}>Sačuvaj</button>
            <button type="button" onClick={() => setFormaPoz(null)} style={btnStyle(C, C.sivi)}>Otkaži</button>
          </div>
        </div>
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <TableHead C={C} cols={["POZ", "OPIS", "KLASA", ""]} widths="56px 1fr 56px 44px" />
        {poz.map((p, i) => (
          <TableRow key={p.id} C={C} i={i} cols={[
            p.poz_br, p.opis || "—", p.klasifikacija || "—",
            <RowActions key="a" C={C} onEdit={() => setFormaPoz({ ...p })}
              onDelete={async () => { if (window.confirm("Obrisati?")) await onDelete(p.id); }} />,
          ]} widths="56px 1fr 56px 44px" />
        ))}
      </div>
    </div>
  );
}

function KljucForma({ C, forma, setForma, onSave, onCancel }) {
  const INP = inpStyle(C);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["Naziv *", "naziv"], ["Serijski broj", "serijski_broj"], ["Stanica", "linija_stanica"], ["Lokacija", "lokacija"],
        ].map(([l, k]) => (
          <label key={k} style={{ fontSize: 10, color: C.sivi }}>{l}
            <input value={forma[k] || ""} onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
          </label>
        ))}
        <label style={{ fontSize: 10, color: C.sivi }}>Vendor
          <select value={forma.vendor_profil || ""} onChange={(e) => setForma((p) => ({ ...p, vendor_profil: e.target.value }))} style={INP}>
            {VENDORI.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onSave} style={btnStyle(C, C.zelena)}>Sačuvaj</button>
        <button type="button" onClick={onCancel} style={btnStyle(C, C.sivi)}>Otkaži</button>
      </div>
    </div>
  );
}
