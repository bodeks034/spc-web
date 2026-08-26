import { useEffect, useMemo, useState } from "react";
import {
  analizaSheeta,
  grupisiSheetovePoLiniji,
  kljucLinijeIzSheeta,
  kljucLinijeSheeta,
  metaSheetNaziva,
  sheetIzKljucaLinije,
  SHEET_GRUPA,
} from "../../lib/glavniUnosSheetTip.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";
import { kljucRadneLinije } from "../../lib/sifrarnikRadnaLinija.js";

function bedzBoja(tip, C) {
  if (tip === "final") return C.narandzasta || "#f59e0b";
  if (tip === "projekat") return C.plava;
  return C.sivi;
}

/**
 * Kompaktan birač sheeta — linija (VOZ/PRO) + Komponente/Final umesto 40+ pill dugmadi.
 */
export default function GlavniUnosSheetBirac({
  C,
  sheetovi,
  sheetKonfiguracije,
  aktivniSheet,
  onPromeniSheet,
  onNoviDeo,
  onToggleKlon,
  klonOtvoren,
  fokusLinijaKod = "",
}) {
  const grupe = useMemo(() => grupisiSheetovePoLiniji(sheetovi), [sheetovi]);
  const [kljucLinije, setKljucLinije] = useState("");
  const [vrsta, setVrsta] = useState("delovi");
  const [prikaziSve, setPrikaziSve] = useState(false);

  const ukupnoLinija = grupe.vozila.length + grupe.proizvodi.length + grupe.opsti.length + grupe.legacy.length;
  const kompaktno = ukupnoLinija > 6 && !prikaziSve;

  useEffect(() => {
    const k = kljucLinijeIzSheeta(aktivniSheet, grupe);
    if (k) {
      setKljucLinije(k);
      const meta = metaSheetNaziva(aktivniSheet);
      if (meta.vrsta === "final") setVrsta("final");
      else if (meta.grupa !== SHEET_GRUPA.LEGACY) setVrsta("delovi");
    }
  }, [aktivniSheet, grupe]);

  useEffect(() => {
    if (!fokusLinijaKod) return;
    const k = kljucRadneLinije(fokusLinijaKod);
    if (!k || k === kljucLinije) return;
    setKljucLinije(k);
    const v = k.startsWith("legacy:") || k.startsWith("opsti:") ? "delovi" : vrsta;
    primeniSheet(k, v);
  }, [fokusLinijaKod]); // eslint-disable-line react-hooks/exhaustive-deps

  const primeniSheet = (k, v) => {
    const sheet = sheetIzKljucaLinije(k, v, grupe);
    if (sheet && sheet !== aktivniSheet) onPromeniSheet?.(sheet);
  };

  const onChangeLinija = (k) => {
    setKljucLinije(k);
    const v = k.startsWith("legacy:") || k.startsWith("opsti:") ? "delovi" : vrsta;
    primeniSheet(k, v);
  };

  const onChangeVrsta = (v) => {
    setVrsta(v);
    if (kljucLinije) primeniSheet(kljucLinije, v);
  };

  const aktivniKonfig = sheetKonfiguracije.find((r) => r.naziv === aktivniSheet);
  const analizaAktivnog = analizaSheeta([], { ...aktivniKonfig, naziv: aktivniSheet });
  const aktivniMeta = metaSheetNaziva(aktivniSheet);

  const imaFinal = kljucLinije && !!sheetIzKljucaLinije(kljucLinije, "final", grupe);
  const imaDelovi = kljucLinije && !!sheetIzKljucaLinije(kljucLinije, "delovi", grupe);
  const linijaPar = !kljucLinije.startsWith("legacy:") && !kljucLinije.startsWith("opsti:") && !!kljucLinije;

  if (!kompaktno) {
    return (
      <div style={{ marginBottom: 8 }}>
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
                onClick={() => onPromeniSheet?.(s)}
                style={{
                  background: aktivniSheet === s ? `${C.plava}22` : C.panel,
                  border: `1px solid ${aktivniSheet === s ? C.plava : C.border}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: aktivniSheet === s ? 700 : 400,
                  color: aktivniSheet === s ? C.plava : C.sivi,
                }}
                title={bedz.opis}
              >
                {s}
                <span style={{ color: bedzBoja(bedz.tip, C), fontWeight: 600 }}>
                  {" · "}{bedz.kratko}
                </span>
              </button>
            );
          })}
          <button type="button" onClick={onNoviDeo} style={btnStyle(C, C.zelena, { fontSize: 9 })}>
            + Novi deo
          </button>
          <button type="button" onClick={onToggleKlon} style={btnStyle(C, C.hover, { fontSize: 9 })}>
            {klonOtvoren ? "▾ Kloniraj deo" : "▸ Kloniraj deo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="gu-sheet-birac-kompakt"
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.panel,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <label style={{ flex: "1 1 160px", minWidth: 140 }}>
          <span style={{ display: "block", color: C.sivi, fontSize: 9, marginBottom: 4 }}>Linija proizvoda</span>
          <select
            data-testid="gu-sheet-linija-select"
            value={kljucLinije}
            onChange={(e) => onChangeLinija(e.target.value)}
            style={{
              width: "100%",
              fontSize: 11,
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.tekst,
            }}
          >
            <option value="">— izaberi liniju —</option>
            {grupe.opsti.length > 0 && (
              <optgroup label="Opšti delovi">
                {grupe.opsti.map((s) => {
                  const meta = metaSheetNaziva(s);
                  return (
                    <option key={s} value={kljucLinijeSheeta(meta, s)}>{s}</option>
                  );
                })}
              </optgroup>
            )}
            {grupe.vozila.length > 0 && (
              <optgroup label="Vozila (VOZ)">
                {grupe.vozila.map(([kod]) => (
                  <option key={kod} value={`voz:${kod}`}>{kod}</option>
                ))}
              </optgroup>
            )}
            {grupe.proizvodi.length > 0 && (
              <optgroup label="Proizvodi (PRO)">
                {grupe.proizvodi.map(([kod]) => (
                  <option key={kod} value={`pro:${kod}`}>{kod}</option>
                ))}
              </optgroup>
            )}
            {grupe.legacy.length > 0 && (
              <optgroup label="Legacy (stari sheetovi)">
                {grupe.legacy.map((s) => (
                  <option key={s} value={`legacy:${s}`}>{s}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {linijaPar && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              data-testid="gu-sheet-vrsta-delovi"
              disabled={!imaDelovi}
              onClick={() => onChangeVrsta("delovi")}
              style={btnStyle(C, vrsta === "delovi" ? C.plava : C.hover, {
                fontSize: 10,
                opacity: imaDelovi ? 1 : 0.45,
              })}
            >
              Komponente
            </button>
            <button
              type="button"
              data-testid="gu-sheet-vrsta-final"
              disabled={!imaFinal}
              onClick={() => onChangeVrsta("final")}
              style={btnStyle(C, vrsta === "final" ? (C.narandzasta || "#f59e0b") : C.hover, {
                fontSize: 10,
                opacity: imaFinal ? 1 : 0.45,
              })}
            >
              Final
            </button>
          </div>
        )}

        <button type="button" onClick={onToggleKlon} style={btnStyle(C, C.hover, { fontSize: 9 })}>
          {klonOtvoren ? "▾ Kloniraj" : "▸ Kloniraj"}
        </button>
        <button
          type="button"
          onClick={() => setPrikaziSve(true)}
          style={{ ...btnStyle(C, C.hover, { fontSize: 9 }), marginLeft: "auto" }}
          title="Prikaži svih sheetova kao listu dugmadi"
        >
          Svi sheetovi ({sheetovi.length})
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: C.sivi, lineHeight: 1.45 }}>
        Aktivni:{" "}
        <strong style={{ color: C.tekst }}>{aktivniSheet}</strong>
        {" · "}
        <span style={{ color: bedzBoja(analizaAktivnog.tip, C), fontWeight: 600 }}>
          {analizaAktivnog.kratko}
        </span>
        {aktivniMeta.kod && (
          <span> — unos delova za <strong style={{ color: C.tekst }}>{aktivniMeta.kod}</strong></span>
        )}
      </div>
    </div>
  );
}
