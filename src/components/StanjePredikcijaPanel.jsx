import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { labelaStanja, bojaStanja, kreirajEskalacijuIzPredloga } from "../lib/spcInteligencija.js";
import { prefill8dIzEskalacije } from "../lib/eskalacijeHelper.js";
import SpcAsistent8dDugme from "./spc/SpcAsistent8dDugme.jsx";
import { mozeInteligencijaProcesa } from "../lib/uloge.js";

function KarticaStanja({ naslov, stanje, razlog, vrednost, bojaVrednosti, C }) {
  const boja = bojaVrednosti || (stanje != null ? bojaStanja(stanje, C) : C.tekst);
  return (
    <div style={{
      flex: "1 1 140px", minWidth: 120, background: C.bg, border: `1px solid ${boja}40`,
      borderRadius: 8, padding: "10px 12px", boxSizing: "border-box",
    }}>
      <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>{naslov}</div>
      <div style={{ color: boja, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        {vrednost != null ? vrednost : labelaStanja(stanje)}
      </div>
      <div style={{ color: C.sivi, fontSize: 9, lineHeight: 1.4 }}>{razlog}</div>
    </div>
  );
}

function PredikcijaRed({ naslov, pred, jedinica, C }) {
  if (!pred) {
    return (
      <div style={{ fontSize: 9, color: C.border, padding: "4px 0" }}>
        {naslov}: premalo dana za predikciju (min. 3)
      </div>
    );
  }
  const sledeca = pred.sledeci[0]?.vrednost;
  const boja = pred.smer === "raste" ? C.crvena : pred.smer === "pada" ? C.zelena : C.sivi;
  return (
    <div style={{ fontSize: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: C.tekst, fontWeight: 600 }}>{naslov}</span>
        <span style={{ color: boja }}>
          {pred.smer.toUpperCase()} · sledeći korak ~{sledeca}{jedinica}
        </span>
      </div>
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
        Trenutno {pred.trenutno}{jedinica}
        {pred.snimak ? " · snimak perioda" : ` · ${pred.brojDana} dana · pouzdanost R²=${pred.pouzdanost}`}
      </div>
    </div>
  );
}

function EskalacijaModal({
  mera, sviDelovi, defaultIdDeo, korisnik, C, onZatvori, onUspelo, onOtvori8D,
}) {
  const [idDeo, setIdDeo] = useState(mera.id_deo || defaultIdDeo || "");
  const [busy, setBusy] = useState(false);
  const [greska, setGreska] = useState("");
  const [rezultat, setRezultat] = useState(null);

  const snimi = async () => {
    if (!korisnik?.radnikId) {
      setGreska("Nalog nije povezan sa radnicima.");
      return;
    }
    if (!idDeo) {
      setGreska("Izaberite ID dela.");
      return;
    }
    setBusy(true);
    setGreska("");
    try {
      const res = await kreirajEskalacijuIzPredloga(supabase, {
        id_deo: idDeo,
        opis: mera.obrazlozenje,
        korektivna_akcija: mera.akcija,
        prioritet: mera.prioritet,
        kreirao_id: korisnik.radnikId,
      });
      setRezultat(res);
      onUspelo(res.duplikat
        ? `Eskalacija za ovaj predlog već postoji.${res.dodeljen_ime ? ` Dodeljeno: ${res.dodeljen_ime}.` : ""}`
        : `✓ Eskalacija kreirana.${res.dodeljen_ime ? ` Dodeljeno: ${res.dodeljen_ime}.` : ""}`);
    } catch (e) {
      setGreska(e.message);
    } finally {
      setBusy(false);
    }
  };

  const otvori8d = () => {
    const esk = rezultat?.eskalacija || {
      id_deo: idDeo,
      opis: `INTEL: ${mera.obrazlozenje}`,
      korektivna_akcija: mera.akcija,
    };
    onOtvori8D?.(esk);
    onZatvori();
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 12, padding: "10px 12px", boxSizing: "border-box",
    fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 20, maxWidth: 440, width: "100%",
      }}>
        {!rezultat ? (
          <>
            <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              Kreiraj eskalaciju
            </div>
            <div style={{ color: C.sivi, fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
              {mera.akcija}
            </div>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>ID DELA</div>
            <select value={idDeo} onChange={e => setIdDeo(e.target.value)} style={{ ...INP, marginBottom: 12 }}>
              <option value="">— Izaberi —</option>
              {(sviDelovi || []).map(d => (
                <option key={d.id_deo} value={d.id_deo}>{d.id_deo}</option>
              ))}
            </select>
            {greska && <div style={{ color: C.crvena, fontSize: 10, marginBottom: 8 }}>{greska}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onZatvori} disabled={busy}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                  color: C.sivi, fontSize: 11, padding: "8px 16px", cursor: "pointer",
                }}>
                Otkaži
              </button>
              <button type="button" onClick={snimi} disabled={busy}
                style={{
                  background: C.crvena, border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px 16px", cursor: "pointer",
                }}>
                {busy ? "…" : "Kreiraj"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: C.zelena, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {rezultat.duplikat ? "Eskalacija već postoji" : "✓ Eskalacija kreirana"}
            </div>
            {rezultat.dodeljen_ime && (
              <div style={{ color: C.sivi, fontSize: 11, marginBottom: 12 }}>
                Automatski dodeljeno: <strong style={{ color: C.tekst }}>{rezultat.dodeljen_ime}</strong>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={onZatvori}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                  color: C.sivi, fontSize: 11, padding: "8px 16px", cursor: "pointer",
                }}>
                Zatvori
              </button>
              {onOtvori8D && (
                <button type="button" onClick={otvori8d}
                  style={{
                    background: C.plava, border: "none", borderRadius: 8,
                    color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px 16px", cursor: "pointer",
                  }}>
                  Otvori 8D →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StanjePredikcijaPanel({
  podaci, C, kompakt, korisnik, addToast, sviDelovi = [], defaultIdDeo = "", onOtvori8D,
  asistentMeta,
}) {
  const [eskalacijaMera, setEskalacijaMera] = useState(null);

  const handleOtvori8D = (esk) => {
    if (onOtvori8D) {
      onOtvori8D(esk);
      return;
    }
    sessionStorage.setItem("spc_8d_prefill", JSON.stringify(prefill8dIzEskalacije(esk)));
    sessionStorage.setItem("spc_tab_atr", "8d");
    addToast?.("Sačuvano — otvorite Atributivne → tab 8D.", "info");
  };

  if (!podaci?.inteligencija) return null;
  if (!mozeInteligencijaProcesa(korisnik?.uloga)) return null;
  const { inteligencija: izv } = podaci;
  const bojaUk = bojaStanja(izv.ukupnoStanje, C);
  const mozeEskalacija = !!korisnik?.radnikId;

  return (
    <>
      {eskalacijaMera && (
        <EskalacijaModal
          mera={eskalacijaMera}
          sviDelovi={sviDelovi}
          defaultIdDeo={defaultIdDeo}
          korisnik={korisnik}
          C={C}
          onZatvori={() => setEskalacijaMera(null)}
          onUspelo={msg => addToast?.(msg, "uspeh")}
          onOtvori8D={handleOtvori8D}
        />
      )}

      <div style={{
        background: C.panel,
        border: `1px solid ${bojaUk}35`,
        borderRadius: 10,
        padding: kompakt ? 10 : 14,
        marginBottom: 12,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 10, flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ color: C.tekst, fontSize: kompakt ? 10 : 11, fontWeight: 700, letterSpacing: 1 }}>
            STANJE · PREDIKCIJA · KOREKTIVNE MERE
            {podaci.idDeoFilter && (
              <span style={{ color: C.plava, marginLeft: 6 }}>· {podaci.idDeoFilter}</span>
            )}
          </span>
          <span style={{
            background: bojaUk + "22", color: bojaUk,
            fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          }}>
            {labelaStanja(izv.ukupnoStanje)}
          </span>
          {onOtvori8D && asistentMeta && (
            <SpcAsistent8dDugme
              C={C}
              korisnik={korisnik}
              izvor="inteligencija"
              kompakt
              onOtvori8D={onOtvori8D}
              addToast={addToast}
              inteligencijaProps={asistentMeta}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "stretch" }}>
          <KarticaStanja naslov="ATRIBUTIVNE (FPY)" stanje={izv.stanjeAttr.stanje}
            razlog={izv.stanjeAttr.razlog} C={C} />
          <KarticaStanja naslov="MERLJIVE (FPY)" stanje={izv.stanjeMer.stanje}
            razlog={izv.stanjeMer.razlog} C={C} />
          <KarticaStanja
            naslov="RTY POGONA"
            vrednost={izv.sumarno.rtyPogon != null ? `${izv.sumarno.rtyPogon}%` : "—"}
            bojaVrednosti={C.narandzasta}
            razlog={
              izv.sumarno.faze?.length > 1
                ? izv.sumarno.faze.map(f => `${f.naziv} ${f.fpy}%`).join(" × ")
                : `FPY atr ${izv.sumarno.fpyAttr}% · mer ${izv.sumarno.fpyMer}%`
            }
            C={C}
          />
        </div>

        <div style={{
          background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
          padding: "8px 12px", marginBottom: 12,
        }}>
          <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1.2, marginBottom: 6 }}>
            PREDVIĐENO KRETANJE (linearni trend)
          </div>
          <PredikcijaRed naslov="Ukupni NOK %" pred={izv.predikcija.ukupnoNok} jedinica="%" C={C} />
          <PredikcijaRed naslov="RTY pogona" pred={izv.predikcija.ukupnoRty} jedinica="%" C={C} />
          {!kompakt && (
            <>
              <PredikcijaRed naslov="FPY atributivne" pred={izv.predikcija.atributivne} jedinica="%" C={C} />
              <PredikcijaRed naslov="FPY merljive" pred={izv.predikcija.merljive} jedinica="%" C={C} />
            </>
          )}
        </div>

        {izv.korektivneMere.length > 0 && (
          <div>
            <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1.2, marginBottom: 8 }}>
              PREPORUČENE KOREKTIVNE MERE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {izv.korektivneMere.slice(0, kompakt ? 3 : 6).map((m, i) => {
                const boja = m.prioritet === "visok" ? C.crvena
                  : m.prioritet === "srednji" ? C.zuta : C.plava;
                return (
                  <div key={i} style={{
                    padding: "8px 10px", background: C.bg, borderRadius: 8,
                    border: `1px solid ${boja}30`,
                  }}>
                    <div style={{
                      display: "flex", gap: 8, alignItems: "center",
                      flexWrap: "wrap", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{
                          color: boja, fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                          padding: "2px 6px", border: `1px solid ${boja}40`, borderRadius: 4,
                        }}>
                          {m.prioritet.toUpperCase()}
                        </span>
                        <span style={{ color: C.sivi, fontSize: 8 }}>{m.modul}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {mozeEskalacija && m.prioritet !== "info" && (
                          <button type="button" onClick={() => setEskalacijaMera(m)}
                            style={{
                              background: C.crvena + "18", border: `1px solid ${C.crvena}40`,
                              borderRadius: 6, color: C.crvena, fontSize: 8, fontWeight: 700,
                              padding: "4px 10px", cursor: "pointer",
                            }}>
                            + Eskalacija
                          </button>
                        )}
                        {(onOtvori8D || addToast) && m.prioritet !== "info" && (
                          <button type="button" onClick={() => handleOtvori8D({
                            id_deo: m.id_deo || defaultIdDeo,
                            opis: m.obrazlozenje,
                            korektivna_akcija: m.akcija,
                          })}
                            style={{
                              background: C.plava + "18", border: `1px solid ${C.plava}40`,
                              borderRadius: 6, color: C.plava, fontSize: 8, fontWeight: 700,
                              padding: "4px 10px", cursor: "pointer",
                            }}>
                            8D →
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ color: C.tekst, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
                      {m.akcija}
                    </div>
                    <div style={{ color: C.border, fontSize: 9, marginTop: 3 }}>{m.obrazlozenje}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ color: C.border, fontSize: 8, marginTop: 10, lineHeight: 1.4 }}>
          Eskalacija se automatski dodeljuje inženjeru kvaliteta sa najmanje otvorenih zadataka.
          „8D nacrt“ generiše kompletan šablonski izveštaj (D2–D8) iz analitike — Faza 1 asistenta.
        </div>
      </div>
    </>
  );
}
