import { useState, useMemo } from "react";
import { FormGrid } from "./LinijePanel.jsx";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
import { GLAVNI_UNOS_COL_BROJ_MERENJA, GLAVNI_UNOS_BROJ_MERENJA_DEFAULT } from "../../lib/glavniUnosCore.js";
import { granicaZaPrikaz, sanitizujUnosUgaoGranice } from "../../lib/glavniUnosGranice.js";
import { isUgao } from "../../lib/varijabilneUtils.js";
import { normalizujIdDeo } from "../../lib/idDeoUtil.js";
import {
  GLAVNI_UNOS_GENERALIJA_POLJA,
  kopirajDimenzijaPolja,
  kopirajGeneraleUSablon,
  nadjiSablonZaDeo,
  pocetneGrupneDimenzije,
  redoviIzGrupnogUnosa,
} from "../../lib/glavniUnosRedSablon.js";

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

const GRANICA_KEYS = new Set(["nominal", "usl", "lsl"]);

const DIM_KOLONE = [
  { key: "karakteristika", label: "Karakteristika *", minW: 140, type: "karakteristika" },
  { key: "tip", label: "Tip", minW: 88, type: "tip" },
  { key: "klasa", label: "Klasa", minW: 72, type: "klasa" },
  { key: "jedinica", label: "Jed.", minW: 56, type: "jedinica" },
  { key: "nominal", label: "Nom", minW: 96, type: "granica" },
  { key: "usl", label: "USL", minW: 96, type: "granica" },
  { key: "lsl", label: "LSL", minW: 96, type: "granica" },
  { key: "instrument", label: "Instrument", minW: 100, type: "instrument" },
  { key: "spc_broj_merenja", label: "SPC n", minW: 48, type: "number" },
];

const FIELD_META = {
  linija: { type: "select", opcijeKey: "linija" },
  operacija: { type: "operacija" },
  masina_id: { type: "masina" },
  kupac: { type: "datalist", opcijeKey: "kupac", placeholder: "Npr. Lokalni servis" },
  slika: { type: "slika", modul: "merljive" },
};

function pocetnoZaglavlje({ prazanRed, initialSablon, redovi, filterId }) {
  if (initialSablon) {
    return kopirajGeneraleUSablon(initialSablon, prazanRed);
  }
  if (filterId) {
    const sablon = nadjiSablonZaDeo(redovi, filterId);
    if (sablon) return kopirajGeneraleUSablon(sablon, prazanRed);
    return { ...prazanRed, id_deo: filterId };
  }
  const z = { ...prazanRed };
  for (const k of GLAVNI_UNOS_GENERALIJA_POLJA) {
    if (z[k] == null) z[k] = "";
  }
  return z;
}

export default function GlavniUnosGrupnaForma({
  C,
  opcije,
  addToast,
  redovi,
  prazanRed,
  initialSablon = null,
  filterId = "",
  onCancel,
  onSave,
}) {
  const INP = inpStyle(C);
  const cellInp = { ...INP, padding: "4px 6px", fontSize: 10, width: "100%", minWidth: 0, boxSizing: "border-box" };

  const [zaglavlje, setZaglavlje] = useState(() => pocetnoZaglavlje({
    prazanRed,
    initialSablon,
    redovi,
    filterId,
  }));
  const [dimenzije, setDimenzije] = useState(() => pocetneGrupneDimenzije(5));

  const popunjene = useMemo(
    () => dimenzije.filter((d) => String(d.karakteristika || "").trim()).length,
    [dimenzije],
  );

  const izmeniZaglavlje = (f) => {
    setZaglavlje((prev) => {
      let row = typeof f === "function" ? f(prev) : f;
      const stariId = normalizujIdDeo(prev?.id_deo);
      const noviId = normalizujIdDeo(row?.id_deo);
      if (noviId && noviId !== stariId) {
        const sablon = nadjiSablonZaDeo(redovi, noviId);
        if (sablon) row = kopirajGeneraleUSablon(sablon, { ...prev, ...row, id_deo: noviId });
        else row = { ...row, id_deo: noviId };
      }
      return row;
    });
  };

  const izmeniDim = (idx, key, value) => {
    setDimenzije((prev) => {
      const n = [...prev];
      let row = { ...n[idx], [key]: value };
      if (key === "jedinica" && isUgao(value) && !isUgao(n[idx].jedinica)) {
        for (const g of GRANICA_KEYS) {
          const raw = row[g];
          if (raw !== "" && raw != null) {
            row[g] = granicaZaPrikaz(raw, value) || raw;
          }
        }
      }
      n[idx] = row;
      return n;
    });
  };

  const dodajRed = () => {
    setDimenzije((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, kopirajDimenzijaPolja(last)];
    });
  };

  const duplirajPrethodni = (idx) => {
    if (idx <= 0) return;
    setDimenzije((prev) => {
      const n = [...prev];
      const kar = n[idx].karakteristika;
      n[idx] = kopirajDimenzijaPolja(prev[idx - 1], { zadrziKarakteristiku: kar });
      return n;
    });
  };

  const duplirajKaoNoviRed = (idx) => {
    setDimenzije((prev) => {
      const n = [...prev];
      n.splice(idx + 1, 0, kopirajDimenzijaPolja(prev[idx]));
      return n;
    });
  };

  const obrisiRed = (idx) => {
    setDimenzije((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const renderCell = (d, idx, col) => {
    const v = d[col.key] ?? "";
    const onCh = (val) => izmeniDim(idx, col.key, val);

    if (col.type === "karakteristika") {
      return (
        <input
          list={`gu-kar-${idx}`}
          value={v}
          onChange={(e) => onCh(e.target.value)}
          placeholder="npr. Ø12"
          style={cellInp}
        />
      );
    }
    if (col.type === "tip" || col.type === "klasa" || col.type === "jedinica" || col.type === "instrument") {
      const lista = opcije[col.type === "tip" ? "tip" : col.type === "klasa" ? "klasa" : col.type === "jedinica" ? "jedinica" : "instrument"] || [];
      return (
        <select value={v} onChange={(e) => onCh(e.target.value)} style={{ ...cellInp, cursor: "pointer" }}>
          <option value="">—</option>
          {lista.map((o) => {
            const val = typeof o === "object" ? o.value : o;
            const lab = typeof o === "object" ? o.label : o;
            return <option key={String(val)} value={String(val)}>{lab}</option>;
          })}
        </select>
      );
    }
    if (col.type === "number") {
      return (
        <input
          type="number"
          min={1}
          value={v}
          placeholder={String(GLAVNI_UNOS_BROJ_MERENJA_DEFAULT)}
          onChange={(e) => onCh(e.target.value)}
          style={cellInp}
        />
      );
    }
    if (col.type === "granica" && isUgao(d.jedinica)) {
      return (
        <input
          value={v}
          inputMode="numeric"
          placeholder="44°00′00″"
          title="D° M′ S″ — npr. 440000 ili 444444"
          onChange={(e) => onCh(sanitizujUnosUgaoGranice(e.target.value))}
          style={{ ...cellInp, minWidth: 88 }}
        />
      );
    }
    if (col.type === "granica") {
      return (
        <input
          type="number"
          step="any"
          value={v}
          onChange={(e) => onCh(e.target.value)}
          style={cellInp}
        />
      );
    }
    return (
      <input
        value={v}
        onChange={(e) => onCh(e.target.value)}
        style={cellInp}
      />
    );
  };

  const sacuvaj = () => {
    const id = normalizujIdDeo(zaglavlje.id_deo);
    if (!id) {
      addToast?.("Unesi ID deo u zaglavlju.", "greska");
      return;
    }
    const novi = redoviIzGrupnogUnosa({ ...zaglavlje, id_deo: id }, dimenzije, prazanRed);
    if (!novi.length) {
      addToast?.("Unesi bar jednu karakteristiku u tabeli dimenzija.", "greska");
      return;
    }
    onSave(novi);
  };

  const idPrikaz = normalizujIdDeo(zaglavlje.id_deo);

  const dimenzijePanel = (
    <>
      <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
        DIMENZIJE ({popunjene} popunjeno / {dimenzije.length} redova)
      </div>
      <div style={{ overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 6, maxHeight: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: C.hover }}>
              <th style={{ width: 28, padding: "6px 4px", color: C.sivi, fontSize: 9 }}>#</th>
              {DIM_KOLONE.map((c) => (
                <th key={c.key} style={{ padding: "6px 4px", color: C.sivi, fontSize: 9, textAlign: "left", minWidth: c.minW }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dimenzije.map((d, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? `${C.border}18` : "transparent" }}>
                <td style={{ padding: "4px", color: C.sivi, textAlign: "center", fontSize: 9 }}>{idx + 1}</td>
                {DIM_KOLONE.map((col) => (
                  <td key={col.key} style={{ padding: "3px 4px", verticalAlign: "middle" }}>
                    {renderCell(d, idx, col)}
                    {col.type === "karakteristika" && (
                      <datalist id={`gu-kar-${idx}`}>
                        {(opcije.karakteristika || []).map((o) => (
                          <option key={String(o)} value={String(o)} />
                        ))}
                      </datalist>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const fieldMetaGrupna = {
    ...FIELD_META,
    slika: { ...FIELD_META.slika, sidePanel: dimenzijePanel },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>Grupni unos dela</div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.45, maxWidth: 560 }}>
            Popuni zaglavlje jednom, zatim sve dimenzije u tabeli ispod.
            Za slične mere: <strong style={{ color: C.tekst }}>=pred</strong> kopira nom/USL/LSL sa reda iznad; <strong style={{ color: C.tekst }}>dup</strong> ubacuje kopiju ispod.
            Jedan klik <strong style={{ color: C.tekst }}>Sačuvaj sve dimenzije</strong> dodaje {popunjene || "N"} redova u listu.
          </div>
        </div>
        {idPrikaz && (
          <span style={{ fontSize: 10, color: C.plava, fontWeight: 700 }}>{idPrikaz}</span>
        )}
      </div>

      <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
        ZAGLAVLJE DELA
      </div>
      <FormGrid
        C={C}
        cols={3}
        forma={zaglavlje}
        setForma={izmeniZaglavlje}
        fields={FORM_ZAGLAVLJE}
        fieldMeta={fieldMetaGrupna}
        opcije={opcije}
        addToast={addToast}
        onSave={() => {}}
        onCancel={onCancel}
        snima={false}
        hideActions
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 8px", flexWrap: "wrap", gap: 8 }}>
        <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
          DIMENZIJE ({popunjene} popunjeno / {dimenzije.length} redova)
        </div>
        <button type="button" onClick={dodajRed} style={btnStyle(C, C.hover, { fontSize: 9 })}>
          + još red
        </button>
      </div>

      <div style={{ overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: C.hover }}>
              <th style={{ width: 28, padding: "6px 4px", color: C.sivi, fontSize: 9 }}>#</th>
              {DIM_KOLONE.map((c) => (
                <th key={c.key} style={{ padding: "6px 4px", color: C.sivi, fontSize: 9, textAlign: "left", minWidth: c.minW }}>
                  {c.label}
                </th>
              ))}
              <th style={{ width: 72 }} />
            </tr>
          </thead>
          <tbody>
            {dimenzije.map((d, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? `${C.border}18` : "transparent" }}>
                <td style={{ padding: "4px", color: C.sivi, textAlign: "center", fontSize: 9 }}>{idx + 1}</td>
                {DIM_KOLONE.map((col) => (
                  <td key={col.key} style={{ padding: "3px 4px", verticalAlign: "middle" }}>
                    {renderCell(d, idx, col)}
                    {col.type === "karakteristika" && (
                      <datalist id={`gu-kar-${idx}`}>
                        {(opcije.karakteristika || []).map((o) => (
                          <option key={String(o)} value={String(o)} />
                        ))}
                      </datalist>
                    )}
                  </td>
                ))}
                <td style={{ padding: "3px 4px", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={() => duplirajPrethodni(idx)}
                    disabled={idx === 0}
                    title="Kopiraj nom, USL, LSL, tip, jedinicu… sa prethodnog reda"
                    style={{
                      ...cellInp,
                      width: "auto",
                      display: "inline-block",
                      padding: "2px 5px",
                      marginRight: 3,
                      cursor: idx === 0 ? "not-allowed" : "pointer",
                      color: C.plava,
                      opacity: idx === 0 ? 0.35 : 1,
                      fontSize: 9,
                    }}
                  >
                    =pred
                  </button>
                  <button
                    type="button"
                    onClick={() => duplirajKaoNoviRed(idx)}
                    title="Ubaci novi red ispod — kopija ovog (prazna karakteristika)"
                    style={{
                      ...cellInp,
                      width: "auto",
                      display: "inline-block",
                      padding: "2px 5px",
                      marginRight: 3,
                      cursor: "pointer",
                      color: C.plava,
                      fontSize: 9,
                    }}
                  >
                    dup
                  </button>
                  <button
                    type="button"
                    onClick={() => obrisiRed(idx)}
                    disabled={dimenzije.length <= 1}
                    style={{
                      ...cellInp,
                      width: "auto",
                      display: "inline-block",
                      padding: "2px 5px",
                      cursor: dimenzije.length <= 1 ? "not-allowed" : "pointer",
                      color: C.crvena,
                      opacity: dimenzije.length <= 1 ? 0.4 : 1,
                      fontSize: 9,
                    }}
                    title="Ukloni red"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={sacuvaj} style={btnStyle(C, C.zelena)}>
          Sačuvaj sve dimenzije ({popunjene || 0})
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...btnStyle(C, C.hover), color: C.sivi, background: "none", border: `1px solid ${C.border}` }}
        >
          Otkaži
        </button>
        <span style={{ color: C.sivi, fontSize: 9, alignSelf: "center" }}>
          {GLAVNI_UNOS_COL_BROJ_MERENJA}: prazno = {GLAVNI_UNOS_BROJ_MERENJA_DEFAULT} za merljive
        </span>
      </div>
    </div>
  );
}
