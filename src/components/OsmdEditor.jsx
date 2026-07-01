import { useState, useMemo, useEffect, useRef } from "react";
import { POLJA_8D, POLJA_PRILOZI } from "../lib/osmdIzvestajPdf.js";
import { fetchTipoviVozila } from "../lib/sifrarnikApi.js";
import { buildOsmdIdDeoOpcije, nadjiOsmdDeo, resolveOsmdIdDeoZaBazu, porukaNepoznatOsmdId } from "../lib/osmdIdDeoOpcije.js";
import {
  ZAGLAVLJE_8D_POLJA, KLASE_GRESKE, BEZBEDNOST_OPCIJE,
  zaglavljeIzIzvestaja, danasIsoDatum,
} from "../lib/osmdZaglavlje.js";
import {
  parseD2, serializeD2,
  parseD4, serializeD4,
  parseD6, serializeD6,
  parseD8, serializeD8,
  D2_W1H_KOLONE, M6_KATEGORIJE, D6_STATUSI,
  praznaGrana5Why, praznaGrupaLista,
  parseGrupaLista, serializeGrupaLista,
  parseLista, serializeLista, poljeJePopunjeno, brojPopunjenihOsmd,
} from "../lib/osmdStruktura.js";
import {
  PFMEA_REF_POLJA, CP_REF_POLJA,
  pfmeaRefZaEditor, cpRefZaEditor,
  pfmeaRefIzEditora, cpRefIzEditora,
} from "../lib/pfmeaControlPlan.js";
import { supabase as defaultSupabase } from "../lib/supabaseClient.js";
import OsmdPaketPregled from "./kvalitet/OsmdPaketPregled.jsx";

/** Skrol zona za 8D — radi u analitici (atributivne/merljive) gde roditelj ima overflow:hidden. */
export function OsmdScrollOkvir({ children, style }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      width: "100%",
      maxHeight: "calc(100dvh - 132px)",
      boxSizing: "border-box",
      paddingBottom: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Zaglavlje8D({ form, setForm, C, INP }) {
  const set = (key, v) => setForm((p) => ({ ...p, [key]: v }));
  const INPsm = { ...INP, fontSize: 11, padding: "6px 8px" };
  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 };
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 10,
  };

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 14,
    }}>
      <div style={{ color: C.plava, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>
        ZAGLAVLJE 8D IZVEŠTAJA
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>Defekt / nedostatak</div>
        <input
          value={form.defekt_nedostatak || ""}
          onChange={(e) => setForm((p) => ({ ...p, defekt_nedostatak: e.target.value }))}
          placeholder="npr. Pukotina zavara u HAZ zoni"
          style={{ ...INPsm, width: "100%" }}
        />
      </div>
      <div style={grid}>
        {ZAGLAVLJE_8D_POLJA.map((p) => (
          <div key={p.key}>
            <div style={lbl}>{p.label}</div>
            {p.type === "date" ? (
              <input
                type="date"
                value={form[p.key] || ""}
                onChange={(e) => set(p.key, e.target.value)}
                style={INPsm}
              />
            ) : p.type === "klasa" ? (
              <select
                value={form[p.key] || ""}
                onChange={(e) => set(p.key, e.target.value)}
                style={{ ...INPsm, cursor: "pointer" }}
              >
                {KLASE_GRESKE.map((o) => (
                  <option key={o.value || "x"} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : p.type === "bezbednost" ? (
              <select
                value={form[p.key] || ""}
                onChange={(e) => set(p.key, e.target.value)}
                style={{ ...INPsm, cursor: "pointer" }}
              >
                {BEZBEDNOST_OPCIJE.map((o) => (
                  <option key={o.value || "x"} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                value={form[p.key] || ""}
                onChange={(e) => set(p.key, e.target.value)}
                placeholder={p.ph || p.label}
                style={INPsm}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ensureMinGrupe(parsed, minGrupe) {
  const grupe = [...parsed.grupe];
  while (grupe.length < minGrupe) grupe.push(praznaGrupaLista());
  return { ...parsed, grupe };
}

/** D3/D7 — naslov + nabrajanje; minGrupe = početni broj blokova (D3: 3, D7: 1). */
function GrupaListaUnos({ value, onChange, placeholder, minGrupe = 1, C, INP }) {
  const valueRef = useRef(value);
  const [draft, setDraft] = useState(() =>
    ensureMinGrupe(parseGrupaLista(value, minGrupe), minGrupe),
  );

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setDraft(ensureMinGrupe(parseGrupaLista(value, minGrupe), minGrupe));
    }
  }, [value, minGrupe]);

  const commit = (grupe) => {
    const next = ensureMinGrupe({ _fmt: 4, grupe }, minGrupe);
    setDraft(next);
    const ser = serializeGrupaLista(next);
    valueRef.current = ser;
    onChange(ser);
  };

  const setGrupa = (gi, patch) => {
    commit(draft.grupe.map((g, j) => (j === gi ? { ...g, ...patch } : g)));
  };

  const setStavka = (gi, si, v) => {
    const stavke = [...draft.grupe[gi].stavke];
    stavke[si] = v;
    setGrupa(gi, { stavke });
  };

  const dodajStavku = (gi) => {
    setGrupa(gi, { stavke: [...draft.grupe[gi].stavke, ""] });
  };

  const ukloniStavku = (gi, si) => {
    const stavke = draft.grupe[gi].stavke.filter((_, j) => j !== si);
    setGrupa(gi, { stavke: stavke.length ? stavke : [""] });
  };

  const dodajGrupu = () => commit([...draft.grupe, praznaGrupaLista()]);
  const ukloniGrupu = (gi) => commit(draft.grupe.filter((_, j) => j !== gi));

  const d = draft;

  const box = {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    background: C.hover,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {d.grupe.map((g, gi) => (
        <div key={gi} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.plava, fontSize: 10, fontWeight: 700 }}>
              {minGrupe > 1 ? `Akcija ${gi + 1}` : "Preventivna mera"}
            </span>
            {d.grupe.length > minGrupe && (
              <button type="button" onClick={() => ukloniGrupu(gi)}
                style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 16 }}
                aria-label="Ukloni">×</button>
            )}
          </div>
          <input
            value={g.naslov}
            onChange={(e) => setGrupa(gi, { naslov: e.target.value })}
            placeholder={gi === 0 ? placeholder : `Naslov / opis ${gi + 1}…`}
            style={{ ...INP, fontSize: 11, padding: "6px 8px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {g.stavke.map((s, si) => (
              <div key={si} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: C.plava, fontSize: 14, fontWeight: 700, width: 16, flexShrink: 0 }}>•</span>
                <input
                  value={s}
                  onChange={(e) => setStavka(gi, si, e.target.value)}
                  placeholder={si === 0 ? "Stavka…" : `Stavka ${si + 1}`}
                  style={{ ...INP, flex: 1, fontSize: 11, padding: "6px 8px" }}
                />
                {g.stavke.length > 1 && (
                  <button type="button" onClick={() => ukloniStavku(gi, si)}
                    style={{
                      background: "none", border: "none", color: C.sivi, cursor: "pointer",
                      fontSize: 16, padding: "0 4px", lineHeight: 1,
                    }} aria-label="Ukloni stavku">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => dodajStavku(gi)}
              style={{
                alignSelf: "flex-start", background: "transparent", border: `1px dashed ${C.border}`,
                borderRadius: 6, color: C.sivi, fontSize: 10, padding: "4px 10px", cursor: "pointer",
              }}>
              + Dodaj stavku
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={dodajGrupu}
        style={{
          alignSelf: "flex-start", background: C.hover, border: `1px dashed ${C.border}`,
          borderRadius: 6, color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
        }}>
        + Dodaj {minGrupe > 1 ? "akciju" : "meru"}
      </button>
    </div>
  );
}

function ListaUnos({ value, onChange, placeholder, C, INP }) {
  const valueRef = useRef(value);
  const [stavke, setStavkeLocal] = useState(() => {
    const p = parseLista(value);
    return p.length ? p : [""];
  });

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      const p = parseLista(value);
      setStavkeLocal(p.length ? p : [""]);
    }
  }, [value]);

  const commit = (next) => {
    setStavkeLocal(next);
    const ser = serializeLista(next);
    valueRef.current = ser;
    onChange(ser);
  };

  const promeni = (i, v) => {
    const n = [...stavke];
    n[i] = v;
    commit(n);
  };

  const dodaj = () => commit([...stavke, ""]);
  const ukloni = (i) => {
    const n = stavke.filter((_, j) => j !== i);
    commit(n.length ? n : [""]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {stavke.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: C.plava, fontSize: 14, fontWeight: 700, width: 16, flexShrink: 0 }}>•</span>
          <input
            value={s}
            onChange={(e) => promeni(i, e.target.value)}
            placeholder={i === 0 ? placeholder : `Stavka ${i + 1}`}
            style={{ ...INP, flex: 1 }}
          />
          {stavke.length > 1 && (
            <button type="button" onClick={() => ukloni(i)}
              style={{
                background: "none", border: "none", color: C.sivi, cursor: "pointer",
                fontSize: 16, padding: "0 4px", lineHeight: 1,
              }} aria-label="Ukloni">×</button>
          )}
        </div>
      ))}
      <button type="button" onClick={dodaj}
        style={{
          alignSelf: "flex-start", background: C.hover, border: `1px dashed ${C.border}`,
          borderRadius: 6, color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
        }}>
        + Dodaj stavku
      </button>
    </div>
  );
}

function D2Tabela({ value, onChange, C, INP }) {
  const d = useMemo(() => parseD2(value), [value]);
  const set = (patch) => onChange(serializeD2({ ...d, ...patch }));
  const TA = { ...INP, fontSize: 11, padding: "6px 8px", resize: "vertical", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
        5W1H — opis problema (5w1h.xlsx)
      </div>
      {D2_W1H_KOLONE.map(({ key, label, hint, rows }) => (
        <div key={key}>
          <div style={{ color: C.tekst, fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          {hint && <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>{hint}</div>}
          <textarea
            value={d[key] || ""}
            onChange={(e) => set({ [key]: e.target.value })}
            placeholder={hint || label}
            rows={rows || 2}
            style={TA}
          />
        </div>
      ))}
    </div>
  );
}

function AutoTextarea({ value, onChange, placeholder, style, minRows = 2 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`;
  }, [value, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={minRows}
      style={{ ...style, overflow: "hidden", resize: "none" }}
    />
  );
}

function D4PetZastoM6({ value, onChange, C, INP }) {
  const valueRef = useRef(value);
  const [draft, setDraft] = useState(() => parseD4(value));

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setDraft(parseD4(value));
    }
  }, [value]);

  const commit = (next) => {
    setDraft(next);
    const ser = serializeD4(next);
    valueRef.current = ser;
    onChange(ser);
  };

  const set = (patch) => commit({ ...draft, ...patch });
  const setM6 = (key, v) => set({ m6: { ...draft.m6, [key]: v } });

  const setGrana = (gi, patch) => {
    commit({
      ...draft,
      grane: draft.grane.map((g, j) => (j === gi ? { ...g, ...patch } : g)),
    });
  };
  const setGranaWhy = (gi, wi, v) => {
    const why = [...draft.grane[gi].why];
    why[wi] = v;
    setGrana(gi, { why });
  };
  const dodajGranu = () => commit({ ...draft, grane: [...draft.grane, praznaGrana5Why()] });
  const ukloniGranu = (gi) => {
    const grane = draft.grane.filter((_, j) => j !== gi);
    commit({ ...draft, grane: grane.length ? grane : [praznaGrana5Why()] });
  };

  const d = draft;

  const lbl = { color: C.tekst, fontSize: 10, fontWeight: 600, marginBottom: 4 };
  const hint = { color: C.sivi, fontSize: 9, marginBottom: 4 };
  const TA = {
    ...INP, fontSize: 11, padding: "6px 8px", resize: "vertical", width: "100%",
    minHeight: 44, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word",
  };
  const INPsm = { ...INP, fontSize: 11, padding: "6px 8px", width: "100%" };
  const metaGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 8,
  };
  const granaBox = {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    background: C.hover,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
  const stavka = { display: "flex", flexDirection: "column", gap: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
          5 ZAŠTO — uvod
        </div>
        <div style={metaGrid}>
          <div>
            <div style={hint}>Klasifikacija</div>
            <select value={d.klasifikacija} onChange={(e) => set({ klasifikacija: e.target.value })}
              style={{ ...INPsm, cursor: "pointer" }}>
              <option value="">—</option>
              <option value="sistemski">Sistemski</option>
              <option value="sporadic">Sporadičan</option>
            </select>
          </div>
          <div>
            <div style={hint}>Datum početka</div>
            <input type="date" value={d.datum_pocetka} onChange={(e) => set({ datum_pocetka: e.target.value })} style={INPsm} />
          </div>
          <div>
            <div style={hint}>Datum završetka</div>
            <input type="date" value={d.datum_zavrsetka} onChange={(e) => set({ datum_zavrsetka: e.target.value })} style={INPsm} />
          </div>
        </div>
        <div style={{ ...stavka, marginTop: 10 }}>
          <div style={lbl}>Opis problema</div>
          <textarea value={d.opis_problema} onChange={(e) => set({ opis_problema: e.target.value })}
            placeholder="Detaljan opis…" rows={3} style={TA} />
        </div>
      </div>

      <div>
        <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
          5 ZAŠTO — analiza
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {d.grane.map((g, gi) => (
            <div key={gi} style={granaBox}>
              {d.grane.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.plava, fontSize: 10, fontWeight: 700 }}>Grana {gi + 1}</span>
                  <button type="button" onClick={() => ukloniGranu(gi)}
                    style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              )}
              {gi > 0 && (
                <div style={stavka}>
                  <div style={lbl}>Opis grane</div>
                  <textarea value={g.opis} onChange={(e) => setGrana(gi, { opis: e.target.value })}
                    placeholder={`Opis grane ${gi + 1}…`} rows={2} style={TA} />
                </div>
              )}
              {g.why.map((w, wi) => (
                <div key={wi} style={stavka}>
                  <div style={lbl}>{wi + 1}. Zašto?</div>
                  <AutoTextarea
                    value={w}
                    onChange={(e) => setGranaWhy(gi, wi, e.target.value)}
                    placeholder={wi === 0 ? "Prvi uzrok…" : "Dublji uzrok…"}
                    minRows={2}
                    style={TA}
                  />
                </div>
              ))}
              <div style={stavka}>
                <div style={{ ...lbl, color: C.plava, fontWeight: 700 }}>Korenski uzrok</div>
                <AutoTextarea
                  value={g.korenski_uzrok || ""}
                  onChange={(e) => setGrana(gi, { korenski_uzrok: e.target.value })}
                  placeholder="Utvrđeni korenski uzrok nakon 5×Zašto…"
                  minRows={3}
                  style={TA}
                />
              </div>
              <div style={stavka}>
                <div style={lbl}>Privremena mera</div>
                <AutoTextarea
                  value={g.privremena || ""}
                  onChange={(e) => setGrana(gi, { privremena: e.target.value })}
                  placeholder="Kratkoročna kontrola / zaštita…"
                  minRows={2}
                  style={TA}
                />
              </div>
              <div style={stavka}>
                <div style={{ ...lbl, color: C.plava, fontWeight: 700 }}>Definitivna mera</div>
                <AutoTextarea
                  value={g.definitivna || ""}
                  onChange={(e) => setGrana(gi, { definitivna: e.target.value })}
                  placeholder="Trajno rešenje uzroka…"
                  minRows={2}
                  style={TA}
                />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={dodajGranu}
          style={{
            marginTop: 8, background: C.hover, border: `1px dashed ${C.border}`,
            borderRadius: 6, color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
          }}>
          + Dodaj granu (paralelni lanac)
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          ["efekti", "Efekti problema"],
          ["rezultat", "Rezultat"],
        ].map(([key, label]) => (
          <div key={key} style={stavka}>
            <div style={lbl}>{label}</div>
            <textarea value={d[key]} onChange={(e) => set({ [key]: e.target.value })}
              placeholder={label} rows={2} style={TA} />
          </div>
        ))}
      </div>

      <div>
        <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
          ISHIKAWA — 6M
        </div>
        <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>Enter za novi red u svakoj kategoriji</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {M6_KATEGORIJE.map((k) => (
            <div key={k.key} style={{
              ...granaBox,
              borderLeft: `3px solid ${k.boja}`,
              background: `${k.boja}08`,
            }}>
              <div style={lbl}>
                {k.label}
                <span style={{ color: C.sivi, fontWeight: 400, fontSize: 9, marginLeft: 6 }}>({k.eng})</span>
              </div>
              <textarea
                value={d.m6[k.key] || ""}
                onChange={(e) => setM6(k.key, e.target.value)}
                placeholder={`Uzroci — ${k.label.toLowerCase()}… (Enter = novi red)`}
                rows={3}
                style={TA}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function rokZaKalendar(rok) {
  const s = String(rok ?? "").trim();
  const dm = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dm) return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function rokIzKalendara(v) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${d}.${m}.${y}`;
}

function D6TabelaAkcija({ value, onChange, C, INP }) {
  const valueRef = useRef(value);
  const [draft, setDraft] = useState(() => parseD6(value));

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setDraft(parseD6(value));
    }
  }, [value]);

  const commit = (next) => {
    setDraft(next);
    const ser = serializeD6(next);
    valueRef.current = ser;
    onChange(ser);
  };

  const promeni = (i, patch) => {
    commit({
      ...draft,
      redovi: draft.redovi.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    });
  };

  const dodaj = () => commit({
    ...draft,
    redovi: [...draft.redovi, { akcija: "", odgovorni: "", rok: "", status: "Planirano" }],
  });
  const ukloni = (i) => {
    const redovi = draft.redovi.filter((_, j) => j !== i);
    commit({ ...draft, redovi: redovi.length ? redovi : [{ akcija: "", odgovorni: "", rok: "", status: "Planirano" }] });
  };

  const setVerifikacija = (i, v) => {
    const verifikacija = [...draft.verifikacija];
    verifikacija[i] = v;
    commit({ ...draft, verifikacija });
  };
  const dodajVerifikaciju = () => commit({ ...draft, verifikacija: [...draft.verifikacija, ""] });
  const ukloniVerifikaciju = (i) => {
    const verifikacija = draft.verifikacija.filter((_, j) => j !== i);
    commit({ ...draft, verifikacija: verifikacija.length ? verifikacija : [""] });
  };

  const d = draft;
  const TA = {
    ...INP, fontSize: 11, padding: "6px 8px", resize: "none", width: "100%",
    minHeight: 36, whiteSpace: "pre-wrap", wordBreak: "break-word",
  };

  const TH = {
    padding: "6px 8px", fontSize: 9, fontWeight: 700, color: C.sivi,
    textAlign: "left", borderBottom: `1px solid ${C.border}`, letterSpacing: 0.5,
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 28 }}>#</th>
            <th style={TH}>Akcija</th>
            <th style={{ ...TH, width: "22%" }}>Odgovorni</th>
            <th style={{ ...TH, width: "18%" }}>Rok</th>
            <th style={{ ...TH, width: "16%" }}>Status</th>
            <th style={{ ...TH, width: 28 }} />
          </tr>
        </thead>
        <tbody>
          {d.redovi.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "4px 6px", color: C.sivi, verticalAlign: "middle", textAlign: "center" }}>{i + 1}</td>
              <td style={{ padding: 4 }}>
                <AutoTextarea
                  value={r.akcija}
                  onChange={(e) => promeni(i, { akcija: e.target.value })}
                  placeholder="Šta se radi"
                  minRows={2}
                  style={TA}
                />
              </td>
              <td style={{ padding: 4 }}>
                <input value={r.odgovorni} onChange={(e) => promeni(i, { odgovorni: e.target.value })}
                  placeholder="Ko" style={{ ...INP, fontSize: 11, padding: "6px 8px" }} />
              </td>
              <td style={{ padding: 4 }}>
                <input
                  type="date"
                  value={rokZaKalendar(r.rok)}
                  onChange={(e) => promeni(i, { rok: rokIzKalendara(e.target.value) })}
                  style={{ ...INP, fontSize: 11, padding: "6px 8px", width: "100%" }}
                />
              </td>
              <td style={{ padding: 4 }}>
                <select value={r.status} onChange={(e) => promeni(i, { status: e.target.value })}
                  style={{ ...INP, fontSize: 11, padding: "6px 6px", cursor: "pointer" }}>
                  {D6_STATUSI.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td style={{ padding: 4, textAlign: "center" }}>
                {d.redovi.length > 1 && (
                  <button type="button" onClick={() => ukloni(i)}
                    style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 16 }}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={dodaj}
        style={{
          marginTop: 8, background: C.hover, border: `1px dashed ${C.border}`,
          borderRadius: 6, color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
        }}>
        + Dodaj akciju
      </button>

      <div style={{ marginTop: 16 }}>
        <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
          VERIFIKACIJA EFEKTIVNOSTI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.verifikacija.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: C.plava, fontSize: 14, fontWeight: 700, width: 16, flexShrink: 0, marginTop: 8 }}>•</span>
              <AutoTextarea
                value={s}
                onChange={(e) => setVerifikacija(i, e.target.value)}
                placeholder={i === 0 ? "Kriterijum / metoda verifikacije…" : `Stavka ${i + 1}…`}
                minRows={2}
                style={{ ...TA, flex: 1 }}
              />
              {d.verifikacija.length > 1 && (
                <button type="button" onClick={() => ukloniVerifikaciju(i)}
                  style={{
                    background: "none", border: "none", color: C.sivi, cursor: "pointer",
                    fontSize: 16, padding: "4px", lineHeight: 1, marginTop: 4,
                  }} aria-label="Ukloni">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={dodajVerifikaciju}
            style={{
              alignSelf: "flex-start", background: C.hover, border: `1px dashed ${C.border}`,
              borderRadius: 6, color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
            }}>
            + Dodaj stavku verifikacije
          </button>
        </div>
      </div>
    </div>
  );
}

function D8ZakljucakUnos({ value, onChange, C, INP }) {
  const valueRef = useRef(value);
  const [draft, setDraft] = useState(() => parseD8(value));

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setDraft(parseD8(value));
    }
  }, [value]);

  const commit = (next) => {
    setDraft(next);
    const ser = serializeD8(next);
    valueRef.current = ser;
    onChange(ser);
  };

  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 };
  const INPsm = { ...INP, fontSize: 11, padding: "6px 8px", width: "100%" };
  const TA = { ...INP, fontSize: 11, padding: "6px 8px", resize: "vertical", width: "100%", minHeight: 70 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={lbl}>Datum zatvaranja</div>
          <input
            type="date"
            value={draft.datum_zatvaranja || ""}
            onChange={(e) => commit({ ...draft, datum_zatvaranja: e.target.value })}
            style={INPsm}
          />
        </div>
        <div>
          <div style={lbl}>Odobrio</div>
          <input
            value={draft.odobrio || ""}
            onChange={(e) => commit({ ...draft, odobrio: e.target.value })}
            placeholder="Ime, uloga, potpis…"
            style={INPsm}
          />
        </div>
      </div>
      <div>
        <div style={lbl}>Zaključak</div>
        <textarea
          value={draft.tekst || ""}
          onChange={(e) => commit({ ...draft, tekst: e.target.value })}
          placeholder="Validacija, kriterijumi zatvaranja, distribucija LL…"
          rows={4}
          style={TA}
        />
      </div>
    </div>
  );
}

function PfmeaCpRefUnos({ tip, value, onChange, naslov, C, INP }) {
  const polja = tip === "pfmea" ? PFMEA_REF_POLJA : CP_REF_POLJA;
  const summary = tip === "pfmea" ? pfmeaRefZaEditor(value) : cpRefZaEditor(value);
  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 0.6, marginBottom: 4 };
  const setPolje = (key, v) => {
    const next = { ...summary, [key]: v };
    onChange(tip === "pfmea" ? pfmeaRefIzEditora(next) : cpRefIzEditora(next));
  };
  const popunjeno = polja.filter((p) => String(summary[p.key] ?? "").trim()).length;

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ color: C.plava, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>
        {naslov}
        <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8 }}>
          (REF sažetak — {popunjeno}/{polja.length})
        </span>
      </div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12 }}>
        Referenca na PFMEA/CP dokument — ne puna tabela. Popunjava se iz modula PFMEA/CP ili asistenta 8D.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {polja.map((p) => (
          <div key={p.key}>
            <div style={lbl}>{p.label}</div>
            <textarea
              value={summary[p.key] || ""}
              onChange={(e) => setPolje(p.key, e.target.value)}
              rows={p.rows || 2}
              style={{ ...INP, resize: "vertical", minHeight: p.rows === 1 ? 36 : 52, width: "100%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PoljeUnos({ polje, idx, form, setForm, C, INP }) {
  const key = polje.key;
  const val = form[key] || "";
  const setVal = (v) => setForm((p) => ({ ...p, [key]: v }));
  const pop = poljeJePopunjeno(key, val);

  let sadrzaj;
  if (key === "d2_opis_problema") {
    sadrzaj = <D2Tabela value={val} onChange={setVal} C={C} INP={INP} />;
  } else if (key === "d4_uzrok") {
    sadrzaj = <D4PetZastoM6 value={val} onChange={setVal} C={C} INP={INP} />;
  } else if (key === "d6_implementacija") {
    sadrzaj = <D6TabelaAkcija value={val} onChange={setVal} C={C} INP={INP} />;
  } else if (key === "d8_zakljucak") {
    sadrzaj = <D8ZakljucakUnos value={val} onChange={setVal} C={C} INP={INP} />;
  } else if (key === "d3_privremena_akcija") {
    sadrzaj = <GrupaListaUnos value={val} onChange={setVal} placeholder={polje.ph} minGrupe={3} C={C} INP={INP} />;
  } else if (key === "d7_prevencija") {
    sadrzaj = <GrupaListaUnos value={val} onChange={setVal} placeholder={polje.ph} minGrupe={1} C={C} INP={INP} />;
  } else if (["d1_tim", "d5_korektivna", "lesson_learned"].includes(key)) {
    sadrzaj = <ListaUnos value={val} onChange={setVal} placeholder={polje.ph} C={C} INP={INP} />;
  } else {
    sadrzaj = (
      <textarea value={val} onChange={(e) => setVal(e.target.value)}
        placeholder={polje.ph} rows={polje.rows || 3}
        style={{ ...INP, resize: "vertical", minHeight: 70 }} />
    );
  }

  return (
    <div style={{
      background: C.panel, border: `1px solid ${pop ? `${C.plava}44` : C.border}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          background: pop ? C.plava : C.hover,
          color: pop ? "#fff" : C.sivi,
          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
          minWidth: 28, textAlign: "center",
        }}>{key.startsWith("lesson") ? "LL" : `D${idx + 1}`}</span>
        <span style={{ color: C.tekst, fontSize: 12, fontWeight: 600 }}>
          {polje.label.replace(/^D\d+\s—\s*/, "")}
        </span>
      </div>
      {sadrzaj}
    </div>
  );
}

export default function OsmdEditor({
  izvestaj, sviDelovi, onSacuvaj, onNazad, onPDF, onWord, onStampaj, onOtvoriPfmeaCp,
  onExportPaket, supabase = defaultSupabase, C, padding = 18, addToast,
}) {
  const [form, setForm] = useState(() => {
    const zag = zaglavljeIzIzvestaja(izvestaj);
    if (!izvestaj.id && !zag.datum_otvaranja_8d) zag.datum_otvaranja_8d = danasIsoDatum();
    return {
      id: izvestaj.id || null,
      id_deo: izvestaj.id_deo || "",
      naziv_dela: izvestaj.naziv_dela || "",
      created_at: izvestaj.created_at || null,
      status: izvestaj.status || "u_izradi",
      ...zag,
      d1_tim: izvestaj.d1_tim || "",
      d2_opis_problema: izvestaj.d2_opis_problema || "",
      d3_privremena_akcija: izvestaj.d3_privremena_akcija || "",
      d4_uzrok: izvestaj.d4_uzrok || "",
      d5_korektivna: izvestaj.d5_korektivna || "",
      d6_implementacija: izvestaj.d6_implementacija || "",
      d7_prevencija: izvestaj.d7_prevencija || "",
      d8_zakljucak: izvestaj.d8_zakljucak || "",
      defekt_nedostatak: izvestaj.defekt_nedostatak || "",
      lesson_learned: izvestaj.lesson_learned || "",
      pfmea_ref: izvestaj.pfmea_ref || "",
      control_plan_ref: izvestaj.control_plan_ref || "",
    };
  });

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
    outline: "none", fontFamily: "inherit", lineHeight: 1.45,
  };

  const popunjeno = brojPopunjenihOsmd(form);
  const datumPrikaz = form.created_at
    ? new Date(form.created_at).toLocaleDateString("sr-RS")
    : new Date().toLocaleDateString("sr-RS");

  const [tipoviVozila, setTipoviVozila] = useState([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [paketBusy, setPaketBusy] = useState(false);
  const [pfmeaBusy, setPfmeaBusy] = useState(false);

  useEffect(() => {
    fetchTipoviVozila().then(setTipoviVozila).catch(() => setTipoviVozila([]));
  }, []);

  useEffect(() => {
    if (!form.id_deo || !sviDelovi?.length) return;
    const resolved = resolveOsmdIdDeoZaBazu(form.id_deo, sviDelovi, tipoviVozila);
    if (resolved.id_deo && resolved.id_deo !== form.id_deo) {
      setForm((p) => ({
        ...p,
        id_deo: resolved.id_deo,
        naziv_dela: resolved.naziv_dela || p.naziv_dela,
      }));
    }
  }, [sviDelovi, tipoviVozila, form.id_deo]);

  const idDeoOpcije = useMemo(
    () => buildOsmdIdDeoOpcije(sviDelovi, tipoviVozila),
    [sviDelovi, tipoviVozila],
  );

  const pokreniPdf = async () => {
    if (pdfBusy || !onPDF) return;
    setPdfBusy(true);
    try {
      await onPDF(form, { onProgress: () => {} });
    } finally {
      setPdfBusy(false);
    }
  };

  const pokreniPaket = async () => {
    if (!onExportPaket || paketBusy) return;
    setPaketBusy(true);
    try {
      await onExportPaket(form);
    } finally {
      setPaketBusy(false);
    }
  };

  const sacuvajForm = async () => {
    const resolved = resolveOsmdIdDeoZaBazu(form.id_deo, sviDelovi, tipoviVozila);
    if (!resolved.id_deo) {
      addToast?.(
        resolved.nepoznat ? porukaNepoznatOsmdId(form.id_deo) : "Izaberi ID dela / vozila.",
        "greska",
      );
      return null;
    }
    const payload = {
      ...form,
      id_deo: resolved.id_deo,
      naziv_dela: resolved.naziv_dela || form.naziv_dela,
    };
    const saved = await onSacuvaj(payload);
    if (saved) setForm((p) => ({ ...p, ...saved }));
    return saved;
  };

  const idiNaPfmeaCp = async () => {
    if (!onOtvoriPfmeaCp || pfmeaBusy) return;
    setPfmeaBusy(true);
    try {
      await onOtvoriPfmeaCp(form);
    } finally {
      setPfmeaBusy(false);
    }
  };

  return (
    <OsmdScrollOkvir>
    <div style={{ padding, maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, gap: 8, flexWrap: "wrap",
      }}>
        <button type="button" onClick={onNazad}
          style={{ background: "none", border: "none", color: C.sivi, fontSize: 14, cursor: "pointer", padding: 0 }}>
          ← Nazad
        </button>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>8D izveštaj</div>
        <div style={{ display: "flex", gap: 8 }}>
          {onStampaj && (
            <button type="button" onClick={() => onStampaj(form)}
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 7, color: C.tekst,
                fontSize: 11, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
              }}>🖨 Štampaj</button>
          )}
          {onWord && (
            <button type="button" onClick={() => onWord(form)}
              title="Microsoft Word (.doc)"
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 7, color: C.tekst,
                fontSize: 11, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
              }}>📝 Word</button>
          )}
          <button type="button" onClick={pokreniPdf} disabled={pdfBusy}
            style={{
              background: pdfBusy ? C.hover : "#7c3aed", border: "none", borderRadius: 7,
              color: pdfBusy ? C.sivi : "#fff",
              fontSize: 11, fontWeight: 700, padding: "7px 14px",
              cursor: pdfBusy ? "wait" : "pointer", opacity: pdfBusy ? 0.85 : 1,
            }}>
            {pdfBusy ? "⏳ PDF…" : "📄 PDF"}
          </button>
          {onExportPaket && (
            <button type="button" onClick={pokreniPaket} disabled={paketBusy}
              title="ZIP: Word 8D + RPN Excel + PFMEA/CP Excel"
              style={{
                background: paketBusy ? C.hover : "#0d9488", border: "none", borderRadius: 7,
                color: paketBusy ? C.sivi : "#fff",
                fontSize: 11, fontWeight: 700, padding: "7px 14px",
                cursor: paketBusy ? "wait" : "pointer", opacity: paketBusy ? 0.85 : 1,
              }}>
              {paketBusy ? "⏳ Paket…" : "📦 Paket"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>ID DELA / VOZILA</div>
          <select value={form.id_deo} onChange={(e) => {
            const resolved = resolveOsmdIdDeoZaBazu(e.target.value, sviDelovi, tipoviVozila);
            const d = nadjiOsmdDeo(e.target.value, sviDelovi, tipoviVozila);
            setForm((p) => ({
              ...p,
              id_deo: resolved.id_deo || e.target.value,
              naziv_dela: d?.naziv_dela || resolved.naziv_dela || "",
              artikal_naziv_sifra: p.artikal_naziv_sifra
                || (d ? `${d.naziv_dela} (Šifra: ${resolved.id_deo || d.id_deo})` : ""),
            }));
          }} style={{ ...INP, cursor: "pointer" }}>
            <option value="">— Izaberi —</option>
            {idDeoOpcije.grupe.map((g) => (
              <optgroup key={g.key} label={g.label}>
                {g.stavke.map((d) => (
                  <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>STATUS</div>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            style={{ ...INP, cursor: "pointer" }}>
            <option value="u_izradi">U izradi</option>
            <option value="pregled">Na pregledu</option>
            <option value="zavrsen">Završen</option>
          </select>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px",
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>NAZIV DELA</div>
          <div style={{ color: C.tekst, fontSize: 12 }}>{form.naziv_dela || "—"}</div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>DATUM IZVEŠTAJA</div>
          <div style={{ color: C.tekst, fontSize: 12 }}>{datumPrikaz}</div>
        </div>
      </div>

      {(form.id || form.broj_8d) && (
        <OsmdPaketPregled
          izvestaj={form}
          C={C}
          supabase={supabase}
          onOtvoriPfmeaCp={onOtvoriPfmeaCp ? idiNaPfmeaCp : undefined}
          onExportPaket={onExportPaket ? pokreniPaket : undefined}
          paketBusy={paketBusy}
        />
      )}

      <Zaglavlje8D form={form} setForm={setForm} C={C} INP={INP} />

      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, background: C.hover, borderRadius: 3, height: 6 }}>
          <div style={{
            background: C.plava, width: `${(popunjeno / 8) * 100}%`,
            height: 6, borderRadius: 3, transition: "width 0.3s",
          }} />
        </div>
        <span style={{ color: C.sivi, fontSize: 11 }}>{popunjeno}/8 polja</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {POLJA_8D.map((p, i) => (
          <PoljeUnos key={p.key} polje={p} idx={i} form={form} setForm={setForm} C={C} INP={INP} />
        ))}

        {POLJA_PRILOZI.map((p, i) => (
          <PoljeUnos key={p.key} polje={p} idx={i} form={form} setForm={setForm} C={C} INP={INP} />
        ))}

        <PfmeaCpRefUnos
          tip="pfmea"
          value={form.pfmea_ref}
          onChange={(v) => setForm((p) => ({ ...p, pfmea_ref: v }))}
          naslov="REF — PFMEA"
          C={C}
          INP={INP}
        />
        <PfmeaCpRefUnos
          tip="cp"
          value={form.control_plan_ref}
          onChange={(v) => setForm((p) => ({ ...p, control_plan_ref: v }))}
          naslov="REF — Control Plan"
          C={C}
          INP={INP}
        />
      </div>

      <button type="button" onClick={sacuvajForm} style={{
        width: "100%", background: C.plava, border: "none", borderRadius: 10, color: "#fff",
        fontSize: 14, fontWeight: 700, padding: "14px", cursor: "pointer", marginTop: 16,
        boxShadow: `0 0 16px ${C.plava}40`,
      }}>
        💾 Sačuvaj 8D izveštaj
      </button>

      {onOtvoriPfmeaCp && (
        <button type="button" onClick={idiNaPfmeaCp} disabled={pfmeaBusy || !form.id_deo}
          title={!form.id_deo ? "Izaberite deo" : "Sačuvaj i prenesi u PFMEA / Control Plan"}
          style={{
            width: "100%", background: pfmeaBusy ? C.hover : "#0d9488", border: "none",
            borderRadius: 10, color: pfmeaBusy ? C.sivi : "#fff",
            fontSize: 13, fontWeight: 700, padding: "12px", cursor: pfmeaBusy || !form.id_deo ? "not-allowed" : "pointer",
            marginTop: 10, opacity: !form.id_deo ? 0.55 : 1,
          }}>
          {pfmeaBusy ? "…" : "→ PFMEA / Control Plan (prenesi iz 8D)"}
        </button>
      )}
    </div>
    </OsmdScrollOkvir>
  );
}
