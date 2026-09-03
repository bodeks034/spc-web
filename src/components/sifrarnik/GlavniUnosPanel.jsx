import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchGlavniUnosSheetovi,
  fetchGlavniUnosSheetKonfiguracije,
  kreirajGlavniUnosSheet,
  fetchGlavniUnosRedovi,
  fetchSheetMaxUpdatedAt,
  zameniSheetRedove,
  propagirajGlavniUnos,
  propagirajMerljiviDeo,
  ucitajWorkbookIzFajla,
  parsirajWorkbookZaUvoz,
  upsertPogonLinijaMapa,
  klonirajDeoUGlavniUnos,
} from "../../lib/glavniUnosApi.js";
import { GLAVNI_UNOS_COL_BROJ_MERENJA, GLAVNI_UNOS_BROJ_MERENJA_DEFAULT } from "../../lib/glavniUnosCore.js";
import { FormGrid } from "./LinijePanel.jsx";
import GlavniUnosGrupnaForma from "./GlavniUnosGrupnaForma.jsx";
import GlavniUnosChecklistPanel from "./GlavniUnosChecklistPanel.jsx";
import NoviDeoWizard from "./NoviDeoWizard.jsx";
import GlavniUnosSheetBirac from "./GlavniUnosSheetBirac.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
import { validirajRedovePrePropagacije } from "../../lib/glavniUnosValidacija.js";
import { dodajSablonGresaka } from "../../lib/greskaSablon.js";
import { zavrsiSifrarnikOnboarding } from "../../lib/sifrarnikOnboarding.js";
import { previewPropagacije } from "../../lib/sifrarnikPropagacijaPreview.js";
import { obavestiPromenuStatusaSifrarnika } from "../../lib/sifrarnikStatusEvent.js";
import { sacuvajGuUndoSnapshot, ucitajGuUndoSnapshot, obrisiGuUndoSnapshot, preostaloUndoMs, formatUndoPreostalo, labelGuUndo } from "../../lib/guXlsxUndo.js";
import { useSifrarnikOpcije } from "./useSifrarnikOpcije.js";
import {
  stampAuditPolja,
  stampAuditNaIzmenu,
  dopuniOpcijeIzRedova,
  GLAVNI_UNOS_OPCIJE_MAPA,
} from "../../lib/sifrarnikOpcije.js";
import {
  granicaZaSnimanje,
  granicaZaPrikaz,
} from "../../lib/glavniUnosGranice.js";
import { jePunIdDeo, normalizujIdDeo } from "../../lib/idDeoUtil.js";
import { idDeoviIzKonteksta } from "../../lib/sifrarnikRadniTok.js";
import {
  brojDimenzijaZaDeo,
  nadjiSablonZaDeo,
  novaDimenzijaRed,
  primeniSablonNaRed,
} from "../../lib/glavniUnosRedSablon.js";
import {
  GLAVNI_UNOS_SHEET_TIP,
  analizaSheeta,
} from "../../lib/glavniUnosSheetTip.js";
import { fetchTipoviVozila } from "../../lib/sifrarnikApi.js";
import { sheetRadneLinije } from "../../lib/sifrarnikRadnaLinija.js";

const DEFAULT_SHEETS = ["vozilo1", "vozilo2", "vozilo3", "vozilo6"];

const PRAZAN_RED = {
  id_deo: "",
  datum: "",
  broj_crteza: "",
  radni_nalog: "",
  kupac: "",
  naziv_dela: "",
  slika: "",
  linija: "",
  operacija: "",
  masina_id: "",
  ukupno_kom: "",
  kom_za_kontrolu_n: "",
  karakteristika: "",
  klasa: "",
  nominal: "",
  usl: "",
  lsl: "",
  jedinica: "mm",
  tip: "Merljiva",
  instrument: "",
  kontolor: "",
  nivo_kontrole_fac: "",
  fac_broj: "",
  spc_broj_merenja: GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
  podatke_uneo: "",
};

const FORM_ZAGLAVLJE = [
  ["ID deo *", "id_deo"],
  ["Radni nalog", "radni_nalog"],
  ["Kupac", "kupac"],
  ["Naziv dela", "naziv_dela"],
  ["Broj crteža", "broj_crteza"],
  ["Linija", "linija"],
  ["Operacija", "operacija"],
  ["Mašina ID", "masina_id"],
  ["Ukupno kom", "ukupno_kom"],
  ["Kom za kontrolu n", "kom_za_kontrolu_n"],
  ["Kontolor", "kontolor"],
  ["Nivo kontrole FAC", "nivo_kontrole_fac"],
  ["Slika", "slika"],
];

const FORM_DIMENZIJA = [
  ["Karakteristika *", "karakteristika"],
  ["Tip", "tip"],
  ["Klasa", "klasa"],
  ["Jedinica", "jedinica"],
  ["Nominal", "nominal"],
  ["USL", "usl"],
  ["LSL", "lsl"],
  ["Instrument", "instrument"],
  ["FAC broj", "fac_broj"],
  [GLAVNI_UNOS_COL_BROJ_MERENJA, "spc_broj_merenja"],
  ["Datum", "datum"],
  ["Podatke uneo", "podatke_uneo"],
];

const FIELD_META = {
  linija: { type: "select", opcijeKey: "linija" },
  operacija: { type: "operacija" },
  masina_id: { type: "masina" },
  karakteristika: { type: "datalist", opcijeKey: "karakteristika", placeholder: "Upiši npr. Dužina…" },
  jedinica: { type: "select", opcijeKey: "jedinica" },
  instrument: { type: "datalist", opcijeKey: "instrument", placeholder: "Upiši npr. Metar ili izaberi…" },
  tip: { type: "select", opcijeKey: "tip" },
  klasa: { type: "select", opcijeKey: "klasa" },
  kupac: { type: "datalist", opcijeKey: "kupac", placeholder: "Npr. Lokalni servis — dodaje se u Kupci" },
  spc_broj_merenja: { hint: `Podrazumevano ${GLAVNI_UNOS_BROJ_MERENJA_DEFAULT} za merljive — promeni po potrebi` },
  nominal: { type: "granica" },
  usl: { type: "granica" },
  lsl: { type: "granica" },
  slika: { type: "slika", modul: "merljive" },
  datum: { readOnly: true, hint: "Datum poslednjeg unosa/izmene" },
  podatke_uneo: { readOnly: true, hint: "Automatski — prijavljeni korisnik" },
};

const GRID_KOLONE = [
  ["id_deo", "ID DEO", 90],
  ["radni_nalog", "RN", 100],
  ["kupac", "KUPAC", 90],
  ["naziv_dela", "NAZIV", 120],
  ["linija", "LINIJA", 110],
  ["karakteristika", "KARAKTERISTIKA", 160],
  ["tip", "TIP", 80],
  ["nominal", "NOM", 60],
  ["usl", "USL", 60],
  ["lsl", "LSL", 60],
  ["klasa", "KLASA", 60],
  ["spc_broj_merenja", "SPC n", 50],
];

function formatRedZaFormu(r) {
  const jed = r.jedinica || "mm";
  return {
    ...r,
    nominal: granicaZaPrikaz(r.nominal, jed),
    usl: granicaZaPrikaz(r.usl, jed),
    lsl: granicaZaPrikaz(r.lsl, jed),
  };
}

function normalizujRedZaSnimanje(r, sheetNaziv, redosled) {
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const jed = r.jedinica || "mm";
  const { id: _id, _postojeci, ...rest } = r;
  return {
    ...rest,
    sheet_naziv: sheetNaziv,
    redosled,
    id_deo: normalizujIdDeo(r.id_deo) || null,
    masina_id: num(r.masina_id),
    ukupno_kom: num(r.ukupno_kom),
    kom_za_kontrolu_n: num(r.kom_za_kontrolu_n),
    nominal: granicaZaSnimanje(r.nominal, jed),
    usl: granicaZaSnimanje(r.usl, jed),
    lsl: granicaZaSnimanje(r.lsl, jed),
    fac_broj: num(r.fac_broj),
    spc_broj_merenja: (() => {
      const n = num(r.spc_broj_merenja);
      if (n != null) return n;
      const tip = String(r.tip || "").toLowerCase();
      if (tip.includes("merljiv")) return GLAVNI_UNOS_BROJ_MERENJA_DEFAULT;
      return null;
    })(),
    kupac: String(r.kupac || "").trim() || null,
  };
}

function idDeoPoslePropagacije(redovi, filter) {
  const ids = idDeoviIzKonteksta(redovi, jePunIdDeo(filter) ? filter : "");
  if (ids.length === 1) return ids[0];
  return ids[ids.length - 1] || null;
}

function statusKontekstGu(redovi, filter, radnaLinija, akcija) {
  const ids = idDeoviIzKonteksta(redovi, jePunIdDeo(filter) ? filter : "");
  return {
    izvor: "glavni_unos",
    akcija,
    idDeo: ids[0] || null,
    idDeovi: ids,
    tab: "glavni_unos",
    linija: radnaLinija || "",
  };
}

export default function GlavniUnosPanel({ C, addToast, korisnik, onNavigate, navSignal, tipoviVozilaHub = [], radnaLinija = "", onDirtyChange }) {
  const { opcije: bazaOpcije } = useSifrarnikOpcije(addToast);
  const [sheetovi, setSheetovi] = useState(DEFAULT_SHEETS);
  const [sheetKonfiguracije, setSheetKonfiguracije] = useState([]);
  const [aktivniSheet, setAktivniSheet] = useState("vozilo1");
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snima, setSnima] = useState(false);
  const [propagira, setPropagira] = useState(false);
  const [formaIdx, setFormaIdx] = useState(null);
  const [grupnaOtvorena, setGrupnaOtvorena] = useState(false);
  const [grupnaFinalVozilo, setGrupnaFinalVozilo] = useState(false);
  const [grupniSablon, setGrupniSablon] = useState(null);
  const [filter, setFilter] = useState("");
  const [dirty, setDirty] = useState(false);
  const [checklistCtx, setChecklistCtx] = useState(null);
  const [wizardOtvoren, setWizardOtvoren] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [tipoviVozila, setTipoviVozila] = useState([]);
  const [sablonUcitava, setSablonUcitava] = useState(false);
  const [klonIzvor, setKlonIzvor] = useState("");
  const [klonCilj, setKlonCilj] = useState("");
  const [klonOtvoren, setKlonOtvoren] = useState(false);
  const [klonira, setKlonira] = useState(false);
  const [imaUndo, setImaUndo] = useState(() => !!ucitajGuUndoSnapshot());
  const [undoPreostalo, setUndoPreostalo] = useState(() => preostaloUndoMs(ucitajGuUndoSnapshot()));
  const [sheetRemoteStamp, setSheetRemoteStamp] = useState(null);
  const fileRef = useRef(null);
  const INP = inpStyle(C);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) sacuvajSheet({ propagirajPosle: false });
      }
      if (e.key === "Escape" && formaIdx != null) {
        setFormaIdx(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, formaIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!imaUndo) return undefined;
    const t = window.setInterval(() => {
      const snap = ucitajGuUndoSnapshot();
      if (!snap) {
        setImaUndo(false);
        setUndoPreostalo(0);
        return;
      }
      setUndoPreostalo(preostaloUndoMs(snap));
    }, 30000);
    return () => window.clearInterval(t);
  }, [imaUndo]);

  const opcije = bazaOpcije
    ? dopuniOpcijeIzRedova(bazaOpcije, redovi, GLAVNI_UNOS_OPCIJE_MAPA)
    : null;

  const ucitajSheetove = useCallback(async () => {
    try {
      const [s, konfiguracije] = await Promise.all([
        fetchGlavniUnosSheetovi(),
        fetchGlavniUnosSheetKonfiguracije(),
      ]);
      const merged = [...new Set([...DEFAULT_SHEETS, ...s])].sort();
      setSheetovi(merged);
      setSheetKonfiguracije(konfiguracije);
      if (!merged.includes(aktivniSheet)) setAktivniSheet(merged[0] || "vozilo1");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  }, [addToast, aktivniSheet]);

  const ucitajRedove = useCallback(async (sheet) => {
    setLoading(true);
    try {
      const [data, remoteStamp] = await Promise.all([
        fetchGlavniUnosRedovi(sheet),
        fetchSheetMaxUpdatedAt(sheet).catch(() => null),
      ]);
      setRedovi(data.map(formatRedZaFormu));
      setSheetRemoteStamp(remoteStamp);
      setDirty(false);
      setFormaIdx(null);
      setGrupnaOtvorena(false);
      setGrupnaFinalVozilo(false);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const proveriConcurrentEdit = async () => {
    if (!sheetRemoteStamp) return true;
    try {
      const trenutni = await fetchSheetMaxUpdatedAt(aktivniSheet);
      if (trenutni && trenutni !== sheetRemoteStamp) {
        return window.confirm(
          "Neko drugi je možda izmenio ovaj sheet u međuvremenu.\n\nNastaviti sa snimanjem (prepisuješ tuđe izmene)?",
        );
      }
    } catch {
      /* provera opciona */
    }
    return true;
  };

  useEffect(() => { ucitajSheetove(); }, [ucitajSheetove]);
  useEffect(() => { ucitajRedove(aktivniSheet); }, [aktivniSheet, ucitajRedove]);

  useEffect(() => {
    if (!radnaLinija || !sheetovi.length) return;
    const predlog = sheetRadneLinije(radnaLinija, "delovi");
    if (!predlog || !sheetovi.includes(predlog) || predlog === aktivniSheet) return;
    if (dirty && !window.confirm("Nesačuvane izmene — preći na sheet radne linije?")) return;
    setAktivniSheet(predlog);
  }, [radnaLinija, sheetovi]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setChecklistCtx(null);
  }, [aktivniSheet]);

  const [concurrentUpozorenje, setConcurrentUpozorenje] = useState(false);
  const [concurrentStamp, setConcurrentStamp] = useState(null);

  useEffect(() => {
    if (!dirty || !sheetRemoteStamp) {
      setConcurrentUpozorenje(false);
      setConcurrentStamp(null);
      return undefined;
    }
    const poll = async () => {
      try {
        const trenutni = await fetchSheetMaxUpdatedAt(aktivniSheet);
        const konflikt = !!(trenutni && trenutni !== sheetRemoteStamp);
        setConcurrentUpozorenje(konflikt);
        setConcurrentStamp(konflikt ? trenutni : null);
      } catch {
        /* polling opciono */
      }
    };
    poll();
    const t = window.setInterval(poll, 12000);
    return () => window.clearInterval(t);
  }, [dirty, sheetRemoteStamp, aktivniSheet]);

  const osveziSheetSaServera = async () => {
    if (dirty && !window.confirm("Odbaciti lokalne nesačuvane izmene i učitati sheet sa servera?")) {
      return;
    }
    await ucitajRedove(aktivniSheet);
    setDirty(false);
    setConcurrentUpozorenje(false);
    setConcurrentStamp(null);
    addToast?.("✓ Sheet osvežen sa servera", "uspeh");
  };

  useEffect(() => {
    if (tipoviVozilaHub.length) {
      setTipoviVozila(tipoviVozilaHub);
      return;
    }
    fetchTipoviVozila().then(setTipoviVozila).catch(() => setTipoviVozila([]));
  }, [tipoviVozilaHub]);

  useEffect(() => {
    if (!navSignal?.ts) return;
    if (navSignal.idDeo) {
      setFilter(navSignal.idDeo);
      setChecklistCtx(null);
    }
    if (navSignal.otvoriWizard) {
      setWizardPreset({
        ts: navSignal.ts,
        linijaKod: navSignal.wizardLinija || null,
        tip: navSignal.wizardTip || GLAVNI_UNOS_SHEET_TIP.PROJEKAT,
        autoPotvrdi: !!navSignal.wizardAutoPotvrdi,
      });
      setWizardOtvoren(true);
      requestAnimationFrame(() => {
        document.querySelector("[data-testid=novi-deo-wizard]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      });
    }
  }, [navSignal?.ts, navSignal?.idDeo, navSignal?.otvoriWizard, navSignal?.wizardLinija, navSignal?.wizardTip, navSignal?.wizardAutoPotvrdi]);

  const potvrdiPrePropagacije = () => {
    const { greske, upozorenja } = validirajRedovePrePropagacije(redovi);
    if (greske.length) {
      const extra = greske.length > 4 ? ` (+${greske.length - 4} još)` : "";
      addToast?.(`${greske.slice(0, 4).join(" ")}${extra}`, "greska");
      return false;
    }
    if (upozorenja.length) {
      const ok = window.confirm(
        `Upozorenja pre objave:\n\n${upozorenja.slice(0, 10).join("\n")}\n\nNastaviti?`,
      );
      if (!ok) return false;
    }
    return true;
  };

  const prikaziChecklistPoslePropagacije = () => {
    const konfig = sheetKonfiguracije.find((r) => r.naziv === aktivniSheet);
    const analiza = analizaSheeta(redovi, { ...konfig, naziv: aktivniSheet });
    setChecklistCtx({
      analiza,
      idDeo: idDeoPoslePropagacije(redovi, filter),
    });
  };

  const dodajSablonIzCheckliste = async (idDeo) => {
    setSablonUcitava(true);
    try {
      const vozilo = checklistCtx?.analiza?.tip === GLAVNI_UNOS_SHEET_TIP.FINAL;
      const n = await dodajSablonGresaka(idDeo, { vozilo });
      addToast?.(`✓ Dodato ${n} grešaka u katalog`, "uspeh");
      obavestiPromenuStatusaSifrarnika({
          izvor: "glavni_unos",
          akcija: "greske_sablon",
          idDeo,
          idDeovi: idDeo ? [idDeo] : [],
          tab: "greske",
          linija: radnaLinija || "",
        });
      onNavigate?.("greske", { idDeo, vozilo });
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSablonUcitava(false);
    }
  };

  const prikaz = redovi.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [r.id_deo, r.radni_nalog, r.kupac, r.karakteristika, r.naziv_dela]
      .some((s) => String(s || "").toLowerCase().includes(q));
  });

  const sacuvajSheet = async ({ propagirajPosle = true, forsiraConcurrent = false } = {}) => {
    if (propagirajPosle && !potvrdiPrePropagacije()) return;
    if (!forsiraConcurrent && !(await proveriConcurrentEdit())) return;
    setSnima(true);
    try {
      if (concurrentUpozorenje || forsiraConcurrent) {
        try {
          const remote = await fetchGlavniUnosRedovi(aktivniSheet);
          sacuvajGuUndoSnapshot({
            poSheetu: { [aktivniSheet]: remote.map(formatRedZaFormu) },
            imeFajla: aktivniSheet,
            razlog: "snimanje",
          });
          setImaUndo(true);
          setUndoPreostalo(preostaloUndoMs(ucitajGuUndoSnapshot()));
        } catch { /* undo opciono */ }
      }

      const payload = redovi.map((r, i) => normalizujRedZaSnimanje(
        stampAuditPolja(r, korisnik),
        aktivniSheet,
        i,
      ));
      const saved = await zameniSheetRedove(aktivniSheet, payload);
      setRedovi(saved.map(formatRedZaFormu));
      setSheetRemoteStamp(await fetchSheetMaxUpdatedAt(aktivniSheet).catch(() => new Date().toISOString()));
      setDirty(false);
      setConcurrentUpozorenje(false);
      setConcurrentStamp(null);
      if (propagirajPosle) {
        const res = await propagirajGlavniUnos();
        const derivedCount = (res.derived || []).reduce((s, r) => s + (r.count || 0), 0);
        const konfig = sheetKonfiguracije.find((r) => r.naziv === aktivniSheet);
        const analiza = analizaSheeta(redovi, { ...konfig, naziv: aktivniSheet });
        prikaziChecklistPoslePropagacije();
        addToast?.(
          `✓ Objavljeno · ${analiza.kratko}: ${res.karakteristike} dimenzija`
          + (derivedCount ? `, ${derivedCount} zavisnih` : ""),
          "uspeh",
        );
        zavrsiSifrarnikOnboarding();
        obavestiPromenuStatusaSifrarnika(statusKontekstGu(redovi, filter, radnaLinija, "objavi"));
        return res;
      }
      addToast?.(`✓ ${aktivniSheet}: ${saved.length} redova`, "uspeh");
      obavestiPromenuStatusaSifrarnika(statusKontekstGu(redovi, filter, radnaLinija, "snimi"));
      return { redova: saved.length };
    } catch (e) {
      const msg = e?.message || String(e);
      let hint = "";
      if (/column.*kupac|could not find.*kupac/i.test(msg)) {
        hint = " Pokreni SQL migraciju 45_glavni_unos_kupac.sql u Supabase SQL Editoru.";
      } else if (/radni_nalozi.*duplicate|idx_radni_nalozi_broj/i.test(msg)) {
        hint = " Konflikt broja naloga — RN mora biti jedinstven po pogonu.";
      } else if (/kupci:/i.test(msg)) {
        hint = " Proveri tabelu kupci (migracija 62_erp_uvoz_constraints.sql).";
      }
      addToast?.(msg + hint, "greska");
      throw e;
    } finally {
      setSnima(false);
    }
  };

  const samoPropagiraj = async () => {
    if (!potvrdiPrePropagacije()) return;
    setPropagira(true);
    try {
      const res = await propagirajGlavniUnos();
      const derivedCount = (res.derived || []).reduce((s, r) => s + (r.count || 0), 0);
      prikaziChecklistPoslePropagacije();
      addToast?.(
        `✓ Propagirano: ${res.karakteristike} dimenzija, ${res.redova} redova`
        + (derivedCount ? `, ${derivedCount} zavisnih unosa` : ""),
        "uspeh",
      );
      zavrsiSifrarnikOnboarding();
      obavestiPromenuStatusaSifrarnika(statusKontekstGu(redovi, filter, radnaLinija, "propagiraj"));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPropagira(false);
    }
  };

  const objaviUSifrarnik = async () => {
    try {
      const id = normalizujIdDeo(filter);
      const preview = await previewPropagacije({
        sheetNaziv: id ? null : aktivniSheet,
        idDeo: id || null,
      });
      if (preview.ukupno > 0 && !window.confirm(`Objaviti u šifrarnik?\n\n${preview.poruka}`)) {
        return;
      }
    } catch {
      /* preview opciono */
    }
    if (dirty) {
      await sacuvajSheet({ propagirajPosle: true });
      return;
    }
    await samoPropagiraj();
  };

  const vratiXlsxUndo = async () => {
    const snap = ucitajGuUndoSnapshot();
    if (!snap?.poSheetu) {
      addToast?.("Nema snimka za undo", "info");
      return;
    }
    const tip = snap.razlog === "snimanje" ? "prepisivanja sheet-a" : "importa";
    if (!window.confirm(`Vratiti stanje pre ${tip}${snap.imeFajla ? ` (${snap.imeFajla})` : ""}?`)) return;
    setSnima(true);
    try {
      for (const [sheet, rows] of Object.entries(snap.poSheetu)) {
        await zameniSheetRedove(sheet, rows);
      }
      obrisiGuUndoSnapshot();
      setImaUndo(false);
      await ucitajRedove(aktivniSheet);
      addToast?.("✓ Vraćeno stanje pre XLSX importa", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const propagirajFilterDeo = async () => {
    const id = normalizujIdDeo(filter);
    if (!jePunIdDeo(id)) {
      addToast?.("Upiši pun ID dela u filter (npr. DEMO-NM-001)", "greska");
      return;
    }
    if (dirty) {
      addToast?.("Prvo objavi sheet („Objavi u šifrarnik“)", "greska");
      return;
    }
    setPropagira(true);
    try {
      const res = await propagirajMerljiviDeo(id);
      const derivedCount = (res.derived || []).reduce((s, r) => s + (r.count || 0), 0);
      const msg = res.izKarakteristika
        ? `✓ ${id}: sinhronizovano iz dimenzija`
        : `✓ ${id}: ${res.karakteristike} dimenzija iz Osnovnog`
          + (derivedCount ? `, ${derivedCount} zavisnih` : "");
      addToast?.(msg, "uspeh");
      obavestiPromenuStatusaSifrarnika({
        izvor: "glavni_unos",
        akcija: "propagiraj_deo",
        idDeo: id,
        idDeovi: id ? [id] : [],
        tab: "glavni_unos",
        linija: radnaLinija || "",
      });
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPropagira(false);
    }
  };

  const otvoriGrupniUnos = (sablon = null, { finalVozilo = false } = {}) => {
    setFormaIdx(null);
    setGrupniSablon(finalVozilo
      ? {
        ...PRAZAN_RED,
        linija: "Završna",
        operacija: "Finalna kontrola",
        ...sablon,
      }
      : sablon);
    setGrupnaFinalVozilo(finalVozilo);
    setGrupnaOtvorena(true);
  };

  const sacuvajGrupniUnos = (noviRedovi) => {
    const stamped = noviRedovi.map((r) => formatRedZaFormu(
      stampAuditPolja(r, korisnik, { uvek: true }),
    ));
    setRedovi((prev) => [...prev, ...stamped]);
    setDirty(true);
    setGrupnaOtvorena(false);
    setGrupnaFinalVozilo(false);
    setGrupniSablon(null);
    const id = normalizujIdDeo(noviRedovi[0]?.id_deo);
    addToast?.(
      `✓ Dodato ${stamped.length} dimenzija za ${id} — klikni „Objavi u šifrarnik“ kada završiš.`,
      "uspeh",
    );
  };

  const dodajDimenzijuIstiDeo = (izvorIdx = null) => {
    let izvor = null;
    if (izvorIdx != null && izvorIdx >= 0 && izvorIdx < redovi.length) {
      izvor = redovi[izvorIdx];
    } else if (formaIdx != null && redovi[formaIdx]?.id_deo) {
      izvor = redovi[formaIdx];
    } else if (redovi.length) {
      izvor = redovi[redovi.length - 1];
    }
    if (!izvor?.id_deo && jePunIdDeo(filter)) {
      izvor = nadjiSablonZaDeo(redovi, filter) || { id_deo: normalizujIdDeo(filter) };
    }
    if (!String(izvor?.id_deo || "").trim()) {
      addToast?.("Prvo unesi ID deo u jednom redu, ili filtriraj po punom ID-u.", "info");
      return;
    }
    const sablon = nadjiSablonZaDeo(redovi, izvor.id_deo) || izvor;
    const noviRed = stampAuditPolja(
      novaDimenzijaRed(sablon, PRAZAN_RED),
      korisnik,
      { uvek: true },
    );
    const novi = [...redovi, noviRed];
    setRedovi(novi);
    setFormaIdx(novi.length - 1);
    setDirty(true);
    addToast?.(
      `Nova dimenzija za ${normalizujIdDeo(sablon.id_deo)} — unesi samo karakteristiku i granice.`,
      "uspeh",
    );
  };

  const obrisiRed = (idx) => {
    if (!window.confirm("Obrisati red?")) return;
    setRedovi(redovi.filter((_, i) => i !== idx));
    setFormaIdx(null);
    setDirty(true);
  };

  const uvoziXlsx = async (file) => {
    if (!file) return;
    setSnima(true);
    try {
      const wb = await ucitajWorkbookIzFajla(file);
      const { redovi: sviRedovi, pogonRows } = parsirajWorkbookZaUvoz(wb);
      if (pogonRows.length) await upsertPogonLinijaMapa(pogonRows);

      const poSheetu = {};
      sviRedovi.forEach((r) => {
        const s = r.sheet_naziv || "vozilo1";
        if (!poSheetu[s]) poSheetu[s] = [];
        poSheetu[s].push(r);
      });

      const ukupno = Object.values(poSheetu).reduce((s, rows) => s + rows.length, 0);
      const pregled = Object.entries(poSheetu)
        .map(([sheet, rows]) => `${sheet}: ${rows.length} redova (zamena)`)
        .join("\n");
      if (!window.confirm(`Uvesti ${ukupno} redova iz ${file.name}?\n\n${pregled}\n\nPostojeći redovi po sheet-u biće zamenjeni.`)) {
        return;
      }

      const undoPoSheetu = {};
      for (const sheet of Object.keys(poSheetu)) {
        undoPoSheetu[sheet] = await fetchGlavniUnosRedovi(sheet);
      }
      sacuvajGuUndoSnapshot({ poSheetu: undoPoSheetu, imeFajla: file.name });
      setImaUndo(true);
      setUndoPreostalo(preostaloUndoMs(ucitajGuUndoSnapshot()));

      let sacuvano = 0;
      for (const [sheet, rows] of Object.entries(poSheetu)) {
        const saved = await zameniSheetRedove(sheet, rows.map((r, i) => normalizujRedZaSnimanje(r, sheet, i)));
        sacuvano += saved.length;
      }

      await ucitajSheetove();
      const prviSheet = Object.keys(poSheetu)[0] || aktivniSheet;
      setAktivniSheet(prviSheet);
      await ucitajRedove(prviSheet);
      addToast?.(`✓ Uvezeno ${sacuvano} redova iz ${file.name}`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const forma = formaIdx != null ? redovi[formaIdx] : null;

  const izmeniFormu = (f) => {
    setRedovi((prev) => {
      const novi = [...prev];
      const trenutni = novi[formaIdx];
      let row = typeof f === "function" ? f(trenutni) : f;
      const stariId = normalizujIdDeo(trenutni?.id_deo);
      const noviId = normalizujIdDeo(row?.id_deo);
      if (noviId && noviId !== stariId) {
        row = primeniSablonNaRed(novi, row, formaIdx);
      }
      novi[formaIdx] = row;
      return novi;
    });
    setDirty(true);
  };

  const snimiFormu = (dodajJosDimenziju = false) => {
    setRedovi((prev) => {
      const novi = [...prev];
      novi[formaIdx] = stampAuditNaIzmenu(novi[formaIdx], korisnik);
      if (dodajJosDimenziju) {
        const sablon = novi[formaIdx];
        novi.push(stampAuditPolja(novaDimenzijaRed(sablon, PRAZAN_RED), korisnik, { uvek: true }));
        setFormaIdx(novi.length - 1);
      } else {
        setFormaIdx(null);
      setGrupnaOtvorena(false);
      setGrupnaFinalVozilo(false);
      }
      return novi;
    });
    setDirty(true);
  };

  const idForma = forma ? normalizujIdDeo(forma.id_deo) : "";
  const brojDimZaId = idForma ? brojDimenzijaZaDeo(redovi, idForma) : 0;
  const aktivniKonfig = sheetKonfiguracije.find((r) => r.naziv === aktivniSheet);
  const analizaAktivnog = analizaSheeta(redovi, { ...aktivniKonfig, naziv: aktivniSheet });

  const bedzBoja = (tip) => {
    if (tip === GLAVNI_UNOS_SHEET_TIP.FINAL) return C.narandzasta || "#f59e0b";
    if (tip === GLAVNI_UNOS_SHEET_TIP.PROJEKAT) return C.plava;
    return C.sivi;
  };

  const promeniAktivniSheet = (s) => {
    if (dirty && !window.confirm("Nesačuvane izmene — preći na drugi sheet?")) return;
    setAktivniSheet(s);
  };

  const pokreniKloniranje = async () => {
    if (!klonIzvor.trim() || !klonCilj.trim()) {
      addToast?.("Unesi izvor i cilj ID dela", "greska");
      return;
    }
    setKlonira(true);
    try {
      const rez = await klonirajDeoUGlavniUnos(klonIzvor, klonCilj);
      addToast?.(`✓ Klonirano ${rez.redova} red(ova): ${rez.izvor} → ${rez.cilj}`, "uspeh");
      setFilter(rez.cilj);
      setKlonCilj("");
      await ucitajRedove(aktivniSheet);
      obavestiPromenuStatusaSifrarnika({
        izvor: "glavni_unos",
        akcija: "kloniraj",
        idDeo: rez.cilj,
        idDeovi: rez.cilj ? [rez.cilj] : [],
        tab: "glavni_unos",
        linija: radnaLinija || "",
      });
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setKlonira(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {concurrentUpozorenje && (
        <div
          data-testid="gu-concurrent-banner"
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${C.crvena || "#dc2626"}55`,
            background: `${C.crvena || "#dc2626"}12`,
            color: C.tekst,
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>Konflikt izmene:</strong> drugi korisnik je izmenio sheet „{aktivniSheet}”
            {concurrentStamp ? (
              <span style={{ color: C.sivi }}>
                {" "}(server: {new Date(concurrentStamp).toLocaleString("sr-RS")})
              </span>
            ) : null}
            . Osveži da vidiš njihove izmene, ili snimi svesno (prepisuješ — moći ćeš Undo).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              data-testid="gu-concurrent-osvezi"
              onClick={osveziSheetSaServera}
              style={btnStyle(C, C.plava, { fontSize: 9 })}
            >
              Osveži sheet
            </button>
            <button
              type="button"
              data-testid="gu-concurrent-snimi"
              disabled={snima}
              onClick={() => sacuvajSheet({ propagirajPosle: false, forsiraConcurrent: true })}
              style={btnStyle(C, C.crvena || "#dc2626", { fontSize: 9 })}
            >
              Snimi ipak (prepiši)
            </button>
          </div>
        </div>
      )}
      {dirty && (
        <div
          data-testid="gu-dirty-banner"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${C.narandzasta || "#f59e0b"}66`,
            background: `${C.narandzasta || "#f59e0b"}18`,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            fontSize: 10,
          }}
        >
          <span style={{ color: C.tekst, fontWeight: 700 }}>
            ⚠ Nesačuvane izmene — sačuvaj ili objavi pre promene sheeta
          </span>
          <button
            type="button"
            disabled={snima}
            onClick={() => sacuvajSheet({ propagirajPosle: false })}
            style={btnStyle(C, C.plava, { fontSize: 9, padding: "4px 10px" })}
          >
            {snima ? "…" : "Sačuvaj sheet"}
          </button>
          <button
            type="button"
            disabled={snima || propagira}
            onClick={objaviUSifrarnik}
            style={btnStyle(C, C.zelena, { fontSize: 9, padding: "4px 10px" })}
          >
            Objavi u šifrarnik
          </button>
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>
        <strong style={{ color: C.tekst }}>Glavni unos</strong> — unos dimenzija i zaglavlja; objava puni Merljive, RN i Delovi.
        {" "}
        <button
          type="button"
          onClick={() => {
            setWizardPreset(null);
            setWizardOtvoren(true);
          }}
          style={{ background: "none", border: "none", padding: 0, color: C.plava, cursor: "pointer", fontWeight: 700, fontSize: 10 }}
        >
          + Novi deo (čarobnjak)
        </button>
      </div>

      <GlavniUnosSheetBirac
        C={C}
        sheetovi={sheetovi}
        sheetKonfiguracije={sheetKonfiguracije}
        aktivniSheet={aktivniSheet}
        onPromeniSheet={promeniAktivniSheet}
        fokusLinijaKod={radnaLinija}
        onNoviDeo={() => {
          setWizardPreset(null);
          setWizardOtvoren(true);
        }}
        onToggleKlon={() => setKlonOtvoren((v) => !v)}
        klonOtvoren={klonOtvoren}
      />

      {klonOtvoren && (
        <div
          data-testid="gu-kloniraj-forma"
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.panel,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>IZVOR ID</span>
            <input value={klonIzvor} onChange={(e) => setKlonIzvor(e.target.value.toUpperCase())} style={{ ...INP, width: 120 }} placeholder="HAM-NM-001" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>NOVI ID</span>
            <input value={klonCilj} onChange={(e) => setKlonCilj(e.target.value.toUpperCase())} style={{ ...INP, width: 120 }} placeholder="HAM-NM-002" />
          </label>
          <button
            type="button"
            data-testid="gu-kloniraj-submit"
            disabled={klonira}
            onClick={pokreniKloniranje}
            style={btnStyle(C, C.plava, { fontSize: 10, opacity: klonira ? 0.6 : 1 })}
          >
            {klonira ? "…" : "Kloniraj dimenzije"}
          </button>
          <span style={{ color: C.sivi, fontSize: 9, flex: "1 1 180px", lineHeight: 1.4 }}>
            Kopira GU redove i master zapis. Posle kloniranja prilagodi RN/kupca i objavi u šifrarnik.
          </span>
        </div>
      )}

      {wizardOtvoren && (
        <NoviDeoWizard
          key={wizardPreset?.ts || "wizard"}
          C={C}
          sheetovi={sheetovi}
          sheetKonfiguracije={sheetKonfiguracije}
          tipoviVozila={tipoviVozila}
          wizardPreset={wizardPreset}
          radnaLinija={radnaLinija}
          onCancel={() => {
            setWizardOtvoren(false);
            setWizardPreset(null);
          }}
          onKreirajSheet={async (opts) => {
            const novi = await kreirajGlavniUnosSheet(opts);
            await ucitajSheetove();
            setAktivniSheet(novi.naziv);
            setRedovi([]);
            setDirty(false);
            addToast?.(`✓ Sheet ${novi.naziv}`, "uspeh");
          }}
          onIzaberiSheet={(naziv, ctx = {}) => {
            if (dirty && !window.confirm("Nesačuvane izmene — preći na drugi sheet?")) return;
            setAktivniSheet(naziv);
            if (ctx.sablonId) {
              setKlonIzvor(String(ctx.sablonId).trim().toUpperCase());
              setKlonOtvoren(true);
              addToast?.(`Šablon ${ctx.sablonId} — unesi novi ID u Kloniraj deo`, "info");
            }
          }}
          onGrupniUnos={() => otvoriGrupniUnos()}
          onFinalVozilo={() => otvoriGrupniUnos(null, { finalVozilo: true })}
        />
      )}

      {checklistCtx && (
        <GlavniUnosChecklistPanel
          C={C}
          analiza={checklistCtx.analiza}
          idDeo={checklistCtx.idDeo}
          onNavigate={onNavigate}
          onDismiss={() => setChecklistCtx(null)}
          onDodajSablonGresaka={dodajSablonIzCheckliste}
          sablonUcitava={sablonUcitava}
        />
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Filter ili pun ID (npr. DEMO-NM-001)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...INP, width: 220 }}
        />
        {jePunIdDeo(filter) && (
          <button
            type="button"
            onClick={propagirajFilterDeo}
            disabled={propagira || dirty}
            style={btnStyle(C, C.plava, { disabled: propagira || dirty })}
            title="Propagiraj samo ovaj deo u Dimenzije/SOP"
          >
            {propagira ? "…" : `Propagiraj ${normalizujIdDeo(filter)}`}
          </button>
        )}
        <span style={{ color: C.sivi, fontSize: 10 }}>
          {loading ? "Učitavanje…" : `${prikaz.length} / ${redovi.length} redova`}
          {dirty ? " · nesačuvano" : ""}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => otvoriGrupniUnos()}
          style={btnStyle(C, C.zelena)}
          title="Zaglavlje jednom + više dimenzija (deo ili deo projekta)"
        >
          + Grupni unos
        </button>
        {analizaAktivnog.tip === GLAVNI_UNOS_SHEET_TIP.FINAL && (
          <button
            type="button"
            onClick={() => otvoriGrupniUnos(null, { finalVozilo: true })}
            style={btnStyle(C, C.narandzasta || "#f59e0b")}
            title="Finalna kontrola celog vozila"
          >
            + Final vozilo
          </button>
        )}
        {jePunIdDeo(filter) && (
          <button
            type="button"
            onClick={() => otvoriGrupniUnos(nadjiSablonZaDeo(redovi, filter) || { id_deo: normalizujIdDeo(filter) })}
            style={btnStyle(C, C.plava)}
            title="Dodaj još dimenzija za ID iz filtera"
          >
            + Dimenzije za {normalizujIdDeo(filter)}
          </button>
        )}
        <button
          type="button"
          onClick={objaviUSifrarnik}
          disabled={snima || propagira || (!dirty && !redovi.length)}
          style={btnStyle(C, C.plava, { disabled: snima || propagira || (!dirty && !redovi.length) })}
          title={dirty
            ? "Sačuvaj izmene i propagiraj u Merljive/Naloge"
            : "Ponovo propagiraj sačuvan sheet (bez izmene redova)"}
        >
          {snima || propagira ? "Objavljujem…" : "Objavi u šifrarnik"}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={snima} style={btnStyle(C, C.narandzasta || "#f59e0b", { disabled: snima })}>
          Uvezi .xlsx
        </button>
        {imaUndo && (
          <>
          <button type="button" data-testid="gu-xlsx-undo" onClick={vratiXlsxUndo} disabled={snima}
            style={btnStyle(C, C.hover, { disabled: snima, fontSize: 10 })}>
            {labelGuUndo(ucitajGuUndoSnapshot())}
          </button>
          {undoPreostalo > 0 && (
            <span data-testid="gu-xlsx-undo-ttl" style={{ color: C.sivi, fontSize: 9, alignSelf: "center" }}>
              ističe za {formatUndoPreostalo(undoPreostalo)}
            </span>
          )}
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => uvoziXlsx(e.target.files?.[0])} />
      </div>

      {grupnaOtvorena && opcije && (
        <GlavniUnosGrupnaForma
          C={C}
          opcije={opcije}
          addToast={addToast}
          redovi={redovi}
          prazanRed={PRAZAN_RED}
          initialSablon={grupniSablon}
          finalVozilo={grupnaFinalVozilo}
          filterId={jePunIdDeo(filter) ? normalizujIdDeo(filter) : ""}
          onCancel={() => {
            setGrupnaOtvorena(false);
            setGrupnaFinalVozilo(false);
            setGrupniSablon(null);
          }}
          onSave={sacuvajGrupniUnos}
        />
      )}

      {forma && opcije && !grupnaOtvorena && (
        <div style={{ marginBottom: 12 }}>
          {idForma && brojDimZaId > 0 && (
            <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8, lineHeight: 1.45 }}>
              <strong style={{ color: C.plava }}>{idForma}</strong>
              {brojDimZaId > 1
                ? ` — već ${brojDimZaId} dimenzija na listi. Zaglavlje je zajedničko; za sledeću koristi „Sačuvaj + još dimenzija“.`
                : " — prva dimenzija za ovaj deo. Popuni zaglavlje jednom, zatim dodaj ostale dimenzije bez ponovnog RN/linije."}
            </div>
          )}
          <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
            ZAGLAVLJE DELA (isti za sve dimenzije ovog ID)
          </div>
          <FormGrid
            C={C}
            cols={3}
            forma={forma}
            setForma={izmeniFormu}
            fields={FORM_ZAGLAVLJE}
            fieldMeta={{
              ...FIELD_META,
              slika: {
                ...FIELD_META.slika,
                sidePanel: (
                  <>
                    <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
                      DIMENZIJA / KARAKTERISTIKA
                    </div>
                    <FormGrid
                      C={C}
                      cols={2}
                      forma={forma}
                      setForma={izmeniFormu}
                      fields={FORM_DIMENZIJA}
                      fieldMeta={FIELD_META}
                      opcije={opcije}
                      addToast={addToast}
                      onSave={() => {}}
                      onCancel={() => setFormaIdx(null)}
                      snima={false}
                      hideActions
                    />
                  </>
                ),
              },
            }}
            opcije={opcije}
            addToast={addToast}
            onSave={() => {}}
            onCancel={() => setFormaIdx(null)}
            snima={false}
            hideActions
          />
          <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, margin: "4px 0 6px" }}>
            DIMENZIJA / KARAKTERISTIKA
          </div>
          <FormGrid
            C={C}
            cols={3}
            forma={forma}
            setForma={izmeniFormu}
            fields={FORM_DIMENZIJA}
            fieldMeta={FIELD_META}
            opcije={opcije}
            addToast={addToast}
            onSave={() => snimiFormu(false)}
            onCancel={() => setFormaIdx(null)}
            snima={false}
            secondaryAction={{
              label: "Sačuvaj + još dimenzija",
              onClick: () => snimiFormu(true),
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: C.panel, position: "sticky", top: 0, zIndex: 1 }}>
              {GRID_KOLONE.map(([, label, w]) => (
                <th key={label} style={{ textAlign: "left", padding: "6px 8px", color: C.sivi, fontWeight: 700, minWidth: w, borderBottom: `1px solid ${C.border}` }}>
                  {label}
                </th>
              ))}
              <th style={{ width: 120, borderBottom: `1px solid ${C.border}` }} />
            </tr>
          </thead>
          <tbody>
            {prikaz.map((r) => {
              const idx = redovi.findIndex((x) => x === r);
              return (
                <tr key={r.id ?? `l-${idx}`} style={{ background: idx % 2 ? `${C.border}22` : "transparent" }}>
                  {GRID_KOLONE.map(([k]) => (
                    <td key={k} style={{ padding: "5px 8px", color: C.tekst, borderBottom: `1px solid ${C.border}44`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                      {["nominal", "usl", "lsl"].includes(k)
                        ? (granicaZaPrikaz(r[k], r.jedinica) || "—")
                        : (r[k] ?? "—")}
                    </td>
                  ))}
                  <td style={{ padding: "4px 6px", borderBottom: `1px solid ${C.border}44`, whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => otvoriGrupniUnos(r)}
                      title="Grupno dodaj dimenzije za isti deo"
                      style={{ ...inpStyle(C), padding: "2px 6px", fontSize: 9, cursor: "pointer", marginRight: 4, color: C.plava }}
                    >
                      +grp
                    </button>
                    <button
                      type="button"
                      onClick={() => dodajDimenzijuIstiDeo(idx)}
                      title="Još dimenzija za isti deo (kopira zaglavlje)"
                      style={{ ...inpStyle(C), padding: "2px 6px", fontSize: 9, cursor: "pointer", marginRight: 4, color: C.plava }}
                    >
                      +dim
                    </button>
                    <button type="button" onClick={() => {
                      setGrupnaOtvorena(false);
                      setGrupniSablon(null);
                      setRedovi((prev) => {
                        const n = [...prev];
                        n[idx] = formatRedZaFormu(n[idx]);
                        return n;
                      });
                      setFormaIdx(idx);
                    }} style={{ ...inpStyle(C), padding: "2px 6px", fontSize: 9, cursor: "pointer", marginRight: 4 }}>✎</button>
                    <button type="button" onClick={() => obrisiRed(idx)} style={{ ...inpStyle(C), padding: "2px 6px", fontSize: 9, cursor: "pointer", color: C.crvena }}>✕</button>
                  </td>
                </tr>
              );
            })}
            {!loading && !prikaz.length && (
              <tr>
                <td colSpan={GRID_KOLONE.length + 1} style={{ padding: 28, textAlign: "center", color: C.sivi }}>
                  <div style={{ marginBottom: 10 }}>
                    {radnaLinija
                      ? `Nema redova na sheetu za liniju ${radnaLinija}`
                      : "Nema redova na ovom sheetu"}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      data-testid="gu-empty-wizard"
                      onClick={() => {
                        setWizardPreset({
                          linija: radnaLinija || null,
                          tip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT,
                          autoPotvrdi: !!radnaLinija,
                          ts: Date.now(),
                        });
                        setWizardOtvoren(true);
                      }}
                      style={btnStyle(C, C.zelena, { fontSize: 10 })}
                    >
                      + Novi deo (čarobnjak)
                    </button>
                    <button
                      type="button"
                      onClick={() => otvoriGrupniUnos()}
                      style={btnStyle(C, C.plava, { fontSize: 10 })}
                    >
                      + Grupni unos
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>
        tabela glavni_unos_redovi · sheet {aktivniSheet}
      </div>
    </div>
  );
}
