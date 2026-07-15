import { useState, useEffect, useCallback } from "react";
import { fetchSmene, upsertSmena, deleteSmena } from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";

const PRAZAN = { naziv: "", pocetak: "", kraj: "" };

export default function SmenePanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchSmene()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertSmena(forma);
      addToast?.("✓ Smena sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  return (
    <CrudShell C={C} loading={loading} count={lista.length} tabela="smene" onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Smena">
      {forma && (
        <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
          fields={[["Naziv *", "naziv"], ["Početak", "pocetak"], ["Kraj", "kraj"]]} cols={3} />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C} cols={["ID", "SMENA", "OD", "DO", ""]} widths="40px 1fr 80px 80px 56px" />
        {lista.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} widths="40px 1fr 80px 80px 56px" cols={[
            r.id, r.naziv, r.pocetak || "—", r.kraj || "—",
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {
              if (!window.confirm("Obrisati?")) return;
              try { await deleteSmena(r.id); await ucitaj(); } catch (e) { addToast?.(e.message, "greska"); }
            }} />,
          ]} />
        ))}
      </div>
    </CrudShell>
  );
}
