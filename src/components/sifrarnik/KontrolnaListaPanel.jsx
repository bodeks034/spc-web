import { useState, useEffect, useCallback } from "react";
import {
  fetchKontrolnaLista,
  upsertKontrolnaStavka,
  deleteKontrolnaStavka,
  fetchKontrolnaListaLog,
} from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle } from "./sifrarnikPanelStyle.js";
import { danasIso } from "../../lib/kontrolaLista.js";

const PRAZAN = { kategorija: "", stavka: "", redosled: 0, aktivna: true };

export default function KontrolnaListaPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logDatum, setLogDatum] = useState(() => danasIso());
  const [logSmena, setLogSmena] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchKontrolnaLista()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  const ucitajLog = useCallback(async () => {
    setLogLoading(true);
    try {
      setLog(await fetchKontrolnaListaLog({
        limit: 50,
        datum: logDatum || null,
        smena: logSmena === "" ? null : logSmena,
      }));
    } catch (e) {
      addToast?.(e.message, "greska");
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  }, [addToast, logDatum, logSmena]);

  useEffect(() => { ucitaj(); }, [ucitaj]);
  useEffect(() => { ucitajLog(); }, [ucitajLog]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertKontrolnaStavka(forma);
      addToast?.("✓ Stavka sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  const INP = inpStyle(C);

  return (
    <CrudShell C={C} loading={loading} count={lista.length} tabela="kontrolna_lista_stavke"
      onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Stavka">
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>Kontrolna lista pre unosa (po smeni).</div>
      {forma && (
        <>
          <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
            fields={[["Kategorija", "kategorija"], ["Stavka *", "stavka"], ["Redosled", "redosled"]]} cols={3} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.tekst, margin: "-4px 0 12px" }}>
            <input type="checkbox" checked={forma.aktivna !== false}
              onChange={(e) => setForma((p) => ({ ...p, aktivna: e.target.checked }))} />
            Aktivna
          </label>
        </>
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C} cols={["#", "KAT.", "STAVKA", "AKT", ""]} widths="40px 1fr 2fr 50px 56px" />
        {lista.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} widths="40px 1fr 2fr 50px 56px" cols={[
            r.redosled ?? 0, r.kategorija || "—", r.stavka,
            r.aktivna !== false ? "DA" : "NE",
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {
              if (!window.confirm("Obrisati?")) return;
              try { await deleteKontrolnaStavka(r.id); await ucitaj(); } catch (e) { addToast?.(e.message, "greska"); }
            }} />,
          ]} />
        ))}
      </div>

      <div
        data-testid="kontrolna-lista-log"
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>
              Log završenih lista
            </div>
            <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
              Ko je potvrdio ček-listu · smena / datum
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }}>DATUM</span>
              <input
                type="date"
                data-testid="kontrolna-log-datum"
                value={logDatum}
                onChange={(e) => setLogDatum(e.target.value)}
                style={{ ...INP, fontSize: 10, padding: "4px 6px" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }}>SMENA</span>
              <select
                data-testid="kontrolna-log-smena"
                value={logSmena}
                onChange={(e) => setLogSmena(e.target.value)}
                style={{ ...INP, fontSize: 10, padding: "4px 6px", cursor: "pointer" }}
              >
                <option value="">Sve</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="kontrolna-log-osvezi"
              onClick={ucitajLog}
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.tekst, fontSize: 9, fontWeight: 700, padding: "6px 10px", cursor: "pointer",
              }}
            >
              ↻ Osveži
            </button>
          </div>
        </div>

        {logLoading ? (
          <div style={{ color: C.sivi, fontSize: 10 }}>Učitavanje loga…</div>
        ) : !log.length ? (
          <div style={{ color: C.sivi, fontSize: 10 }}>
            Nema završenih lista za izabrani filter.
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
            <TableHead
              C={C}
              cols={["VREME", "RADNIK", "SM", "MODUL", "DATUM"]}
              widths="1.2fr 1.4fr 40px 1fr 90px"
            />
            {log.map((r, i) => (
              <TableRow
                key={r.id}
                C={C}
                i={i}
                widths="1.2fr 1.4fr 40px 1fr 90px"
                cols={[
                  r.created_at
                    ? new Date(r.created_at).toLocaleString("sr-RS", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                    : "—",
                  r.radnik_ime,
                  r.smena ?? "—",
                  r.modul || "—",
                  r.datum || "—",
                ]}
              />
            ))}
          </div>
        )}
      </div>
    </CrudShell>
  );
}
