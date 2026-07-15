import { useState, useEffect, useCallback } from "react";
import { fetchKontrolnaLista, upsertKontrolnaStavka, deleteKontrolnaStavka } from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle } from "./sifrarnikPanelStyle.js";

const PRAZAN = { kategorija: "", stavka: "", redosled: 0, aktivna: true };

export default function KontrolnaListaPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchKontrolnaLista()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

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
    </CrudShell>
  );
}
