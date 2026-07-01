import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchGlavniUnosSheetovi,
  fetchGlavniUnosRedovi,
  zameniSheetRedove,
  propagirajGlavniUnos,
  propagirajMerljiviDeo,
  ucitajWorkbookIzFajla,
  parsirajWorkbookZaUvoz,
  upsertPogonLinijaMapa,
} from "../../lib/glavniUnosApi.js";
import { GLAVNI_UNOS_COL_BROJ_MERENJA, GLAVNI_UNOS_BROJ_MERENJA_DEFAULT } from "../../lib/glavniUnosCore.js";
import { FormGrid } from "./LinijePanel.jsx";
import GlavniUnosGrupnaForma from "./GlavniUnosGrupnaForma.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
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
  kupac: { type: "select", opcijeKey: "kupac" },
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

export default function GlavniUnosPanel({ C, addToast, korisnik }) {
  const { opcije: bazaOpcije } = useSifrarnikOpcije(addToast);
  const [sheetovi, setSheetovi] = useState(DEFAULT_SHEETS);
  const [aktivniSheet, setAktivniSheet] = useState("vozilo1");
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snima, setSnima] = useState(false);
  const [propagira, setPropagira] = useState(false);
  const [formaIdx, setFormaIdx] = useState(null);
  const [grupnaOtvorena, setGrupnaOtvorena] = useState(false);
  const [grupniSablon, setGrupniSablon] = useState(null);
  const [filter, setFilter] = useState("");
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef(null);
  const INP = inpStyle(C);

  const opcije = bazaOpcije
    ? dopuniOpcijeIzRedova(bazaOpcije, redovi, GLAVNI_UNOS_OPCIJE_MAPA)
    : null;

  const ucitajSheetove = useCallback(async () => {
    try {
      const s = await fetchGlavniUnosSheetovi();
      const merged = [...new Set([...DEFAULT_SHEETS, ...s])].sort();
      setSheetovi(merged);
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
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitajSheetove(); }, [ucitajSheetove]);
  useEffect(() => { ucitajRedove(aktivniSheet); }, [aktivniSheet, ucitajRedove]);

  const prikaz = redovi.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [r.id_deo, r.radni_nalog, r.kupac, r.karakteristika, r.naziv_dela]
      .some((s) => String(s || "").toLowerCase().includes(q));
  });

  const sacuvajSheet = async ({ propagirajPosle = true } = {}) => {
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
        addToast?.(
          `✓ Sačuvano i propagirano: ${res.karakteristike} dimenzija`
          + (derivedCount ? `, ${derivedCount} zavisnih (delovi, SOP, RN, pogoni)` : ""),
          "uspeh",
        );
        return res;
      }
      addToast?.(`✓ ${aktivniSheet}: ${saved.length} redova`, "uspeh");
      return { redova: saved.length };
    } catch (e) {
      addToast?.(e.message, "greska");
      throw e;
    } finally {
      setSnima(false);
    }
  };

  const samoPropagiraj = async () => {
    setPropagira(true);
    try {
      const res = await propagirajGlavniUnos();
      const derivedCount = (res.derived || []).reduce((s, r) => s + (r.count || 0), 0);
      addToast?.(
        `✓ Propagirano: ${res.karakteristike} dimenzija, ${res.redova} redova`
        + (derivedCount ? `, ${derivedCount} zavisnih unosa` : ""),
        "uspeh",
      );
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPropagira(false);
    }
  };

  const propagirajFilterDeo = async () => {
    const id = normalizujIdDeo(filter);
    if (!jePunIdDeo(id)) {
      addToast?.("Upiši pun ID dela u filter (npr. DEMO-NM-001)", "greska");
      return;
    }
    if (dirty) {
      addToast?.("Prvo sačuvaj sheet („Sačuvaj i propagiraj“)", "greska");
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

  const otvoriGrupniUnos = (sablon = null) => {
    setFormaIdx(null);
    setGrupniSablon(sablon);
    setGrupnaOtvorena(true);
  };

  const sacuvajGrupniUnos = (noviRedovi) => {
    const stamped = noviRedovi.map((r) => formatRedZaFormu(
      stampAuditPolja(r, korisnik, { uvek: true }),
    ));
    setRedovi((prev) => [...prev, ...stamped]);
    setDirty(true);
    setGrupnaOtvorena(false);
    setGrupniSablon(null);
    const id = normalizujIdDeo(noviRedovi[0]?.id_deo);
    addToast?.(
      `✓ Dodato ${stamped.length} dimenzija za ${id} — klikni „Sačuvaj i propagiraj“ kada završiš.`,
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
      }
      return novi;
    });
    setDirty(true);
  };

  const idForma = forma ? normalizujIdDeo(forma.id_deo) : "";
  const brojDimZaId = idForma ? brojDimenzijaZaDeo(redovi, idForma) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>
        <strong style={{ color: C.tekst }}>Osnovni unos</strong> — inženjer popunjava samo ovde.
        Pri čuvanju se automatski propagira u{" "}
        <strong style={{ color: C.tekst }}>Merljive</strong> (dimenzije + SOP + broj merenja),{" "}
        <strong style={{ color: C.tekst }}>Naloge</strong> (RN + kupac),{" "}
        <strong style={{ color: C.tekst }}>Atributivne</strong> i{" "}
        <strong style={{ color: C.tekst }}>Celo vozilo</strong> (MRAP/NTV komplet).
        {" "}Za novi deo: <strong style={{ color: C.tekst }}>+ Grupni unos</strong> — zaglavlje jednom, 5–10 dimenzija u tabeli, jedan save.
        Za doradu jednog reda: <strong style={{ color: C.tekst }}>✎</strong> ili <strong style={{ color: C.tekst }}>+dim</strong> za još jednu dimenziju.
        Reakcioni plan za SPC alarme: <strong style={{ color: C.tekst }}>Merljive → SPC Karte → Reakcioni plan</strong>.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {sheetovi.map((s) => (
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
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const ime = window.prompt("Naziv novog sheet-a (npr. vozilo4):", "vozilo4");
            if (!ime?.trim()) return;
            const s = ime.trim().toLowerCase();
            if (!sheetovi.includes(s)) setSheetovi([...sheetovi, s].sort());
            setAktivniSheet(s);
            setRedovi([]);
            setDirty(false);
          }}
          style={{ ...inpStyle(C), cursor: "pointer", fontSize: 9 }}
        >
          + Sheet
        </button>
      </div>

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
          title="Zaglavlje jednom + tabela dimenzija — preporučeno za novi deo"
        >
          + Grupni unos
        </button>
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
        <button type="button" onClick={() => sacuvajSheet()} disabled={snima || !dirty} style={btnStyle(C, C.plava, { disabled: snima || !dirty })}>
          {snima ? "Čuvam…" : "Sačuvaj i propagiraj"}
        </button>
        <button type="button" onClick={samoPropagiraj} disabled={propagira || dirty} style={btnStyle(C, C.hover, { disabled: propagira || dirty })} title="Ponovo propagiraj bez izmena redova">
          {propagira ? "…" : "Propagiraj"}
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
          filterId={jePunIdDeo(filter) ? normalizujIdDeo(filter) : ""}
          onCancel={() => {
            setGrupnaOtvorena(false);
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
