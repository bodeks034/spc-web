import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchGlavniUnosSheetovi,
  fetchGlavniUnosSheetKonfiguracije,
  kreirajGlavniUnosSheet,
  fetchGlavniUnosRedovi,
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
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
import { validirajRedovePrePropagacije } from "../../lib/glavniUnosValidacija.js";
import { dodajSablonGresaka } from "../../lib/greskaSablon.js";
import { zavrsiSifrarnikOnboarding } from "../../lib/sifrarnikOnboarding.js";
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
  karakteristika: { type: "select", opcijeKey: "karakteristika" },
  jedinica: { type: "select", opcijeKey: "jedinica" },
  instrument: { type: "select", opcijeKey: "instrument" },
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
  if (jePunIdDeo(filter)) return normalizujIdDeo(filter);
  const ids = [...new Set((redovi || []).map((r) => normalizujIdDeo(r.id_deo)).filter(Boolean))];
  if (ids.length === 1) return ids[0];
  return ids[ids.length - 1] || null;
}

export default function GlavniUnosPanel({ C, addToast, korisnik, onNavigate, navSignal }) {
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
  const [sablonUcitava, setSablonUcitava] = useState(false);
  const [klonIzvor, setKlonIzvor] = useState("");
  const [klonCilj, setKlonCilj] = useState("");
  const [klonOtvoren, setKlonOtvoren] = useState(false);
  const [klonira, setKlonira] = useState(false);
  const fileRef = useRef(null);
  const INP = inpStyle(C);

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
      const data = await fetchGlavniUnosRedovi(sheet);
      setRedovi(data.map(formatRedZaFormu));
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

  useEffect(() => { ucitajSheetove(); }, [ucitajSheetove]);
  useEffect(() => { ucitajRedove(aktivniSheet); }, [aktivniSheet, ucitajRedove]);

  useEffect(() => {
    setChecklistCtx(null);
  }, [aktivniSheet]);

  useEffect(() => {
    if (!navSignal?.ts) return;
    if (navSignal.idDeo) {
      setFilter(navSignal.idDeo);
      setChecklistCtx(null);
    }
    if (navSignal.otvoriWizard) setWizardOtvoren(true);
  }, [navSignal?.ts, navSignal?.idDeo, navSignal?.otvoriWizard]);

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

  const sacuvajSheet = async ({ propagirajPosle = true } = {}) => {
    if (propagirajPosle && !potvrdiPrePropagacije()) return;
    setSnima(true);
    try {
      const payload = redovi.map((r, i) => normalizujRedZaSnimanje(
        stampAuditPolja(r, korisnik),
        aktivniSheet,
        i,
      ));
      const saved = await zameniSheetRedove(aktivniSheet, payload);
      setRedovi(saved.map(formatRedZaFormu));
      setDirty(false);
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
        return res;
      }
      addToast?.(`✓ ${aktivniSheet}: ${saved.length} redova`, "uspeh");
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
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPropagira(false);
    }
  };

  const objaviUSifrarnik = async () => {
    if (dirty) {
      await sacuvajSheet({ propagirajPosle: true });
      return;
    }
    await samoPropagiraj();
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

      let ukupno = 0;
      for (const [sheet, rows] of Object.entries(poSheetu)) {
        const saved = await zameniSheetRedove(sheet, rows.map((r, i) => normalizujRedZaSnimanje(r, sheet, i)));
        ukupno += saved.length;
      }

      await ucitajSheetove();
      const prviSheet = Object.keys(poSheetu)[0] || aktivniSheet;
      setAktivniSheet(prviSheet);
      await ucitajRedove(prviSheet);
      addToast?.(`✓ Uvezeno ${ukupno} redova iz ${file.name}`, "uspeh");
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
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setKlonira(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>
        <strong style={{ color: C.tekst }}>Glavni unos</strong> — unos dimenzija i zaglavlja; objava puni Merljive, RN i Delovi.
        {" "}
        <button
          type="button"
          onClick={() => setWizardOtvoren(true)}
          style={{ background: "none", border: "none", padding: 0, color: C.plava, cursor: "pointer", fontWeight: 700, fontSize: 10 }}
        >
          + Novi deo (čarobnjak)
        </button>
        <div style={{ marginTop: 4, fontSize: 9 }}>
          Aktivni sheet:{" "}
          <strong style={{ color: bedzBoja(analizaAktivnog.tip) }}>{analizaAktivnog.kratko}</strong>
          {" — "}{analizaAktivnog.opis}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {sheetovi.map((s) => {
          const konfig = sheetKonfiguracije.find((r) => r.naziv === s);
          const bedz = s === aktivniSheet
            ? analizaAktivnog
            : analizaSheeta([], { ...konfig, naziv: s });
          return (
          <button
            key={s}
            type="button"
            onClick={() => { if (dirty && !window.confirm("Nesačuvane izmene — preći na drugi sheet?")) return; setAktivniSheet(s); }}
            style={{
              background: aktivniSheet === s ? `${C.plava}22` : C.panel,
              border: `1px solid ${aktivniSheet === s ? C.plava : C.border}`,
              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              fontSize: 10, fontWeight: aktivniSheet === s ? 700 : 400,
              color: aktivniSheet === s ? C.plava : C.sivi,
            }}
            title={bedz.opis}
          >
            {s}
            <span style={{ color: bedzBoja(bedz.tip), fontWeight: 600 }}>
              {" · "}{bedz.kratko}
            </span>
          </button>
          );
        })}
        <button
          type="button"
          onClick={() => setWizardOtvoren(true)}
          style={btnStyle(C, C.zelena, { fontSize: 9 })}
          title="Tip → sheet → grupni unos"
        >
          + Novi deo
        </button>
        <button
          type="button"
          data-testid="gu-kloniraj-toggle"
          onClick={() => setKlonOtvoren((v) => !v)}
          style={btnStyle(C, C.hover, { fontSize: 9 })}
          title="Kopiraj dimenzije sa postojećeg dela"
        >
          {klonOtvoren ? "▾ Kloniraj deo" : "▸ Kloniraj deo"}
        </button>
      </div>

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
          C={C}
          sheetovi={sheetovi}
          sheetKonfiguracije={sheetKonfiguracije}
          onCancel={() => setWizardOtvoren(false)}
          onKreirajSheet={async (opts) => {
            const novi = await kreirajGlavniUnosSheet(opts);
            await ucitajSheetove();
            setAktivniSheet(novi.naziv);
            setRedovi([]);
            setDirty(false);
            addToast?.(`✓ Sheet ${novi.naziv}`, "uspeh");
          }}
          onIzaberiSheet={(naziv) => {
            if (dirty && !window.confirm("Nesačuvane izmene — preći na drugi sheet?")) return;
            setAktivniSheet(naziv);
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
                <td colSpan={GRID_KOLONE.length + 1} style={{ padding: 24, textAlign: "center", color: C.sivi }}>
                  Nema redova — dodaj ručno ili uvezi iz glavni unos.xlsx
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
