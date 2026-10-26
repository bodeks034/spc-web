import { useEffect, useMemo, useRef, useState } from "react";
import { GLAVNI_UNOS_SHEET_TIP, filtrirajSheetovePoTipu } from "../../lib/glavniUnosSheetTip.js";
import {
  etiketaLinije,
  grupisiLinije,
  jeLinijaProizvod,
  jeLinijaVozila,
  normalizujKodLinije,
  predlogSheetaZaLiniju,
} from "../../lib/linijaProizvoda.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";

const TIPOVI = [
  { id: GLAVNI_UNOS_SHEET_TIP.OPSTI, label: "Opšti deo", opis: "Nezavisno od vozila/proizvoda (zavrtanj, lim…)" },
  { id: GLAVNI_UNOS_SHEET_TIP.PROJEKAT, label: "Komponenta", opis: "Deo vezan za izabrano vozilo ili proizvod (tip_kontrole=deo)" },
  { id: GLAVNI_UNOS_SHEET_TIP.FINAL, label: "Finalna kontrola", opis: "Vozilo → dijagram; proizvod → grupni unos bez dijagrama" },
];

function tipGUzaUnos(tipSheet, linijaKod) {
  if (tipSheet === GLAVNI_UNOS_SHEET_TIP.OPSTI) return GLAVNI_UNOS_SHEET_TIP.OPSTI;
  if (tipSheet === GLAVNI_UNOS_SHEET_TIP.FINAL) {
    return jeLinijaVozila(linijaKod) ? GLAVNI_UNOS_SHEET_TIP.FINAL : GLAVNI_UNOS_SHEET_TIP.PROJEKAT;
  }
  return GLAVNI_UNOS_SHEET_TIP.PROJEKAT;
}

export default function NoviDeoWizard({
  C,
  sheetovi,
  sheetKonfiguracije = [],
  tipoviVozila = [],
  wizardPreset = null,
  radnaLinija = "",
  onCancel,
  onKreirajSheet,
  onIzaberiSheet,
  onGrupniUnos,
  onFinalVozilo,
}) {
  const { vozila, proizvodi, ostalo } = useMemo(() => grupisiLinije(tipoviVozila), [tipoviVozila]);

  const [korak, setKorak] = useState(1);
  const [tip, setTip] = useState(GLAVNI_UNOS_SHEET_TIP.PROJEKAT);
  const [linijaKod, setLinijaKod] = useState("");
  const [sablonId, setSablonId] = useState("");
  const [sheetIme, setSheetIme] = useState("");
  const [kreira, setKreira] = useState(false);
  const autoPotvrdioRef = useRef(null);
  const INP = inpStyle(C);

  useEffect(() => {
    autoPotvrdioRef.current = null;
  }, [wizardPreset?.ts]);

  useEffect(() => {
    if (!wizardPreset?.linijaKod && wizardPreset?.tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && !radnaLinija) return;
    if (wizardPreset?.tip === GLAVNI_UNOS_SHEET_TIP.OPSTI) {
      setTip(GLAVNI_UNOS_SHEET_TIP.OPSTI);
      setSheetIme("opsti_1");
      setKorak(2);
      return;
    }
    const kod = normalizujKodLinije(wizardPreset?.linijaKod || radnaLinija);
    if (!kod) return;
    setLinijaKod(kod);
    const presetTip = wizardPreset?.tip || GLAVNI_UNOS_SHEET_TIP.PROJEKAT;
    setTip(presetTip === GLAVNI_UNOS_SHEET_TIP.FINAL
      ? GLAVNI_UNOS_SHEET_TIP.FINAL
      : GLAVNI_UNOS_SHEET_TIP.PROJEKAT);
    const vrsta = presetTip === GLAVNI_UNOS_SHEET_TIP.FINAL ? "final" : "delovi";
    setSheetIme(predlogSheetaZaLiniju(kod, vrsta));
    setKorak(2);
  }, [wizardPreset?.linijaKod, wizardPreset?.tip, wizardPreset?.ts, radnaLinija]);

  useEffect(() => {
    if (wizardPreset?.linijaKod || wizardPreset?.tip === GLAVNI_UNOS_SHEET_TIP.OPSTI) return;
    if (!radnaLinija || korak !== 1) return;
    const kod = normalizujKodLinije(radnaLinija);
    setLinijaKod(kod);
    setTip(GLAVNI_UNOS_SHEET_TIP.PROJEKAT);
    setSheetIme(predlogSheetaZaLiniju(kod, "delovi"));
    setKorak(2);
  }, [radnaLinija, wizardPreset?.linijaKod, wizardPreset?.tip, korak]);

  const erp = linijaKod.trim().toUpperCase();
  const tipZaSheet = tipGUzaUnos(tip, erp);
  const predlog = tip === GLAVNI_UNOS_SHEET_TIP.FINAL
    ? predlogSheetaZaLiniju(erp, "final")
    : predlogSheetaZaLiniju(erp, "delovi");
  const prikazSheetovi = filtrirajSheetovePoTipu(sheetovi, sheetKonfiguracije, tipZaSheet, erp);

  const nastaviTip = () => {
    setSheetIme(tip === GLAVNI_UNOS_SHEET_TIP.OPSTI ? "opsti_1" : predlog);
    setKorak(2);
  };

  const sifraZaNoviSheet = (naziv) => {
    if (tip === GLAVNI_UNOS_SHEET_TIP.OPSTI) return null;
    if (/_final\b/i.test(naziv) || tip === GLAVNI_UNOS_SHEET_TIP.FINAL) return null;
    return erp || null;
  };

  const kreirajIliIzaberi = async (ime) => {
    const naziv = String(ime || sheetIme || predlog).trim().toLowerCase();
    if (!naziv) return;
    setKreira(true);
    try {
      if (!sheetovi.includes(naziv)) {
        await onKreirajSheet?.({
          naziv,
          sifraVozila: sifraZaNoviSheet(naziv),
        });
      }
      onIzaberiSheet?.(naziv, { sablonId: sablonId.trim() || null, linijaKod: erp || null });
      if (tip === GLAVNI_UNOS_SHEET_TIP.FINAL && jeLinijaVozila(erp)) {
        onFinalVozilo?.();
      } else {
        onGrupniUnos?.();
      }
      onCancel?.();
    } finally {
      setKreira(false);
    }
  };

  useEffect(() => {
    if (!wizardPreset?.autoPotvrdi || korak !== 2 || kreira) return;
    const autoKey = wizardPreset.ts;
    if (autoPotvrdioRef.current === autoKey) return;
    const naziv = String(sheetIme || predlog).trim().toLowerCase();
    if (!naziv) return;
    autoPotvrdioRef.current = autoKey;
    kreirajIliIzaberi(naziv);
  }, [wizardPreset?.autoPotvrdi, wizardPreset?.ts, korak, sheetIme, predlog, kreira]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderLinijaSelect = () => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>
        {tip === GLAVNI_UNOS_SHEET_TIP.FINAL ? "Vozilo ili proizvod *" : "Linija (vozilo / proizvod) *"}
      </span>
      <select
        data-testid="wizard-linija-select"
        value={linijaKod}
        onChange={(e) => setLinijaKod(e.target.value)}
        style={{ ...INP, width: "100%", marginTop: 4 }}
      >
        <option value="">— izaberi —</option>
        {vozila.length > 0 && (
          <optgroup label="Vozila (VOZ-XX)">
            {vozila.map((t) => (
              <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
            ))}
          </optgroup>
        )}
        {proizvodi.length > 0 && (
          <optgroup label="Proizvodi (PRO-XX)">
            {proizvodi.map((t) => (
              <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
            ))}
          </optgroup>
        )}
        {ostalo.length > 0 && (
          <optgroup label="Ostale linije">
            {ostalo.map((t) => (
              <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
            ))}
          </optgroup>
        )}
      </select>
      {linijaKod && jeLinijaProizvod(linijaKod) && tip === GLAVNI_UNOS_SHEET_TIP.FINAL && (
        <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 4 }}>
          Proizvod se ne kontroliše dijagramom — finalna kontrola ide kao običan deo (grupni unos).
        </span>
      )}
    </label>
  );

  return (
    <div
      data-testid="novi-deo-wizard"
      style={{
        background: C.panel,
        border: `2px solid ${C.plava}66`,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>
          Čarobnjak — novi deo {radnaLinija && korak === 2 ? `(${radnaLinija})` : `(korak ${korak}/2)`}
        </div>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {korak === 1 && (
        <>
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>Izaberi tip unosa:</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {TIPOVI.map((t) => (
              <label
                key={t.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${tip === t.id ? C.plava : C.border}`,
                  background: tip === t.id ? `${C.plava}15` : C.bg,
                  cursor: "pointer",
                }}
              >
                <input type="radio" checked={tip === t.id} onChange={() => setTip(t.id)} />
                <span>
                  <strong style={{ color: C.tekst, fontSize: 11 }}>{t.label}</strong>
                  <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 2 }}>{t.opis}</span>
                </span>
              </label>
            ))}
          </div>
          {tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && renderLinijaSelect()}
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Kopiraj strukturu sa dela (opciono)</span>
            <input
              data-testid="wizard-sablon-id"
              value={sablonId}
              onChange={(e) => setSablonId(e.target.value.toUpperCase())}
              placeholder="npr. VOZ-01-NM-001"
              style={{ ...INP, width: "100%", marginTop: 4 }}
            />
          </label>
          <button
            type="button"
            onClick={nastaviTip}
            disabled={tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && !linijaKod.trim()}
            style={btnStyle(C, C.plava, { disabled: tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && !linijaKod.trim() })}
          >
            Dalje → sheet
          </button>
        </>
      )}

      {korak === 2 && (
        <>
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
            {tip === GLAVNI_UNOS_SHEET_TIP.OPSTI
              ? "Opšti delovi — sheet opsti_1:"
              : `Sheet za ${erp || "liniju"}:`}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {prikazSheetovi.map((s) => (
              <button key={s} type="button" onClick={() => kreirajIliIzaberi(s)}
                style={btnStyle(C, sheetIme === s ? C.plava : C.hover, { fontSize: 9 })}>
                {s}
              </button>
            ))}
          </div>
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Novi sheet</span>
            <input value={sheetIme || predlog} onChange={(e) => setSheetIme(e.target.value)}
              style={{ ...INP, width: "100%", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setKorak(1)} style={btnStyle(C, C.hover)}>← Nazad</button>
            <button type="button" disabled={kreira} onClick={() => kreirajIliIzaberi(sheetIme || predlog)}
              style={btnStyle(C, C.plava, { disabled: kreira })}>
              {kreira ? "…" : "Koristi sheet →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
