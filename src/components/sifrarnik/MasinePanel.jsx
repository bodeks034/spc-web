import { useState, useEffect, useCallback } from "react";
import { fetchMasine, upsertMasina, deleteMasina } from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";

const PRAZAN = { naziv: "", linija: "" };

export default function MasinePanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchMasine()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertMasina(forma);
      addToast?.("✓ Mašina sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  return (
    <CrudShell C={C} loading={loading} count={lista.length} tabela="masine" onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Mašina">
      {forma && (
        <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
          fields={[["Naziv *", "naziv"], ["Linija", "linija"]]} />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C} cols={["ID", "NAZIV", "LINIJA", ""]} widths="40px 1fr 1fr 56px" />
        {lista.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} widths="40px 1fr 1fr 56px" cols={[
            r.id, r.naziv, r.linija || "—",
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {
              if (!window.confirm("Obrisati?")) return;
              try { await deleteMasina(r.id); await ucitaj(); } catch (e) { addToast?.(e.message, "greska"); }
            }} />,
          ]} />
        ))}
      </div>
    </CrudShell>
  );
}
