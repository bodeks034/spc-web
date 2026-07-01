import { useState, useEffect, useCallback } from "react";
import { fetchPogonLinijaMapa, upsertPogonLinijaMapa, obrisiPogonLinijaMapa } from "../../lib/glavniUnosApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { usePogonOznake } from "./usePogonOznake.js";

const PRAZAN = { linija_faza: "", linija_id: "", pogon_kod: "" };

export default function PogonMapaPanel({ C, addToast }) {
  const { format: formatPogon } = usePogonOznake(addToast);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setLista(await fetchPogonLinijaMapa());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.linija_faza?.trim()) {
      addToast?.("Unesi liniju/fazu", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertPogonLinijaMapa([forma]);
      addToast?.("✓ Mapa sačuvana", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const obrisi = async (linijaFaza) => {
    if (!window.confirm(`Ukloniti mapu za „${linijaFaza}"?`)) return;
    try {
      await obrisiPogonLinijaMapa(linijaFaza);
      addToast?.("Uklonjeno", "uspeh");
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>
        Mapiranje linija/faza ↔ pogon slovo (A–I). U listama se prikazuje kao <em>A — Ulazna kontrola</em>.
      </div>
      <CrudShell C={C} loading={loading} count={lista.length} tabela="pogon_linija_mapa"
        onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Linija / pogon">
        {forma && (
          <FormGrid C={C} onCancel={() => setForma(null)} onSave={snimi} snima={snima}
            fields={[
              ["Linija / faza *", "linija_faza"],
              ["Linija ID", "linija_id"],
              ["Pogon kod *", "pogon_kod"],
            ]}
            forma={forma}
            setForma={setForma}
          />
        )}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <TableHead C={C} cols={["LINIJA / FAZA", "LINIJA ID", "POGON (SLOVO — LINIJA)", ""]} widths="1fr 80px 200px 56px" />
          {lista.map((r, i) => (
            <TableRow key={r.linija_faza} C={C} i={i} cols={[
              r.linija_faza,
              r.linija_id ?? "—",
              formatPogon(r.pogon_kod),
              <RowActions key="a" C={C}
                onEdit={() => setForma({ ...r, linija_id: r.linija_id ?? "" })}
                onDelete={() => obrisi(r.linija_faza)}
              />,
            ]} widths="1fr 80px 200px 56px" />
          ))}
        </div>
      </CrudShell>
    </div>
  );
}
