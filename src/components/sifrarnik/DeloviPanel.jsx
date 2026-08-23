import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { fetchDelovi, upsertDeo, countDelovi, DELOVI_PAGE_SIZE } from "../../lib/sifrarnikApi.js";
import {
  fetchGreskeBrojeviPoDeo,
  fetchBarkodProfiliSet,
  statusDeoUSifrarniku,
  STATUS_DEO_LABEL,
  tooltipStatusDeo,
  jeDemoIdDeo,
  obrisiDemoDelove,
  obrisiDeoIzSifrarnika,
  koraciNavigacijeIzStatusDeo,
  fetchOperativniBrojeviPoDeo,
  NEDOSTAJE_FILTER_OPCIJE,
  deoOdgovaraNedostajeFilter,
} from "../../lib/sifrarnikOdrzavanje.js";
import { ucitajStatusAgregate, invalidirajStatusAgregate } from "../../lib/sifrarnikStatusCache.js";
import {
  fetchDeloviSaMv,
  pretraziDeloviSaMv,
  countDeloviSaMv,
  optsIzMvReda,
  statusIzMvReda,
} from "../../lib/sifrarnikDeloviMv.js";
import { obavestiPromenuStatusaSifrarnika, SIFRARNIK_STATUS_EVENT } from "../../lib/sifrarnikStatusEvent.js";
import { fetchDeloviPoServerFilteru } from "../../lib/sifrarnikDeloviServerFilter.js";

const PRAZAN = {
  id_deo: "", naziv_dela: "", karakteristika: "", tip_kontrole: "deo",
  vozilo_katalog_id: "", sifra_vozila: "", broj_crteza: "", revizija: "",
  kom_za_kontrolu: 30, aktivan: true, napomena: "",
};

export default function DeloviPanel({ C, addToast, onStampaj, onOtvoriGlavniUnos, onNavigacijaStatus, navSignal, onBulkBarkod }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guBrojevi, setGuBrojevi] = useState({});
  const [greskeBrojevi, setGreskeBrojevi] = useState({});
  const [barkodSet, setBarkodSet] = useState(new Set());
  const [tipFilter, setTipFilter] = useState("svi");
  const [filterDraft, setFilterDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [ukupnoUBazi, setUkupnoUBazi] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [ucitavaJos, setUcitavaJos] = useState(false);
  const [samoDemo, setSamoDemo] = useState(false);
  const [samoDelimicni, setSamoDelimicni] = useState(false);
  const [nedostajeFilter, setNedostajeFilter] = useState("");
  const [izabrani, setIzabrani] = useState(() => new Set());
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [brise, setBrise] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState(null);

  const [serverFiltered, setServerFiltered] = useState(false);
  const [serverPretraga, setServerPretraga] = useState(false);

  const imaServerFiltera = !!(nedostajeFilter || samoDemo || samoDelimicni);
  const imaTekstPretrage = filter.trim().length >= 2;

  const optsZaDeo = useCallback((d) => {
    if (d?._mv) return optsIzMvReda(d._mv);
    const id = String(d?.id_deo || "").toUpperCase();
    return {
      guBroj: guBrojevi[id] || guBrojevi[d?.id_deo] || 0,
      greskeBroj: greskeBrojevi[id] || greskeBrojevi[d?.id_deo] || 0,
      imaBarkod: barkodSet.has(id),
    };
  }, [guBrojevi, greskeBrojevi, barkodSet]);

  const ucitaj = useCallback(async ({ reset = true } = {}) => {
    if (reset) setLoading(true);
    else setUcitavaJos(true);
    try {
      const tip = tipFilter === "svi" ? null : tipFilter;
      if (imaServerFiltera) {
        const offset = reset ? 0 : lista.length;
        const res = await fetchDeloviPoServerFilteru({
          nedostajeFilter,
          samoDemo,
          samoDelimicni,
          tipKontrole: tip,
          limit: DELOVI_PAGE_SIZE,
          offset,
        });
        setServerFiltered(true);
        setServerPretraga(false);
        setLista((prev) => (reset ? res.delovi : [...prev, ...res.delovi]));
        setUkupnoUBazi(res.delovi.length + offset);
        setHasMore(res.hasMore);
        return;
      }
      if (imaTekstPretrage) {
        const offset = reset ? 0 : lista.length;
        const res = await pretraziDeloviSaMv({
          q: filter.trim(),
          tipKontrole: tip,
          limit: DELOVI_PAGE_SIZE,
          offset,
        });
        setServerFiltered(false);
        setServerPretraga(true);
        setLista((prev) => (reset ? res.delovi : [...prev, ...res.delovi]));
        setUkupnoUBazi(offset + res.delovi.length);
        setHasMore(res.hasMore);
        return;
      }
      setServerFiltered(false);
      setServerPretraga(false);
      const offset = reset ? 0 : lista.length;
      const [pageRes, total] = await Promise.all([
        fetchDeloviSaMv({ tipKontrole: tip, limit: DELOVI_PAGE_SIZE, offset }),
        countDeloviSaMv({ tipKontrole: tip }).catch(() => countDelovi({ tipKontrole: tip })),
      ]);
      setLista((prev) => (reset ? pageRes.delovi : [...prev, ...pageRes.delovi]));
      setUkupnoUBazi(total);
      setHasMore(offset + pageRes.delovi.length < total);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
      setUcitavaJos(false);
    }
  }, [addToast, tipFilter, imaServerFiltera, imaTekstPretrage, filter, nedostajeFilter, samoDemo, samoDelimicni, lista.length]);

  useEffect(() => { ucitaj({ reset: true }); }, [tipFilter, nedostajeFilter, samoDemo, samoDelimicni, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterDraft), 300);
    return () => clearTimeout(t);
  }, [filterDraft]);

  useEffect(() => {
    const osveziAgregate = () => {
      ucitajStatusAgregate({ force: true })
        .then(({ gu, gr, bk }) => {
          setGuBrojevi(gu);
          setGreskeBrojevi(gr);
          setBarkodSet(bk);
        })
        .catch((e) => addToast?.(e.message, "greska"));
    };
    osveziAgregate();
    const handler = () => {
      invalidirajStatusAgregate();
      osveziAgregate();
    };
    window.addEventListener(SIFRARNIK_STATUS_EVENT, handler);
    return () => window.removeEventListener(SIFRARNIK_STATUS_EVENT, handler);
  }, [addToast]);

  useEffect(() => {
    if (!navSignal?.ts) return;
    if (navSignal.nedostajeFilter != null) setNedostajeFilter(String(navSignal.nedostajeFilter));
    if (navSignal.samoDemo != null) setSamoDemo(!!navSignal.samoDemo);
    if (navSignal.samoDelimicni != null) setSamoDelimicni(!!navSignal.samoDelimicni);
  }, [navSignal?.ts, navSignal?.nedostajeFilter, navSignal?.samoDemo, navSignal?.samoDelimicni]);

  useEffect(() => {
    if (!statusMenuId) return undefined;
    const zatvori = () => setStatusMenuId(null);
    document.addEventListener("click", zatvori);
    return () => document.removeEventListener("click", zatvori);
  }, [statusMenuId]);

  const loadMore = async () => {
    if (serverFiltered || serverPretraga) {
      await ucitaj({ reset: false });
      return;
    }
    setUcitavaJos(true);
    try {
      const tip = tipFilter === "svi" ? null : tipFilter;
      const offset = lista.length;
      const page = await fetchDelovi({ tipKontrole: tip, limit: DELOVI_PAGE_SIZE, offset });
      setLista((prev) => [...prev, ...page]);
      setHasMore(offset + page.length < ukupnoUBazi);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUcitavaJos(false);
    }
  };

  const resetFiltere = () => {
    setFilterDraft("");
    setFilter("");
    setNedostajeFilter("");
    setSamoDemo(false);
    setSamoDelimicni(false);
  };

  const imaAktivnihFiltera = filter || nedostajeFilter || samoDemo || samoDelimicni;

  const bojaStatus = (key) => {
    if (key === "zelena") return C.zelena;
    if (key === "narandzasta") return C.narandzasta || "#f59e0b";
    return C.sivi;
  };

  const snimi = async () => {
    if (!forma?.id_deo?.trim()) {
      addToast?.("ID dela je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertDeo(forma);
      addToast?.("✓ Deo sačuvan", "uspeh");
      setForma(null);
      await ucitaj({ reset: true });
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };

  const prikaz = useMemo(() => {
    if (serverPretraga || serverFiltered) return lista;
    return lista.filter((d) => {
    const opts = optsZaDeo(d);
    if (samoDemo && !jeDemoIdDeo(d.id_deo)) return false;
    if (samoDelimicni && statusIzMvReda({ ...d, ...d._mv }) === "kompletan") return false;
    if (!deoOdgovaraNedostajeFilter(d, opts, nedostajeFilter)) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [d.id_deo, d.naziv_dela, d.karakteristika, d.vozilo_katalog_id, d.sifra_vozila, d.broj_crteza].some(
      (s) => String(s || "").toLowerCase().includes(q),
    );
  });
  }, [lista, filter, samoDemo, samoDelimicni, nedostajeFilter, serverPretraga, serverFiltered, optsZaDeo]);

  const demoNaPrikazu = useMemo(
    () => prikaz.filter((d) => jeDemoIdDeo(d.id_deo)).map((d) => d.id_deo),
    [prikaz],
  );

  const toggleIzbor = (idDeo) => {
    setIzabrani((prev) => {
      const next = new Set(prev);
      if (next.has(idDeo)) next.delete(idDeo);
      else next.add(idDeo);
      return next;
    });
  };

  const izaberiSveDemo = () => {
    setIzabrani(new Set(demoNaPrikazu));
  };

  const obrisiIzabrane = async () => {
    const ids = [...izabrani];
    if (!ids.length) {
      addToast?.("Izaberi delove za brisanje", "greska");
      return;
    }
    const demoIds = ids.filter((id) => jeDemoIdDeo(id));
    const prodIds = ids.filter((id) => !jeDemoIdDeo(id));

    if (prodIds.length) {
      const potvrda = window.prompt(
        `BRISANJE ${prodIds.length} PRODUKCIONIH del(a).\n\nUnesi OBRISI_DEO za potvrdu:\n${prodIds.slice(0, 6).join(", ")}${prodIds.length > 6 ? "…" : ""}`,
      );
      if (potvrda !== "OBRISI_DEO") {
        addToast?.("Brisanje otkazano — potrebna potvrda OBRISI_DEO", "greska");
        return;
      }
    } else if (!window.confirm(`Obrisati ${demoIds.length} demo del(a) i povezane šifrarnik redove?`)) {
      return;
    }

    try {
      const operativa = await fetchOperativniBrojeviPoDeo(ids);
      const saOperativom = ids.filter((id) => operativa[String(id).toUpperCase()]?.ukupno > 0);
      if (saOperativom.length) {
        const ukupno = saOperativom.reduce((s, id) => s + (operativa[String(id).toUpperCase()]?.ukupno || 0), 0);
        if (!window.confirm(`Upozorenje: ${saOperativom.length} del(a) ima ${ukupno} operativnih unosa (ostaju u bazi). Nastaviti?`)) {
          return;
        }
      }
    } catch (e) {
      addToast?.(`Operativa nije proverena: ${e.message}`, "greska");
    }

    setBrise(true);
    try {
      if (demoIds.length) await obrisiDemoDelove(demoIds);
      for (const id of prodIds) {
        await obrisiDeoIzSifrarnika(id);
      }
      addToast?.(`✓ Obrisano ${ids.length} delova`, "uspeh");
      obavestiPromenuStatusaSifrarnika({ izvor: "delovi", akcija: "obrisi" });
      setIzabrani(new Set());
      await ucitaj({ reset: true });
    } catch (e) {
      const hint = /function.*does not exist|obrisi_deo/i.test(e.message)
        ? " Pokreni 78/79 RPC ili npm run db:migrate:go-live"
        : "";
      addToast?.(e.message + hint, "greska");
    } finally {
      setBrise(false);
    }
  };

  return (
    <div data-testid="delovi-panel">
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>TIP</span>
          <select value={tipFilter} onChange={(e) => setTipFilter(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
            <option value="svi">Svi</option>
            <option value="deo">Delovi (komponente)</option>
            <option value="vozilo">Celo vozilo</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>PRETRAGA</span>
          <input value={filterDraft} onChange={(e) => setFilterDraft(e.target.value)} placeholder="ID, naziv…" style={INP} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: C.sivi, fontSize: 9 }}>NEDOSTAJE</span>
          <select
            data-testid="delovi-nedostaje-filter"
            value={nedostajeFilter}
            onChange={(e) => setNedostajeFilter(e.target.value)}
            style={{ ...INP, cursor: "pointer", minWidth: 140 }}
          >
            {NEDOSTAJE_FILTER_OPCIJE.map((o) => (
              <option key={o.id || "svi"} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi, paddingBottom: 6 }}>
          <input type="checkbox" checked={samoDemo} onChange={(e) => setSamoDemo(e.target.checked)} />
          Samo DEMO/TEST
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi, paddingBottom: 6 }}>
          <input type="checkbox" checked={samoDelimicni} onChange={(e) => setSamoDelimicni(e.target.checked)} />
          Samo delimični
        </label>
        <button type="button" onClick={() => setForma({ ...PRAZAN })}
          style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}>
          + Deo
        </button>
      </div>

      {(demoNaPrikazu.length > 0 || izabrani.size > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          {demoNaPrikazu.length > 0 && (
            <button type="button" onClick={izaberiSveDemo}
              style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6, color: C.tekst, fontSize: 10, padding: "6px 10px", cursor: "pointer" }}>
              Izaberi sve DEMO ({demoNaPrikazu.length})
            </button>
          )}
          <button type="button" disabled={brise || !izabrani.size} onClick={obrisiIzabrane}
            data-testid="delovi-obrisi-izabrane"
            style={{ background: `${C.crvena || "#dc2626"}22`, border: `1px solid ${C.crvena || "#dc2626"}55`, borderRadius: 6, color: C.crvena || "#dc2626", fontSize: 10, fontWeight: 700, padding: "6px 10px", cursor: "pointer", opacity: brise || !izabrani.size ? 0.5 : 1 }}>
            {brise ? "…" : `Obriši izabrane (${izabrani.size})`}
          </button>
          <span style={{ color: C.sivi, fontSize: 9 }}>DEMO automatski · produkcija traži OBRISI_DEO</span>
          {onBulkBarkod && izabrani.size > 0 && (
            <button type="button" data-testid="delovi-bulk-barkod"
              onClick={() => onBulkBarkod([...izabrani])}
              style={{ background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}>
              Barkod ({izabrani.size})
            </button>
          )}
        </div>
      )}

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.plava}44`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
            {[["ID deo *", "id_deo"], ["Naziv *", "naziv_dela"], ["Karakteristika", "karakteristika"]].map(([l, k]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ color: C.sivi, fontSize: 9 }}>{l}</span>
                <input value={forma[k] || ""} disabled={!!forma._postojeci && k === "id_deo"}
                  onChange={(e) => setForma((p) => ({ ...p, [k]: e.target.value }))} style={INP} />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>TIP KONTROLE</span>
              <select value={forma.tip_kontrole || "deo"} onChange={(e) => setForma((p) => ({ ...p, tip_kontrole: e.target.value }))} style={{ ...INP, cursor: "pointer" }}>
                <option value="deo">deo</option>
                <option value="vozilo">vozilo</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>VOZILO KATALOG ID</span>
              <input value={forma.vozilo_katalog_id || ""} onChange={(e) => setForma((p) => ({ ...p, vozilo_katalog_id: e.target.value }))} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>ŠIFRA VOZILA / FAMILIJA</span>
              <input value={forma.sifra_vozila || ""} placeholder="npr. HAM"
                onChange={(e) => setForma((p) => ({ ...p, sifra_vozila: e.target.value }))} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>BROJ CRTEŽA</span>
              <input value={forma.broj_crteza || ""} placeholder="npr. HAM-NM-001"
                onChange={(e) => setForma((p) => ({ ...p, broj_crteza: e.target.value }))} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>REVIZIJA</span>
              <input value={forma.revizija || ""} placeholder="A"
                onChange={(e) => setForma((p) => ({ ...p, revizija: e.target.value }))} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>KOM ZA KONTROLU</span>
              <input type="number" value={forma.kom_za_kontrolu ?? 30} onChange={(e) => setForma((p) => ({ ...p, kom_za_kontrolu: e.target.value }))} style={INP} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={snima} onClick={snimi}
              style={{ background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>
              {snima ? "…" : "Sačuvaj"}
            </button>
            <button type="button" onClick={() => setForma(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, fontSize: 11, padding: "8px 14px", cursor: "pointer" }}>
              Otkaži
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "28px 100px 1fr 72px 80px 70px 80px 56px 70px",
            background: C.hover, padding: "8px 10px", fontSize: 9, color: C.sivi, gap: 8,
          }}>
            <span />
            <span>ID</span><span>NAZIV</span><span>STATUS</span><span>TIP</span><span>VOZILO</span><span>KOM</span><span>AKT</span><span />
          </div>
          {!prikaz.length ? (
            <div style={{ padding: 24, textAlign: "center" }} data-testid="delovi-empty">
              {!loading && lista.length === 0 && !filter.trim() && tipFilter === "svi" ? (
                <>
                  <div style={{ color: C.sivi, fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
                    Još nema delova u šifrarniku. Kreiraj prvi deo kroz Glavni unos.
                  </div>
                  {onOtvoriGlavniUnos && (
                    <button
                      type="button"
                      data-testid="delovi-cta-gu"
                      onClick={() => onOtvoriGlavniUnos(null, { otvoriWizard: true })}
                      style={{
                        background: C.zelena,
                        border: "none",
                        borderRadius: 6,
                        color: C.onAkcent,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "10px 16px",
                        cursor: "pointer",
                      }}
                    >
                      + Novi deo u Glavnom unosu
                    </button>
                  )}
                </>
              ) : (
                <div style={{ color: C.border, fontSize: 11 }}>
                  Nema delova za prikaz
                  {imaAktivnihFiltera && (
                    <button type="button" data-testid="delovi-reset-filtere" onClick={resetFiltere}
                      style={{ display: "block", margin: "8px auto 0", background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 10 }}>
                      Poništi filtere
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : prikaz.map((d, i) => {
            const opts = optsZaDeo(d);
            const st = statusIzMvReda(d._mv ? { ...d, ...d._mv } : d) || statusDeoUSifrarniku(d, opts);
            const stMeta = STATUS_DEO_LABEL[st];
            const demo = jeDemoIdDeo(d.id_deo);
            const koraci = onNavigacijaStatus ? koraciNavigacijeIzStatusDeo(d, opts) : [];
            const klikStatus = (e) => {
              e.stopPropagation();
              if (!koraci.length) return;
              if (koraci.length === 1) {
                setStatusMenuId(null);
                onNavigacijaStatus?.(koraci[0].tab, koraci[0].ctx);
                return;
              }
              setStatusMenuId((prev) => (prev === d.id_deo ? null : d.id_deo));
            };
            return (
            <div key={d.id_deo} style={{
              display: "grid", gridTemplateColumns: "28px 100px 1fr 72px 80px 70px 80px 56px 70px",
              padding: "8px 10px", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 11, gap: 8, alignItems: "center",
              opacity: d.aktivan === false ? 0.55 : 1,
            }}>
              <span>
                <input
                  type="checkbox"
                  checked={izabrani.has(d.id_deo)}
                  onChange={() => toggleIzbor(d.id_deo)}
                  title="Izaberi za brisanje"
                />
              </span>
              <span style={{ fontWeight: 700, color: C.plava }}>{d.id_deo}</span>
              <span>{d.naziv_dela}</span>
              <div style={{ position: "relative" }}>
              <span
                data-testid={`delovi-status-${d.id_deo}`}
                role={koraci.length ? "button" : undefined}
                tabIndex={koraci.length ? 0 : undefined}
                onClick={koraci.length ? klikStatus : undefined}
                onKeyDown={koraci.length ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    klikStatus(e);
                  }
                } : undefined}
                style={{
                fontSize: 9,
                fontWeight: 700,
                color: bojaStatus(stMeta.boja),
                cursor: koraci.length ? "pointer" : "default",
                textDecoration: koraci.length ? "underline dotted" : "none",
              }}
              title={koraci.length
                ? `${tooltipStatusDeo(d, opts)} — klik${koraci.length > 1 ? " (meni koraka)" : `: ${koraci[0].label}`}`
                : tooltipStatusDeo(d, opts)}
              >
                {stMeta.label}
              </span>
              {statusMenuId === d.id_deo && koraci.length > 1 && (
                <div
                  data-testid={`delovi-status-menu-${d.id_deo}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                  position: "absolute",
                  zIndex: 20,
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  minWidth: 120,
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,.25)",
                  padding: 4,
                }}
                >
                  {koraci.map((k) => (
                    <button
                      key={k.label}
                      type="button"
                      data-testid={`delovi-status-nav-${k.tab}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusMenuId(null);
                        onNavigacijaStatus?.(k.tab, k.ctx);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        color: C.plava,
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "4px 6px",
                        cursor: "pointer",
                      }}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              )}
              </div>
              <span style={{ color: C.sivi, fontSize: 10 }}>{d.tip_kontrole || "deo"}</span>
              <span style={{ color: C.sivi, fontSize: 10 }}>{d.sifra_vozila || "—"}</span>
              <span style={{ color: C.sivi }}>{d.kom_za_kontrolu ?? "—"}</span>
              <span style={{ color: d.aktivan !== false ? C.zelena : C.crvena, fontSize: 10 }}>{d.aktivan !== false ? "DA" : "NE"}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {onOtvoriGlavniUnos && (
                  <button
                    type="button"
                    onClick={() => onOtvoriGlavniUnos?.(d.id_deo, { otvoriWizard: !(opts.guBroj > 0) })}
                    title="Otvori u Glavnom unosu"
                    style={{ background: `${C.plava}18`, border: `1px solid ${C.plava}44`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer", color: C.plava }}
                  >
                    GU{opts.guBroj > 0 ? ` (${opts.guBroj})` : ""}
                  </button>
                )}
                <button type="button" onClick={() => setForma({ ...d, _postojeci: true })}
                  style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer" }}>✎</button>
                {onStampaj && (
                  <button type="button" onClick={() => onStampaj(d)} title="Barkod"
                    style={{ background: `${C.zelena}22`, border: `1px solid ${C.zelena}55`, borderRadius: 4, fontSize: 9, padding: "2px 5px", cursor: "pointer", color: C.zelena }}>▦</button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>
          {prikaz.length} prikazano · učitano {lista.length}/{ukupnoUBazi}
        </span>
        {hasMore && (
          <button
            type="button"
            data-testid="delovi-ucitaj-jos"
            disabled={ucitavaJos}
            onClick={loadMore}
            style={{ background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 9, padding: "4px 10px", cursor: "pointer" }}
          >
            {ucitavaJos ? "…" : `Učitaj još (${DELOVI_PAGE_SIZE})`}
          </button>
        )}
      </div>
    </div>
  );
}
