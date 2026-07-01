import { useState, useEffect, useCallback } from "react";
import { fetchDelovi, upsertDeo } from "../../lib/sifrarnikApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { inpStyle } from "./sifrarnikPanelStyle.js";

const PRAZAN = {
  id_deo: "", naziv_dela: "", karakteristika: "", slika_naziv: "",
  kom_za_kontrolu: 30, aktivan: true, tip_kontrole: "deo",
};

export default function DeloviCrtezPanel({ C, addToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [filter, setFilter] = useState("");
  const INP = inpStyle(C);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const svi = await fetchDelovi({ samoAktivni: false });
      setLista(svi.filter((d) => (d.tip_kontrole || "deo") !== "vozilo"));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const snimi = async () => {
    if (!forma?.id_deo?.trim()) {
      addToast?.("ID dela je obavezan", "greska");
      return;
    }
    setSnima(true);
    try {
      await upsertDeo({ ...forma, tip_kontrole: "deo" });
      addToast?.("✓ Crtež dela sačuvan", "uspeh");
      setForma(null);
      await ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const prikaz = lista.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [d.id_deo, d.naziv_dela, d.slika_naziv].some((s) => String(s || "").toLowerCase().includes(q));
  });

  const polja = [
    ["ID deo *", "id_deo"],
    ["Naziv dela", "naziv_dela"],
    ["Karakteristika", "karakteristika"],
    ["Crtež / slika", "slika_naziv"],
    ["Kom za kontrolu", "kom_za_kontrolu"],
  ];

  return (
    <CrudShell
      C={C}
      loading={loading}
      count={prikaz.length}
      tabela="delovi (crtež)"
      onAdd={() => setForma({ ...PRAZAN })}
      addLabel="+ Deo"
    >
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>
        Crtež za atributivnu kontrolu — fajl u Storage <code>atributivne/</code>, polje <code>slika_naziv</code>.
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Pretraga ID, naziv, slika…"
        style={{ ...INP, marginBottom: 10, width: "100%", maxWidth: 320 }}
      />
      {forma && (
        <FormGrid
          C={C}
          cols={3}
          forma={forma}
          setForma={setForma}
          fields={polja}
          fieldMeta={{
            slika_naziv: { type: "slika", modul: "atributivne" },
            ...(forma._postojeci ? { id_deo: { readOnly: true } } : {}),
          }}
          addToast={addToast}
          onSave={snimi}
          onCancel={() => setForma(null)}
          snima={snima}
        />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <TableHead C={C} cols={["ID", "NAZIV", "SLIKA", ""]} widths="100px 1fr 140px 56px" />
        {prikaz.map((r, i) => (
          <TableRow key={r.id_deo} C={C} i={i} widths="100px 1fr 140px 56px" cols={[
            r.id_deo,
            r.naziv_dela || "—",
            <span key="s" style={{ fontSize: 9, color: C.sivi }}>{r.slika_naziv || "—"}</span>,
            <RowActions key="a" C={C} onEdit={() => setForma({ ...r, _postojeci: true })} />,
          ]} />
        ))}
      </div>
    </CrudShell>
  );
}
