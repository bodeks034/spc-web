import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchNastaviChecklist,
  fetchDelimicniDeloviPreview,
  fetchKompletnostStatistika,
  STATUS_DEO_LABEL,
} from "../../lib/sifrarnikOdrzavanje.js";
import { SIFRARNIK_STATUS_EVENT } from "../../lib/sifrarnikStatusEvent.js";
import { etiketaLinije, grupisiLinije, jeLinijaProizvod, jeLinijaVozila, nazivLinijeZaPrikaz } from "../../lib/linijaProizvoda.js";
import { GLAVNI_UNOS_SHEET_TIP } from "../../lib/glavniUnosSheetTip.js";
import {
  RADNI_FILTERI,
  stavkaOdgovaraRadniFilter,
  ucitajPoslednjiDeo,
  ucitajDanasnjiBrojac,
  ucitajDanasnjiBrojacSpojen,
  tourZavrsen,
  resetujTour,
} from "../../lib/sifrarnikRadniTok.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";
import SifrarnikGlobalPretraga from "./SifrarnikGlobalPretraga.jsx";
import SifrarnikRadniTour from "./SifrarnikRadniTour.jsx";

/**
 * Dnevni sto Modula 0 — linija + sledeći korak + lista delimičnih.
 */
export default function SifrarnikRadniRezim({
  C,
  tipoviVozila = [],
  radnaLinija = "",
  onPromeniLiniju,
  onNoviDeo,
  onNavigate,
  onOtvoriHub,
  addToast,
  prikaziTehnicko = false,
  autoOtvoriSledeci = false,
  onAutoSledeciPotrosen,
  sakrijHub = false,
}) {
  const [stavka, setStavka] = useState(null);
  const [lista, setLista] = useState([]);
  const [komplet, setKomplet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [poslednji, setPoslednji] = useState(() => ucitajPoslednjiDeo());
  const [danas, setDanas] = useState(() => ucitajDanasnjiBrojac());
  const [tourOtvoren, setTourOtvoren] = useState(() => !tourZavrsen());

  const { vozila, proizvodi, ostalo } = useMemo(
    () => grupisiLinije(tipoviVozila),
    [tipoviVozila],
  );
  const imaLinije = vozila.length + proizvodi.length + ostalo.length > 0;

  const nazivLinije = useMemo(() => {
    if (!radnaLinija) return "";
    const svi = [...vozila, ...proizvodi, ...ostalo];
    return svi.find((t) => t.kod === radnaLinija)?.naziv || "";
  }, [radnaLinija, vozila, proizvodi, ostalo]);

  const listaFiltrirana = useMemo(
    () => (lista || []).filter((s) => stavkaOdgovaraRadniFilter(s, filter)),
    [lista, filter],
  );

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const linija = radnaLinija || null;
      const [nastavi, delim, komp] = await Promise.all([
        fetchNastaviChecklist({ linijaKod: linija }),
        fetchDelimicniDeloviPreview({ limit: 15, linijaKod: linija }),
        linija
          ? fetchKompletnostStatistika({ linijaKod: linija })
          : Promise.resolve(null),
      ]);
      setStavka(nastavi);
      setLista(delim || []);
      setKomplet(komp);
      setPoslednji(ucitajPoslednjiDeo());
      setDanas(await ucitajDanasnjiBrojacSpojen());
    } catch (e) {
      addToast?.(e.message, "greska");
      setStavka(null);
      setLista([]);
      setKomplet(null);
    } finally {
      setLoading(false);
    }
  }, [radnaLinija, addToast]);

  useEffect(() => { osvezi(); }, [osvezi]);

  useEffect(() => {
    const handler = () => {
      setPoslednji(ucitajPoslednjiDeo());
      ucitajDanasnjiBrojacSpojen().then(setDanas).catch(() => setDanas(ucitajDanasnjiBrojac()));
      osvezi();
    };
    window.addEventListener(SIFRARNIK_STATUS_EVENT, handler);
    return () => window.removeEventListener(SIFRARNIK_STATUS_EVENT, handler);
  }, [osvezi]);

  useEffect(() => {
    if (!autoOtvoriSledeci || loading || tourOtvoren) return;
    onAutoSledeciPotrosen?.();
    const prvi = stavka?.koraci?.[0];
    if (prvi) onNavigate?.(prvi.tab, prvi.ctx || {});
  }, [autoOtvoriSledeci, loading, tourOtvoren, stavka, onNavigate, onAutoSledeciPotrosen]);

  useEffect(() => {
    const onKey = (e) => {
      if (tourOtvoren) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Enter") {
        const korak = stavka?.koraci?.[0];
        if (!korak) return;
        e.preventDefault();
        onNavigate?.(korak.tab, korak.ctx || {});
        return;
      }
      if (e.key === "n" || e.key === "N") {
        if (!radnaLinija) return;
        e.preventDefault();
        onNoviDeo?.(radnaLinija);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        osvezi();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOtvoren, stavka, radnaLinija, onNavigate, onNoviDeo, osvezi]);

  const idiKorak = (tab, ctx = {}) => {
    onNavigate?.(tab, ctx);
  };

  const nastaviPoslednji = () => {
    if (!poslednji?.idDeo) return;
    const tab = poslednji.tab || "delovi";
    idiKorak(tab, {
      idDeo: poslednji.idDeo,
      radnaLinijaFilter: poslednji.linija || radnaLinija || undefined,
    });
  };

  const tileLinije = (t, boja) => (
    <button
      key={t.kod}
      type="button"
      data-testid={`radni-rezim-tile-${t.kod}`}
      onClick={() => onPromeniLiniju?.(t.kod)}
      title={etiketaLinije(t.kod, t.naziv)}
      style={{
        background: C.panel,
        border: `1px solid ${boja}55`,
        borderRadius: 6,
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: 9,
        textAlign: "left",
        minWidth: 96,
      }}
    >
      <span style={{ color: boja, fontWeight: 700 }}>{t.kod}</span>
      {nazivLinijeZaPrikaz(t.kod, t.naziv) ? (
        <span style={{
          display: "block", color: C.sivi, fontSize: 10, marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120,
        }}
        >
          {nazivLinijeZaPrikaz(t.kod, t.naziv)}
        </span>
      ) : null}
    </button>
  );

  const prvi = stavka?.koraci?.[0];
  const stMeta = stavka ? STATUS_DEO_LABEL[stavka.status] : null;
  const fokusBoja = jeLinijaProizvod(radnaLinija)
    ? (C.zelena || "#22c55e")
    : jeLinijaVozila(radnaLinija)
      ? C.plava
      : C.sivi;

  return (
    <div data-testid="sifrarnik-radni-rezim" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      {tourOtvoren && (
        <SifrarnikRadniTour C={C} onZavrsi={() => setTourOtvoren(false)} />
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 15, fontWeight: 700, letterSpacing: 0.4 }}>
            Radni režim
            {radnaLinija ? (
              <span style={{ color: fokusBoja, marginLeft: 8, fontSize: 12 }}>{radnaLinija}</span>
            ) : null}
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
            Linija → sledeći korak → delimični.
            {!sakrijHub ? " Za ERP / audit: Svi tabovi." : " Na tabletu radi ovde."}
            {" "}
            <span data-testid="radni-rezim-tastatura" style={{ opacity: 0.85 }}>
              Enter · sledeći · N · novi · R · osveži
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div
            data-testid="radni-rezim-danas"
            title={danas.izvor === "audit+lokal"
              ? "Timski (audit) + ovaj uređaj"
              : "Lokalno na ovom uređaju (audit nedostupan ili prazan)"}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.panel,
              fontSize: 10,
              color: C.tekst,
              fontWeight: 700,
            }}
          >
            Danas zatvoreno{" "}
            <span style={{ color: C.zelena || "#22c55e" }}>{danas.broj}</span>
          </div>
          {komplet && radnaLinija && (
            <div
              data-testid="radni-rezim-kompletnost"
              title={`Kompletno ${komplet.kompletno}/${komplet.ukupno}`}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${(komplet.procenat >= 80 ? C.zelena : C.narandzasta || "#f59e0b")}55`,
                background: `${komplet.procenat >= 80 ? C.zelena : C.narandzasta || "#f59e0b"}12`,
                fontSize: 10,
                fontWeight: 700,
                color: C.tekst,
              }}
            >
              {komplet.procenat}% kompletno
              <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 4 }}>
                ({komplet.kompletno}/{komplet.ukupno})
              </span>
            </div>
          )}
          <SifrarnikGlobalPretraga
            C={C}
            addToast={addToast}
            onNavigate={onNavigate}
            radnaLinija={radnaLinija}
            kompakt
          />
          {!sakrijHub && (
            <button
              type="button"
              data-testid="sifrarnik-otvori-hub"
              onClick={() => onOtvoriHub?.()}
              style={btnStyle(C, C.hover, { fontSize: 9 })}
            >
              Svi tabovi →
            </button>
          )}
          <button
            type="button"
            data-testid="radni-tour-restart"
            onClick={() => {
              resetujTour();
              setTourOtvoren(true);
            }}
            style={btnStyle(C, C.hover, { fontSize: 9 })}
            title="Prikaži 3-korak obuku ponovo"
          >
            Obuka
          </button>
        </div>
      </div>

      {poslednji?.idDeo && (
        <div
          data-testid="radni-rezim-poslednji"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${C.plava}44`,
            background: `${C.plava}0d`,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
          }}
        >
          <span style={{ color: C.tekst }}>
            Nastavi gde si stao:{" "}
            <strong style={{ color: C.plava }}>{poslednji.idDeo}</strong>
            {poslednji.linija ? (
              <span style={{ color: C.sivi }}> · {poslednji.linija}</span>
            ) : null}
          </span>
          <button
            type="button"
            data-testid="radni-rezim-poslednji-cta"
            onClick={nastaviPoslednji}
            style={btnStyle(C, C.plava, { fontSize: 9 })}
          >
            Otvori →
          </button>
        </div>
      )}

      {!imaLinije && (
        <div
          data-testid="radni-rezim-nema-linija"
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid ${C.narandzasta || "#f59e0b"}55`,
            background: `${C.narandzasta || "#f59e0b"}12`,
            fontSize: 10,
            lineHeight: 1.45,
            color: C.tekst,
          }}
        >
          Nema VOZ/PRO linija u šifrarniku.
          {" "}
          {!sakrijHub && (
            <button
              type="button"
              onClick={() => idiKorak("vozila")}
              style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 10 }}
            >
              Otvori Tipovi linija →
            </button>
          )}
          {prikaziTehnicko && (
            <span style={{ color: C.sivi }}>
              {" "}(admin: migracija <code>87_tipovi_linije_privremene.sql</code>)
            </span>
          )}
        </div>
      )}

      {!radnaLinija && imaLinije && (
        <div data-testid="radni-rezim-izbor-tiles" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700 }}>IZABERI LINIJU ZA DANAS</div>
          {vozila.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {vozila.slice(0, 10).map((t) => tileLinije(t, C.plava))}
            </div>
          )}
          {proizvodi.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {proizvodi.slice(0, 10).map((t) => tileLinije(t, C.zelena || "#22c55e"))}
            </div>
          )}
          {ostalo.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ostalo.slice(0, 6).map((t) => tileLinije(t, C.sivi))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${radnaLinija ? `${fokusBoja}55` : C.border}`,
          background: radnaLinija ? `${fokusBoja}0d` : C.panel,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px" }}>
          <span style={{ color: C.sivi, fontSize: 9, whiteSpace: "nowrap" }}>Linija:</span>
          <select
            data-testid="radni-rezim-linija-select"
            value={radnaLinija || ""}
            onChange={(e) => onPromeniLiniju?.(e.target.value)}
            style={{
              flex: 1,
              minWidth: 140,
              fontSize: 11,
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.tekst,
              cursor: "pointer",
            }}
          >
            <option value="">— izaberi liniju —</option>
            {vozila.length > 0 && (
              <optgroup label="Vozila (VOZ)">
                {vozila.map((t) => (
                  <option key={t.kod} value={t.kod}>{etiketaLinije(t.kod, t.naziv)}</option>
                ))}
              </optgroup>
            )}
            {proizvodi.length > 0 && (
              <optgroup label="Proizvodi (PRO)">
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
        </label>
        {radnaLinija && nazivLinijeZaPrikaz(radnaLinija, nazivLinije) && (
          <span style={{ color: C.sivi, fontSize: 9, flex: "1 1 140px" }}>
            {nazivLinijeZaPrikaz(radnaLinija, nazivLinije)}
          </span>
        )}
        <button
          type="button"
          data-testid="radni-rezim-novi-deo"
          disabled={!radnaLinija}
          onClick={() => onNoviDeo?.(radnaLinija)}
          style={btnStyle(C, C.zelena, { fontSize: 10, opacity: radnaLinija ? 1 : 0.5 })}
        >
          + Novi deo
        </button>
        <button
          type="button"
          data-testid="radni-rezim-glavni-unos"
          onClick={() => idiKorak("glavni_unos", { radnaLinijaFilter: radnaLinija || undefined })}
          style={btnStyle(C, C.plava, { fontSize: 10 })}
        >
          Glavni unos
        </button>
      </div>

      <div
        data-testid="radni-rezim-sledeci"
        style={{
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${(C.narandzasta || "#f59e0b")}55`,
          background: `${C.narandzasta || "#f59e0b"}12`,
        }}
      >
        <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
          SLEDEĆI KORAK
        </div>
        {loading ? (
          <div style={{ color: C.sivi, fontSize: 10 }}>Učitavanje…</div>
        ) : !stavka ? (
          <div style={{ color: C.zelena || "#22c55e", fontSize: 11, fontWeight: 700 }}>
            {radnaLinija
              ? `Nema delimičnih delova na ${radnaLinija} — možeš dodati novi deo.`
              : "Izaberi liniju iznad (ili pločicu) da kreneš."}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, lineHeight: 1.45, color: C.tekst }}>
              <strong style={{ color: C.plava }}>{stavka.deo.id_deo}</strong>
              {stavka.deo.naziv_dela ? (
                <span style={{ color: C.sivi }}> — {stavka.deo.naziv_dela}</span>
              ) : null}
              {" · "}
              <span style={{ color: C.narandzasta || "#f59e0b", fontWeight: 700 }}>
                {stMeta?.label || stavka.status}
              </span>
              {stavka.nedostaje?.length > 0 && (
                <span style={{ color: C.sivi }}> (nedostaje: {stavka.nedostaje.join(", ")})</span>
              )}
              {stavka.ukupnoDelimicnih > 0 && (
                <span style={{ color: C.sivi, marginLeft: 6 }}>
                  ({stavka.redniBroj}/{stavka.ukupnoDelimicnih})
                </span>
              )}
            </div>
            {prvi && (
              <button
                type="button"
                data-testid="radni-rezim-sledeci-cta"
                onClick={() => idiKorak(prvi.tab, prvi.ctx)}
                style={btnStyle(C, C.plava, { fontSize: 11 })}
              >
                {prvi.label} →
              </button>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 180,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.panel,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
        >
          <span style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>
            Delimični delovi{radnaLinija ? ` · ${radnaLinija}` : ""}
            {listaFiltrirana.length > 0 ? ` (${listaFiltrirana.length})` : ""}
          </span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {RADNI_FILTERI.map((f) => (
              <button
                key={f.id || "svi"}
                type="button"
                data-testid={`radni-filter-${f.id || "svi"}`}
                onClick={() => setFilter(f.id)}
                style={{
                  background: filter === f.id ? C.plava : C.hover,
                  color: filter === f.id ? (C.onAkcent || "#fff") : C.tekst,
                  border: `1px solid ${filter === f.id ? C.plava : C.border}`,
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              data-testid="radni-rezim-osvezi"
              onClick={osvezi}
              style={btnStyle(C, C.hover, { fontSize: 9 })}
            >
              ↻ Osveži
            </button>
          </div>
        </div>
        <div style={{ overflow: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {loading && !lista.length ? (
            <div style={{ padding: 20, color: C.sivi, fontSize: 10 }}>Učitavanje…</div>
          ) : !listaFiltrirana.length ? (
            <div style={{ padding: 24, textAlign: "center", color: C.sivi, fontSize: 10 }} data-testid="radni-rezim-prazno">
              {lista.length && filter
                ? `Nema delova sa filterom „${RADNI_FILTERI.find((x) => x.id === filter)?.label || filter}“.`
                : radnaLinija
                  ? `Nema delimičnih za ${radnaLinija}.`
                  : "Izaberi liniju da vidiš šta nedostaje."}
              {radnaLinija && !filter && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => onNoviDeo?.(radnaLinija)}
                    style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 10 }}
                  >
                    + Novi deo
                  </button>
                </>
              )}
            </div>
          ) : (
            listaFiltrirana.map((s, i) => {
              const meta = STATUS_DEO_LABEL[s.status];
              const korak = s.koraci?.[0];
              const boja = meta?.boja === "zelena" ? C.zelena
                : meta?.boja === "narandzasta" ? (C.narandzasta || "#f59e0b")
                  : C.sivi;
              return (
                <div
                  key={s.deo.id_deo}
                  data-testid={`radni-rezim-red-${s.deo.id_deo}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(100px, 1.2fr) minmax(80px, 1fr) auto",
                    gap: 8,
                    padding: "10px 12px",
                    borderTop: i ? `1px solid ${C.border}` : "none",
                    alignItems: "center",
                    fontSize: 10,
                  }}
                >
                  <div>
                    <div style={{ color: C.plava, fontWeight: 700 }}>{s.deo.id_deo}</div>
                    {s.deo.naziv_dela && (
                      <div style={{ color: C.sivi, fontSize: 9 }}>{s.deo.naziv_dela}</div>
                    )}
                  </div>
                  <div>
                    <span style={{ color: boja, fontWeight: 700 }}>{meta?.label || s.status}</span>
                    {s.nedostaje?.length > 0 && (
                      <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
                        {s.nedostaje.join(", ")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {korak && (
                      <button
                        type="button"
                        onClick={() => idiKorak(korak.tab, korak.ctx)}
                        style={btnStyle(C, C.plava, { fontSize: 9 })}
                      >
                        {korak.label} →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => idiKorak("delovi", { idDeo: s.deo.id_deo })}
                      style={btnStyle(C, C.hover, { fontSize: 9 })}
                    >
                      Pregled
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {lista.length > 0 && (
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, color: C.sivi, fontSize: 9 }}>
            Prikazano {listaFiltrirana.length}
            {filter ? ` / ${lista.length}` : ""} ·{" "}
            <button
              type="button"
              onClick={() => idiKorak("delovi", {
                samoDelimicni: true,
                radnaLinijaFilter: radnaLinija || undefined,
                nedostajeFilter: filter || undefined,
              })}
              style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 9 }}
            >
              Svi delimični →
            </button>
            {" · "}
            <button
              type="button"
              onClick={() => idiKorak("glavni_unos", {
                otvoriWizard: true,
                wizardLinija: radnaLinija || null,
                wizardTip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT,
              })}
              style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 9 }}
            >
              Čarobnjak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
