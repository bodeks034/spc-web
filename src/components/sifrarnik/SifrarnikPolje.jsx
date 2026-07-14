import { useState, useEffect, useRef } from "react";
import { inpStyle, btnStyle } from "./sifrarnikPanelStyle.js";
import { ucitajPrikazSliku } from "../../lib/slikePaths.js";
import { supabase } from "../../lib/supabaseClient.js";
import { uploadSlikaSifrarnik, uploadSlikaVoziloSop, uploadSlikaVoziloDijagram } from "../../lib/sifrarnikSlikeApi.js";
import { dijagramUrlZaPrikaz } from "../../lib/voziloDijagramConfig.js";
import { sanitizujUnosUgaoGranice } from "../../lib/glavniUnosGranice.js";
import CrtezSplitModal from "../CrtezSplitModal.jsx";

export function DatalistPolje({ C, id, label, value, onChange, opcije = [], placeholder }) {
  const INP = inpStyle(C);
  const listId = `dl-${id}`;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <input
        list={listId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={INP}
      />
      <datalist id={listId}>
        {opcije.map((o) => (
          <option key={String(o)} value={String(o)} />
        ))}
      </datalist>
    </label>
  );
}

export function SelectPolje({ C, label, value, onChange, opcije = [] }) {
  const INP = inpStyle(C);
  const norm = opcije.map((o) => (
    typeof o === "object" && o != null && "value" in o
      ? o
      : { value: String(o), label: String(o) }
  ));
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...INP, cursor: "pointer" }}
      >
        <option value="">— izaberi —</option>
        {norm.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function PogonTekst({ kod, format }) {
  return <span title={kod || ""}>{format ? format(kod) : (kod || "—")}</span>;
}

export function PogonPolje({ C, label, value, onChange, opcije = [] }) {
  return (
    <SelectPolje
      C={C}
      label={label}
      value={value}
      onChange={onChange}
      opcije={opcije}
    />
  );
}

export function OperacijaPolje({
  C, label, value, onChange, linija, linijaOperacija, sveOperacije = [],
}) {
  const l = String(linija || "").trim();
  const opcije = l && linijaOperacija?.[l]?.length
    ? linijaOperacija[l]
    : sveOperacije;
  return (
    <SelectPolje
      C={C}
      label={l ? `${label} (${l})` : label}
      value={value}
      onChange={onChange}
      opcije={opcije}
    />
  );
}

export function UgaoGranicaPolje({ C, label, value, onChange }) {
  const INP = inpStyle(C);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <input
        value={value ?? ""}
        inputMode="numeric"
        placeholder="440000 = 44°00′00″"
        onChange={(e) => onChange(sanitizujUnosUgaoGranice(e.target.value))}
        style={INP}
      />
      <span style={{ color: C.sivi, fontSize: 8, lineHeight: 1.3 }}>
        Stepeni: unesi cifre D° M′ S″ (npr. 444444 = 44°44′44″)
      </span>
    </label>
  );
}

export function SelectMasinaPolje({ C, label, value, onChange, masine = [], linija }) {
  const INP = inpStyle(C);
  const filtrirane = linija
    ? masine.filter((m) => !m.linija || String(m.linija).trim() === String(linija).trim())
    : masine;
  const prikaz = filtrirane.length ? filtrirane : masine;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...INP, cursor: "pointer" }}
      >
        <option value="">— izaberi —</option>
        {prikaz.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </label>
  );
}

export function ReadonlyPolje({ C, label, value, hint }) {
  const INP = inpStyle(C);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <input
        readOnly
        value={value ?? ""}
        title={hint || "Automatski popunjeno pri unosu"}
        style={{ ...INP, opacity: 0.85, cursor: "default", color: C.sivi }}
      />
    </label>
  );
}

export function SlikaPolje({
  C, label, value, onChange, idDeo, modul = "merljive", voziloSop = false, voziloDijagram = false,
  sidePanel = null, addToast,
}) {
  const INP = inpStyle(C);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [zoomFull, setZoomFull] = useState(false);
  const refId = String(idDeo || "").trim();

  useEffect(() => {
    let cancelled = false;
    if (!value && !refId) {
      setPreview(null);
      return undefined;
    }
    const load = voziloDijagram
      ? dijagramUrlZaPrikaz(value, supabase)
      : ucitajPrikazSliku(supabase, modul, value, refId);
    load.then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => { cancelled = true; };
  }, [value, refId, modul, voziloDijagram]);

  const upload = async (file) => {
    if (!file) return;
    if (!refId) {
      addToast?.(voziloSop || voziloDijagram ? "Prvo unesi kod tipa vozila" : "Prvo unesi ID dela pa uvezi sliku", "greska");
      return;
    }
    setUploading(true);
    try {
      const ime = voziloDijagram
        ? await uploadSlikaVoziloDijagram(file, refId)
        : voziloSop
          ? await uploadSlikaVoziloSop(file, refId)
          : await uploadSlikaSifrarnik(file, { modul, id: refId });
      onChange(ime);
      const url = voziloDijagram
        ? await dijagramUrlZaPrikaz(ime, supabase)
        : await ucitajPrikazSliku(supabase, modul, ime, refId);
      setPreview(url);
      addToast?.("✓ Slika uvezena", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: "1 / -1" }}>
      <span style={{ color: C.sivi, fontSize: 9 }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={voziloDijagram ? "/vozilo/dijagrami/MRAP.png ili uvezi PNG…" : "naziv fajla ili uvezi…"}
          style={{ ...INP, flex: 1, minWidth: 160 }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={btnStyle(C, C.plava, { disabled: uploading })}
        >
          {uploading ? "…" : "Uvezi sliku"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {preview && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setZoomFull(true)}
            title="Otvori crtež — zoom, pomeranje, pored polja za dimenzije"
            style={{
              padding: 0, border: `1px solid ${C.border}`, borderRadius: 4,
              background: C.onAkcent, cursor: "pointer", overflow: "hidden", flexShrink: 0,
            }}
          >
            <img
              src={preview}
              alt="Crtež — pregled"
              style={{ display: "block", width: 72, height: 52, objectFit: "contain" }}
            />
          </button>
          <button
            type="button"
            onClick={() => setZoomFull(true)}
            style={btnStyle(C, C.plava, { fontSize: 9, padding: "5px 10px" })}
          >
            {sidePanel ? "⛶ Crtež + dimenzije" : "⛶ Otvori crtež"}
          </button>
          <span style={{ color: C.sivi, fontSize: 9 }}>
            Zoom i pomeranje u prozoru{sidePanel ? " · pored — unos dimenzija" : ""}
          </span>
        </div>
      )}
      {zoomFull && preview && (
        <CrtezSplitModal
          url={preview}
          C={C}
          onClose={() => setZoomFull(false)}
          sidePanel={sidePanel}
          title={sidePanel ? "Crtež i dimenzije" : "Crtež dela"}
        />
      )}
    </div>
  );
}
