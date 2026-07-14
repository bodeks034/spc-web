/**
 * Jedan inženjerski list — kao Osnovni unos: forma iznad, lista ispod, dijagram u formi.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchDeloviListaZaRn } from "../../lib/sifrarnikApi.js";
import {
  parseMomentListTekst,
  normalizujMomentListRed,
} from "../../lib/momentKljucList.js";
import { MOMENT_VENDOR_NAZIV } from "../../lib/momentKljuc.js";
import {
  ucitajMomentListuIzBaze,
  snimiMomentListu,
  osigurajMomentToolMaster,
} from "../../lib/momentKljucListApi.js";
import { ucitajMomentXlsx, izveziMomentListSablon } from "../../lib/momentKljucXlsx.js";
import { lokalnaPutanjaMomentDijagram } from "../../lib/crtezAssets.js";
import CrtezSplitModal from "../CrtezSplitModal.jsx";
import { hotspotZaPoz, viewBoxDijagrama } from "../../lib/momentDijagramHotspot.js";
import { FormGrid } from "./LinijePanel.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
import {
  MomentPfmeaOblaciciRed,
  MomentPfmeaKalkulator,
} from "../moment/MomentPfmeaOblacic.jsx";
import MomentPfmeaCpPicker from "../moment/MomentPfmeaCpPicker.jsx";
import MomentDijagramPregled from "../moment/MomentDijagramPregled.jsx";
import { validirajMomentListu, validirajMomentRedPremaDijagramu } from "../../lib/momentDijagramValidacija.js";

const MOMENT_DIJAGRAMI = [
  "Sklop_01_Motor.svg",
  "Sklop_02_Menjac_Transfer_Case.svg",
  "Sklop_03_Osovine_Vesanje.svg",
  "Sklop_04_Kocnice.svg",
  "Sklop_05_Tockovi.svg",
  "Sklop_06_Upravljanje.svg",
  "Sklop_07_Karoserija_Sasija.svg",
];

const GRID_KOLONE = [
  ["id_deo", "ID DEO", 96],
  ["kod_job", "JOB", 72],
  ["naziv_job", "NAZIV", 120],
  ["operacija", "OP.", 72],
  ["redosled", "KOR", 40],
  ["poz_br", "POZ", 40],
  ["cilj_nm", "Nm", 48],
  ["tool_kod", "ALAT", 48],
  ["klasifikacija", "VSK", 40],
  ["dijagram", "DIJ.", 100],
];

const FORM_ZAGLAVLJE = [
  ["ID deo *", "id_deo"],
  ["JOB *", "kod_job"],
  ["Naziv JOB", "naziv_job"],
  ["Operacija", "operacija"],
  ["Vendor profil", "vendor_profil"],
  ["Sekvenca šablon", "sekvenca_sablon"],
  ["Dijagram (SVG)", "dijagram"],
];

const FORM_KORAK = [
  ["Korak #", "redosled"],
  ["Prolaz", "prolaz"],
  ["Poz. br.", "poz_br"],
  ["Opis pozicije", "poz_opis"],
  ["Sklop", "sklop"],
  ["Vijak", "vijak"],
  ["Klasa vijka", "klasa_vijka"],
  ["Cilj Nm *", "cilj_nm"],
  ["Tol min", "tol_min"],
  ["Tol max", "tol_max"],
  ["Tol %", "tol_pct"],
  ["Ugao °", "ugao_cilj"],
  ["± Ugao", "ugao_tol"],
  ["Tip", "tip"],
  ["Klasifikacija", "klasifikacija"],
  ["Alat (TK)", "tool_kod"],
  ["Program", "program_kod"],
  ["Torque ID", "torque_id"],
  ["PFMEA veza", "pfmea_veza"],
  ["Napomena", "napomena"],
];

const VENDOR_OPCIJE = Object.entries(MOMENT_VENDOR_NAZIV).map(([value, label]) => ({ value, label }));
const TIP_OPCIJE = ["NM", "NM_UGAO", "STAGED"].map((v) => ({ value: v, label: v }));
const KLASA_OPCIJE = ["VSK", "KSK", "STD"].map((v) => ({ value: v, label: v }));

const FIELD_META_KORAK = {
  tip: { type: "select", opcijeKey: "tip" },
  klasifikacija: { type: "select", opcijeKey: "klasa" },
};

function prikazVrednosti(red, key) {
  const v = red?.[key];
  if (v == null || v === "") return "—";
  return String(v);
}

const PRAZAN_RED = (idx = 0, sablon = {}) => normalizujMomentListRed({
  id_deo: "",
  kod_job: "",
  naziv_job: "",
  operacija: "MON-FINAL",
  redosled: idx + 1,
  prolaz: 1,
  poz_br: String(idx + 1),
  tip: "NM",
  klasifikacija: "VSK",
  vendor_profil: "atlas",
  ...sablon,
}, idx);

/** Dijagram polje — pregled + zoom + highlight pozicije. */
function MomentDijagramPolje({ C, label, value, onChange, pozBr }) {
  const INP = inpStyle(C);
  const [zoom, setZoom] = useState(false);
  const url = value?.trim() ? lokalnaPutanjaMomentDijagram(value.trim()) : null;
  const dijagramIme = value?.trim() || null;
  const tacke = dijagramIme && pozBr ? hotspotZaPoz(dijagramIme, pozBr) : [];
  const vb = dijagramIme ? viewBoxDijagrama(dijagramIme) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: "1 / -1" }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        <input
          list="moment-dijagrami-list"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="npr. Sklop_05_Tockovi.svg"
          style={{ ...INP, flex: 1, minWidth: 200 }}
        />
        <datalist id="moment-dijagrami-list">
          {MOMENT_DIJAGRAMI.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>
      {url && (
        <div style={{ marginTop: 4 }}>
          <MomentDijagramPregled
            C={C}
            dijagram={value?.trim()}
            pozBr={pozBr}
            maxHeight={140}
            kompakt
            onZoom={() => setZoom(true)}
          />
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 4 }}>
            Klik ili 🔍 — ceo ekran · točkić miša — uvećaj pregled
          </div>
        </div>
      )}
      {zoom && url && (
        <CrtezSplitModal
          fullscreen
          url={url}
          C={C}
          onClose={() => setZoom(false)}
          title={pozBr ? `Dijagram — poz. ${pozBr}` : "Dijagram sklopa"}
          hotspotTacke={tacke}
          viewBox={vb}
        />
      )}
    </div>
  );
}

function MomentKljucRedForma({
  C, forma, setForma, delovi, onSave, onSaveNext, onCancel, idx,
}) {
  const INP = inpStyle(C);

  const korakPanel = (
    <>
      <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
        KORAK ZATEZANJA
      </div>
      <FormGrid
        C={C}
        cols={3}
        forma={forma}
        setForma={setForma}
        fields={FORM_KORAK}
        fieldMeta={FIELD_META_KORAK}
        opcije={{ vendor: VENDOR_OPCIJE, tip: TIP_OPCIJE, klasa: KLASA_OPCIJE }}
        onSave={() => {}}
        onCancel={onCancel}
        snima={false}
        hideActions
      />
    </>
  );

  const renderZaglavljePolje = ([label, key]) => {
    if (key === "dijagram") {
      return (
        <MomentDijagramPolje
          key={key}
          C={C}
          label={label}
          value={forma.dijagram}
          pozBr={forma.poz_br}
          onChange={(v) => setForma((p) => ({ ...p, dijagram: v }))}
        />
      );
    }
    if (key === "vendor_profil") {
      return (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
          <select
            value={forma.vendor_profil || "atlas"}
            onChange={(e) => setForma((p) => ({ ...p, vendor_profil: e.target.value }))}
            style={{ ...INP, cursor: "pointer" }}
          >
            {VENDOR_OPCIJE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    }
    if (key === "id_deo") {
      return (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
          <input
            list="moment-form-delovi"
            value={forma.id_deo ?? ""}
            onChange={(e) => setForma((p) => ({ ...p, id_deo: e.target.value.toUpperCase() }))}
            style={INP}
          />
          <datalist id="moment-form-delovi">
            {delovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
          </datalist>
        </label>
      );
    }
    return (
      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
        <input
          value={forma[key] ?? ""}
          onChange={(e) => setForma((p) => ({ ...p, [key]: e.target.value }))}
          style={INP}
        />
      </label>
    );
  };

  return (
    <div style={{
      background: C.panel,
      border: `2px solid ${C.zelena || "#22c55e"}66`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>
            {idx != null ? `Uređivanje reda ${idx + 1}` : "Novi korak"}
            {forma.kod_job ? ` · ${forma.kod_job}` : ""}
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.45 }}>
            Popuni JOB zaglavlje i korak zatezanja. Dijagram se vidi ispod polja — kao u Osnovnom unosu.
          </div>
        </div>
        {forma.id_deo && (
          <span style={{ fontSize: 10, color: C.plava, fontWeight: 700 }}>{forma.id_deo}</span>
        )}
      </div>

      <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
        ZAGLAVLJE JOB
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
        {FORM_ZAGLAVLJE.map(renderZaglavljePolje)}
      </div>

      <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, margin: "4px 0 6px" }}>
        KORAK ZATEZANJA
      </div>
      <FormGrid
        C={C}
        cols={3}
        forma={forma}
        setForma={setForma}
        fields={FORM_KORAK}
        fieldMeta={FIELD_META_KORAK}
        opcije={{ vendor: VENDOR_OPCIJE, tip: TIP_OPCIJE, klasa: KLASA_OPCIJE }}
        onSave={onSave}
        onCancel={onCancel}
        snima={false}
        secondaryAction={onSaveNext ? {
          label: "Sačuvaj + još korak",
          onClick: onSaveNext,
        } : null}
      />
      <MomentPfmeaOblaciciRed
        C={C}
        ids={["VSK", "KSK", "STD"]}
        kompakt
        naslov="KLASIFIKACIJA SPOJA (QS-TRQ-001)"
      />
      <MomentPfmeaKalkulator
        C={C}
        s={forma.pfmea_s}
        o={forma.pfmea_o}
        d={forma.pfmea_d}
        onPredlog={(klasa) => setForma((p) => ({ ...p, klasifikacija: klasa }))}
      />
      <MomentPfmeaCpPicker
        C={C}
        idDeo={forma.id_deo}
        vrednosti={forma}
        onPrimeni={(polja) => setForma((p) => ({
          ...p,
          ...polja,
          cilj_nm: polja.cilj_nm ?? p.cilj_nm,
          tol_min: polja.tol_min ?? p.tol_min,
          tol_max: polja.tol_max ?? p.tol_max,
        }))}
      />
      {forma.dijagram && forma.poz_br && validirajMomentRedPremaDijagramu(forma).length > 0 && (
        <div style={{
          marginTop: 8, padding: 8, background: `${C.zuta}15`, border: `1px solid ${C.zuta}55`,
          borderRadius: 6, fontSize: 9, color: C.tekst, lineHeight: 1.4,
        }}
        >
          {validirajMomentRedPremaDijagramu(forma).map((w) => <div key={w}>⚠ {w}</div>)}
        </div>
      )}
    </div>
  );
}

export default function MomentKljucListPanel({ C, addToast }) {
  const [redovi, setRedovi] = useState([]);
  const [filterDeo, setFilterDeo] = useState("");
  const [loading, setLoading] = useState(true);
  const [snima, setSnima] = useState(false);
  const [zameni, setZameni] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pasteTekst, setPasteTekst] = useState("");
  const [delovi, setDelovi] = useState([]);
  const [formaIdx, setFormaIdx] = useState(null);
  const [formaNova, setFormaNova] = useState(false);
  const fileRef = useRef(null);
  const INP = inpStyle(C);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await ucitajMomentListuIzBaze(supabase, {
        idDeo: filterDeo.trim() || null,
      });
      setRedovi(lista);
      setDirty(false);
      setFormaIdx(null);
      setFormaNova(false);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [filterDeo, addToast]);

  useEffect(() => {
    fetchDeloviListaZaRn().then(setDelovi).catch(() => setDelovi([]));
  }, []);

  useEffect(() => {
    ucitaj();
  }, [filterDeo]); // eslint-disable-line react-hooks/exhaustive-deps

  const forma = formaIdx != null ? redovi[formaIdx] : null;

  const izmeniFormu = (f) => {
    setRedovi((prev) => {
      const novi = [...prev];
      const trenutni = novi[formaIdx];
      const row = typeof f === "function" ? f(trenutni) : f;
      novi[formaIdx] = normalizujMomentListRed(row, formaIdx);
      return novi;
    });
    setDirty(true);
  };

  const otvoriNovi = () => {
    const poslednji = redovi[redovi.length - 1];
    const noviIdx = redovi.length;
    const novi = PRAZAN_RED(noviIdx, poslednji ? {
      id_deo: poslednji.id_deo || "",
      kod_job: poslednji.kod_job || "",
      naziv_job: poslednji.naziv_job || "",
      operacija: poslednji.operacija || "MON-FINAL",
      vendor_profil: poslednji.vendor_profil || "atlas",
      dijagram: poslednji.dijagram || "",
      sekvenca_sablon: poslednji.sekvenca_sablon || "",
      redosled: (Number(poslednji.redosled) || redovi.length) + 1,
      poz_br: String((Number(poslednji.poz_br) || redovi.length) + 1),
    } : {});
    setRedovi((prev) => [...prev, novi]);
    setFormaIdx(noviIdx);
    setFormaNova(true);
    setDirty(true);
  };

  const otvoriUredi = (idx) => {
    setFormaIdx(idx);
    setFormaNova(false);
  };

  const zatvoriFormu = () => {
    if (formaNova && formaIdx != null) {
      setRedovi((prev) => prev.filter((_, i) => i !== formaIdx));
    }
    setFormaIdx(null);
    setFormaNova(false);
  };

  const snimiFormu = (josJedan = false) => {
    if (!forma?.id_deo?.trim() || !forma?.kod_job?.trim()) {
      addToast?.("ID deo i JOB su obavezni", "greska");
      return;
    }
    if (forma.cilj_nm == null || forma.cilj_nm === "") {
      addToast?.("Cilj Nm je obavezan", "greska");
      return;
    }
    setRedovi((prev) => {
      const novi = [...prev];
      novi[formaIdx] = normalizujMomentListRed(novi[formaIdx], formaIdx);
      if (josJedan) {
        const poslednji = novi[formaIdx];
        const sledeciIdx = novi.length;
        novi.push(PRAZAN_RED(sledeciIdx, {
          id_deo: poslednji.id_deo,
          kod_job: poslednji.kod_job,
          naziv_job: poslednji.naziv_job,
          operacija: poslednji.operacija,
          vendor_profil: poslednji.vendor_profil,
          dijagram: poslednji.dijagram,
          sekvenca_sablon: poslednji.sekvenca_sablon,
          redosled: (Number(poslednji.redosled) || sledeciIdx) + 1,
          poz_br: String((Number(poslednji.poz_br) || sledeciIdx) + 1),
        }));
        setFormaIdx(sledeciIdx);
        setFormaNova(true);
      } else {
        setFormaIdx(null);
        setFormaNova(false);
      }
      return novi;
    });
    setDirty(true);
    if (!josJedan) addToast?.("✓ Red u listi — klikni „Sačuvaj i rasporedi“ za bazu", "uspeh");
  };

  const obrisiRed = (idx) => {
    if (!window.confirm("Obrisati red?")) return;
    setRedovi((prev) => prev.filter((_, i) => i !== idx));
    if (formaIdx === idx) {
      setFormaIdx(null);
      setFormaNova(false);
    } else if (formaIdx != null && formaIdx > idx) {
      setFormaIdx(formaIdx - 1);
    }
    setDirty(true);
  };

  const primeniPaste = () => {
    const parsed = parseMomentListTekst(pasteTekst);
    if (!parsed.length) {
      addToast?.("Nema prepoznatih redova", "greska");
      return;
    }
    const { upozorenja } = validirajMomentListu(parsed);
    if (upozorenja.length) {
      addToast?.(`Uvezeno ${parsed.length} — ${upozorenja.length} upozorenja vs dijagram`, "greska");
    }
    setRedovi(parsed);
    setFormaIdx(null);
    setDirty(true);
    setPasteTekst("");
    addToast?.(`✓ Uvezeno ${parsed.length} redova`, "uspeh");
  };

  const ucitajXlsx = async (file) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsed = ucitajMomentXlsx(buf);
      if (!parsed.length) {
        addToast?.("Excel nema prepoznatih redova", "greska");
        return;
      }
      setRedovi(parsed);
      setFormaIdx(null);
      setDirty(true);
      addToast?.(`✓ Učitano ${parsed.length} redova`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const sacuvaj = async () => {
    if (!redovi.length) {
      addToast?.("Lista je prazna", "greska");
      return;
    }
    const { upozorenja } = validirajMomentListu(redovi);
    if (upozorenja.length) {
      const prikaz = upozorenja.slice(0, 4).join("\n");
      const nastavi = window.confirm(
        `Upozorenja u odnosu na legendu dijagrama (${upozorenja.length}):\n\n${prikaz}`
        + `${upozorenja.length > 4 ? "\n…" : ""}\n\nSačuvati ipak?`,
      );
      if (!nastavi) return;
    }
    setSnima(true);
    try {
      const r = await snimiMomentListu(supabase, redovi, {
        zameniPostojece: zameni,
        idDeoFilter: filterDeo.trim() || null,
      });
      const g = r.greske.length
        ? ` · ${r.greske.length} grešaka: ${r.greske.slice(0, 2).join("; ")}`
        : "";
      addToast?.(
        `✓ Raspoređeno: ${r.jobovi} JOB · ${r.pozicije} poz · ${r.koraci} kor${g}`,
        r.greske.length ? "greska" : "uspeh",
      );
      setDirty(false);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const prikaz = useMemo(() => {
    if (!filterDeo.trim()) return redovi;
    const q = filterDeo.toUpperCase();
    return redovi.filter((r) => String(r.id_deo || "").includes(q));
  }, [redovi, filterDeo]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>JEDAN LIST — automatska distribucija</div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.5, maxWidth: 720 }}>
          Kao <strong>Osnovni unos</strong>: <strong>+ Red</strong> ili <strong>✎</strong> otvara formu sa poljima i dijagramom iznad liste.
          Na kraju klikni <strong>Sačuvaj i rasporedi</strong> za upis u bazu.
        </div>
        <div style={{ marginTop: 8 }}>
          <MomentPfmeaOblaciciRed C={C} kompakt />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          list="moment-list-delovi"
          value={filterDeo}
          onChange={(e) => setFilterDeo(e.target.value.toUpperCase())}
          placeholder="Filter ID deo"
          style={{ ...INP, maxWidth: 160 }}
        />
        <datalist id="moment-list-delovi">
          {delovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
        </datalist>
        <span style={{ color: C.sivi, fontSize: 10 }}>
          {loading ? "Učitavanje…" : `${prikaz.length} / ${redovi.length} redova`}
          {dirty ? " · nesačuvano" : ""}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => ucitaj()} disabled={loading} style={btnStyle(C, C.plava)}>
          ↻ Osveži
        </button>
        <button type="button" onClick={() => izveziMomentListSablon(redovi)} style={btnStyle(C, C.sivi)}>
          📥 Šablon
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} style={btnStyle(C, C.plava)}>
          📂 Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
          onChange={(e) => { ucitajXlsx(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => osigurajMomentToolMaster(supabase).then((n) => addToast?.(`TK: ${n} novih`, "uspeh"))} style={btnStyle(C, C.sivi)}>
          TK alati
        </button>
        <button type="button" onClick={otvoriNovi} style={btnStyle(C, C.zelena)}>+ Red</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi }}>
          <input type="checkbox" checked={zameni} onChange={(e) => setZameni(e.target.checked)} />
          Zameni postojeće
        </label>
        <button type="button" disabled={snima || !dirty} onClick={sacuvaj} style={btnStyle(C, C.zelena, { disabled: snima || !dirty })}>
          {snima ? "Čuvam…" : "💾 Sačuvaj i rasporedi"}
        </button>
      </div>

      <details style={{ marginBottom: 10, fontSize: 10, color: C.sivi }}>
        <summary style={{ cursor: "pointer", color: C.plava }}>Nalepi iz Excela</summary>
        <textarea value={pasteTekst} onChange={(e) => setPasteTekst(e.target.value)} rows={3}
          style={{ ...INP, width: "100%", marginTop: 8, fontFamily: "monospace", fontSize: 10 }} />
        <button type="button" onClick={primeniPaste} style={{ ...btnStyle(C, C.plava), marginTop: 6 }}>Primeni</button>
      </details>

      {forma && formaIdx != null && (
        <MomentKljucRedForma
          C={C}
          forma={forma}
          setForma={izmeniFormu}
          delovi={delovi}
          idx={formaIdx}
          onSave={() => snimiFormu(false)}
          onSaveNext={() => snimiFormu(true)}
          onCancel={zatvoriFormu}
        />
      )}

      <div style={{ flex: 1, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: "min(50vh, 400px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: C.panel, position: "sticky", top: 0, zIndex: 1 }}>
              {GRID_KOLONE.map(([, label, w]) => (
                <th key={label} style={{
                  textAlign: "left", padding: "6px 8px", color: C.sivi, fontWeight: 700,
                  minWidth: w, borderBottom: `1px solid ${C.border}`,
                }}
                >
                  {label}
                </th>
              ))}
              <th style={{ width: 88, borderBottom: `1px solid ${C.border}` }} />
            </tr>
          </thead>
          <tbody>
            {prikaz.length === 0 && !loading && (
              <tr>
                <td colSpan={GRID_KOLONE.length + 1} style={{ padding: 24, textAlign: "center", color: C.sivi }}>
                  Nema redova — klikni <strong style={{ color: C.zelena }}>+ Red</strong>
                </td>
              </tr>
            )}
            {prikaz.map((r) => {
              const idx = redovi.indexOf(r);
              const aktivan = formaIdx === idx;
              return (
                <tr
                  key={`${idx}-${r.id_deo}-${r.kod_job}-${r.redosled}`}
                  style={{
                    background: aktivan ? `${C.zelena}18` : (idx % 2 ? "transparent" : `${C.hover}30`),
                  }}
                >
                  {GRID_KOLONE.map(([k]) => (
                    <td key={k} style={{
                      padding: "5px 8px", color: C.tekst,
                      borderBottom: `1px solid ${C.border}44`,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
                    }}
                    >
                      {prikazVrednosti(r, k)}
                    </td>
                  ))}
                  <td style={{ padding: "4px 6px", borderBottom: `1px solid ${C.border}44`, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => otvoriUredi(idx)}
                      style={{ ...INP, padding: "2px 8px", fontSize: 9, cursor: "pointer", marginRight: 4, color: C.plava }}>
                      ✎
                    </button>
                    <button type="button" onClick={() => obrisiRed(idx)}
                      style={{ ...INP, padding: "2px 8px", fontSize: 9, cursor: "pointer", color: C.crvena }}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
