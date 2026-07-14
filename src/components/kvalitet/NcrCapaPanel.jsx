import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  fetchNcrCapaLista,
  snimiNcrCapa,
  azurirajNcrStatus,
  NCR_STATUSI,
  NCR_PRIORITETI,
  prefill8dIzNcr,
  validirajNcrPayload,
  dozvoljeniNcrStatusi,
} from "../../lib/ncrCapa.js";
import { NCR_CAPA_TOOLTIP } from "../../lib/analitikaOpisi.js";
import { normalizujPrefill8d } from "../../lib/eskalacijeHelper.js";
import NcrWorkflowVeza from "./NcrWorkflowVeza.jsx";

const PRAZNA = {
  id_deo: "",
  radni_nalog: "",
  serija: "",
  vin: "",
  opis: "",
  uzrok: "",
  korektivna: "",
  verifikacija: "",
  status: "otvoren",
  prioritet: "normalan",
  rok: "",
  izvor: "rucno",
};

const bojaStatus = (s, C) => {
  if (s === "zatvoren") return C.zelena;
  if (s === "verifikacija") return C.plava;
  if (s === "akcija") return C.narandzasta || C.zuta;
  if (s === "analiza") return C.ljubicasta || C.plava;
  return C.crvena;
};

export default function NcrCapaPanel({
  korisnik, C, addToast, sviDelovi = [], onOtvori8D, onOtvoriTab, onOtvoriPfmeaCp,
  prefill = null, onPrefillUsed,
}) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("otvoreni");
  const [filterDeo, setFilterDeo] = useState("");
  const [filterPrioritet, setFilterPrioritet] = useState("");
  const [filterSmena, setFilterSmena] = useState("");
  const [samoRokProsao, setSamoRokProsao] = useState(false);
  const [forma, setForma] = useState(null);
  const [detalj, setDetalj] = useState(null);
  const [greske, setGreske] = useState({});

  useEffect(() => {
    if (prefill && !forma) {
      setForma({ ...PRAZNA, ...prefill });
      setGreske({});
      onPrefillUsed?.();
    }
  }, [prefill]); // eslint-disable-line

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNcrCapaLista(supabase, {
        status: filter === "sve" ? null : filter,
        idDeo: filterDeo || null,
        prioritet: filterPrioritet || null,
        smena: filterSmena || null,
        samoRokProsao,
      });
      setLista(data);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [filter, filterDeo, filterPrioritet, filterSmena, samoRokProsao, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async (form) => {
    const v = validirajNcrPayload(form);
    if (!v.ok) {
      setGreske(v.greske);
      addToast?.("Popuni obavezna polja", "greska");
      return;
    }
    setGreske({});
    try {
      const row = await snimiNcrCapa(supabase, form, {
        id: form.id || null,
        kreiraoId: korisnik?.radnikId,
      });
      addToast?.(`✓ NCR ${row.broj_ncr} sačuvan`, "uspeh");
      if (row._eskalacijeZatvorene?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._eskalacijeZatvorene.length} eskalacija`, "info");
      }
      if (row._spcAlarmiZatvoreni?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._spcAlarmiZatvoreni.length} SPC alarma`, "info");
      }
      setForma(null);
      setDetalj(row);
      ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const promeniStatus = async (id, status) => {
    try {
      const row = await azurirajNcrStatus(supabase, id, status);
      setDetalj(row);
      addToast?.(`Status → ${status}`, "uspeh");
      if (row._eskalacijeZatvorene?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._eskalacijeZatvorene.length} eskalacija`, "info");
      }
      if (row._spcAlarmiZatvoreni?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._spcAlarmiZatvoreni.length} SPC alarma`, "info");
      }
      ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const otvori8d = (ncr) => {
    const prefill = normalizujPrefill8d(prefill8dIzNcr(ncr));
    onOtvori8D?.(prefill);
  };

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
  };

  const renderForma = (form, setForm) => (
    <div data-testid="ncr-forma" style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 10, color: greske.id_deo ? C.crvena : C.sivi }}>
          ID delo *
          <input style={{ ...INP, borderColor: greske.id_deo ? C.crvena : C.border }} value={form.id_deo}
            onChange={(e) => setForm({ ...form, id_deo: e.target.value.toUpperCase() })} list="ncr-dela"
            data-testid="ncr-id-deo" />
          {greske.id_deo && <span data-testid="ncr-greska-id_deo" style={{ color: C.crvena, fontSize: 9 }}>{greske.id_deo}</span>}
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Radni nalog
          <input style={INP} value={form.radni_nalog}
            onChange={(e) => setForm({ ...form, radni_nalog: e.target.value.toUpperCase() })} />
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Serija / lot
          <input style={INP} value={form.serija}
            onChange={(e) => setForm({ ...form, serija: e.target.value })} />
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          VIN
          <input style={INP} value={form.vin}
            onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} />
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Prioritet
          <select style={INP} value={form.prioritet}
            onChange={(e) => setForm({ ...form, prioritet: e.target.value })}>
            {NCR_PRIORITETI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Rok
          <input type="date" style={INP} value={form.rok || ""}
            onChange={(e) => setForm({ ...form, rok: e.target.value })} />
        </label>
      </div>
      <label style={{ fontSize: 10, color: greske.opis ? C.crvena : C.sivi, display: "block", marginTop: 8 }}>
        Opis neusaglašenosti *
        <textarea style={{ ...INP, minHeight: 56, borderColor: greske.opis ? C.crvena : C.border }} value={form.opis}
          onChange={(e) => setForm({ ...form, opis: e.target.value })}
          data-testid="ncr-opis" />
        {greske.opis && <span data-testid="ncr-greska-opis" style={{ color: C.crvena, fontSize: 9 }}>{greske.opis}</span>}
      </label>
      <label style={{ fontSize: 10, color: C.sivi, display: "block", marginTop: 8 }}>
        Uzrok (D4)
        <textarea style={{ ...INP, minHeight: 48 }} value={form.uzrok || ""}
          onChange={(e) => setForm({ ...form, uzrok: e.target.value })} />
      </label>
      <label style={{ fontSize: 10, color: C.sivi, display: "block", marginTop: 8 }}>
        Korektivna mera (D5/D6)
        <textarea style={{ ...INP, minHeight: 48 }} value={form.korektivna || ""}
          onChange={(e) => setForm({ ...form, korektivna: e.target.value })} />
      </label>
      <label style={{ fontSize: 10, color: C.sivi, display: "block", marginTop: 8 }}>
        Verifikacija
        <textarea style={{ ...INP, minHeight: 40 }} value={form.verifikacija || ""}
          onChange={(e) => setForm({ ...form, verifikacija: e.target.value })} />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" data-testid="ncr-snimi" onClick={() => snimi(form)}
          style={{
            background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
            padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
          }}>
          Sačuvaj
        </button>
        <button type="button" onClick={() => setForma(null)}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, padding: "8px 14px", fontSize: 11, cursor: "pointer",
          }}>
          Otkaži
        </button>
      </div>
      {sviDelovi.length > 0 && (
        <datalist id="ncr-dela">
          {sviDelovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
        </datalist>
      )}
    </div>
  );

  return (
    <div data-testid="ncr-panel" style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
      maxWidth: 900,
      color: C.tekst,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}
            title={NCR_CAPA_TOOLTIP}
          >
            NCR / CAPA
          </div>
          <div style={{ fontSize: 10, color: C.sivi, marginTop: 4 }} title={NCR_CAPA_TOOLTIP}>
            NCR — izveštaj o neusaglašenosti · CAPA — korektivne i preventivne akcije
          </div>
        </div>
        <button type="button" data-testid="ncr-novi" onClick={() => { setForma({ ...PRAZNA }); setGreske({}); }}
          title="Novi NCR — izveštaj o neusaglašenosti"
          style={{
            background: C.crvena, border: "none", borderRadius: 6, color: C.onAkcent,
            padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
          }}>
          + Novi NCR
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {[["otvoreni", "Otvoreni"], ["sve", "Svi"], ["zatvoren", "Zatvoreni"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            style={{
              background: filter === id ? `${C.plava}22` : "transparent",
              border: `1px solid ${filter === id ? C.plava : C.border}`,
              borderRadius: 6, padding: "5px 10px", fontSize: 10, cursor: "pointer",
              color: filter === id ? C.plava : C.sivi, fontWeight: filter === id ? 700 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 6,
        marginBottom: 12,
      }}>
        <input
          style={INP}
          value={filterDeo}
          onChange={(e) => setFilterDeo(e.target.value.toUpperCase())}
          placeholder="ID deo filter"
          list="ncr-dela"
        />
        <select style={INP} value={filterPrioritet} onChange={(e) => setFilterPrioritet(e.target.value)}>
          <option value="">Svi prioriteti</option>
          {NCR_PRIORITETI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select style={INP} value={filterSmena} onChange={(e) => setFilterSmena(e.target.value)}>
          <option value="">Sve smene</option>
          {["1", "2", "3"].map((s) => <option key={s} value={s}>Smena {s}</option>)}
        </select>
        <label style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi,
          padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 6,
        }}>
          <input type="checkbox" checked={samoRokProsao} onChange={(e) => setSamoRokProsao(e.target.checked)} />
          Rok prošao
        </label>
      </div>

      {forma && renderForma(forma, setForma)}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavam…</div>
      ) : (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          WebkitOverflowScrolling: "touch",
        }}>
          {lista.length === 0 ? (
            <div style={{ padding: 16, color: C.sivi, fontSize: 11 }}>Nema NCR zapisa.</div>
          ) : lista.map((n, i) => (
            <div key={n.id} data-testid={`ncr-red-${n.broj_ncr}`}
              onClick={() => setDetalj(detalj?.id === n.id ? null : n)}
              style={{
                padding: "10px 14px",
                borderTop: i ? `1px solid ${C.border}` : "none",
                cursor: "pointer",
                background: detalj?.id === n.id ? `${C.plava}10` : "transparent",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>{n.broj_ncr}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: bojaStatus(n.status, C),
                  textTransform: "uppercase",
                }}>
                  {n.status}
                </span>
              </div>
              <div style={{ fontSize: 10, color: C.sivi, marginTop: 4 }}>
                {n.id_deo} · {n.opis?.slice(0, 80)}{(n.opis?.length > 80) ? "…" : ""}
              </div>
              {detalj?.id === n.id && (
                <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.6 }} onClick={(e) => e.stopPropagation()}>
                  <NcrWorkflowVeza
                    ncr={n}
                    C={C}
                    onOtvori8D={onOtvori8D}
                    onOtvoriTab={onOtvoriTab}
                    onOtvoriPfmeaCp={onOtvoriPfmeaCp}
                  />
                  {n.uzrok && <div><strong>Uzrok:</strong> {n.uzrok}</div>}
                  {n.korektivna && <div><strong>Korektivna:</strong> {n.korektivna}</div>}
                  {n.verifikacija && <div><strong>Verifikacija:</strong> {n.verifikacija}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {NCR_STATUSI.filter(([s]) => dozvoljeniNcrStatusi(n.status).includes(s)).map(([s, label]) => (
                      <button key={s} type="button" data-testid={`ncr-status-${s}`}
                        onClick={() => promeniStatus(n.id, s)}
                        style={{
                          background: `${bojaStatus(s, C)}18`,
                          border: `1px solid ${bojaStatus(s, C)}55`,
                          borderRadius: 5, padding: "4px 8px", fontSize: 9,
                          cursor: "pointer", color: bojaStatus(s, C),
                        }}>
                        → {label}
                      </button>
                    ))}
                    {onOtvori8D && (
                      <button type="button" data-testid="ncr-otvori-8d" onClick={() => otvori8d(n)}
                        style={{
                          background: C.plava, border: "none", borderRadius: 5,
                          color: C.onAkcent, padding: "4px 10px", fontSize: 9, cursor: "pointer",
                        }}>
                        Otvori 8D
                      </button>
                    )}
                    <button type="button" onClick={() => setForma({ ...n })}
                      style={{
                        background: "transparent", border: `1px solid ${C.border}`,
                        borderRadius: 5, padding: "4px 8px", fontSize: 9, cursor: "pointer", color: C.sivi,
                      }}>
                      Uredi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
