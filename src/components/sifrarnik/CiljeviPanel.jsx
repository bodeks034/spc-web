import { useState, useEffect, useCallback } from "react";
import { fetchCiljevi, upsertCilj, deleteCilj } from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle } from "./sifrarnikPanelStyle.js";

const PRAZAN = { id_deo: "", rty_cilj: 95, dpmo_cilj: 50000, p_cilj: 5, vazi_od: "", napomena: "" };

export default function CiljeviPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [filter, setFilter] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try { setLista(await fetchCiljevi()); } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertCilj(forma);
      addToast?.("✓ Cilj sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  const prikaz = lista.filter((r) => !filter.trim() || String(r.id_deo).toLowerCase().includes(filter.toLowerCase()));

  return (
    <CrudShell C={C} loading={loading} count={prikaz.length} tabela="ciljevi"
      onAdd={() => setForma({ ...PRAZAN, vazi_od: new Date().toISOString().split("T")[0] })} addLabel="+ Cilj">
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter ID dela…"
        style={{ ...inpStyle(C), marginBottom: 10, width: 200 }} />
      {forma && (
        <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
          fields={[
            ["ID deo *", "id_deo"], ["RTY cilj %", "rty_cilj"], ["DPMO cilj", "dpmo_cilj"],
            ["p cilj %", "p_cilj"], ["Važi od", "vazi_od"], ["Napomena", "napomena"],
          ]} cols={3} />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C} cols={["DELO", "RTY%", "DPMO", "p%", "OD", ""]} widths="100px 70px 80px 60px 90px 56px" />
        {prikaz.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} widths="100px 70px 80px 60px 90px 56px" cols={[
            r.id_deo, r.rty_cilj ?? "—", r.dpmo_cilj ?? "—", r.p_cilj ?? "—", r.vazi_od || "—",
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {
              if (!window.confirm("Obrisati cilj?")) return;
              try { await deleteCilj(r.id); await ucitaj(); } catch (e) { addToast?.(e.message, "greska"); }
            }} />,
          ]} />
        ))}
      </div>
    </CrudShell>
  );
}
