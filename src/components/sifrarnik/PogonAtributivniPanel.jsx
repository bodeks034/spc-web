import { useState, useEffect, useCallback } from "react";

import { fetchPogonAtributivni, upsertPogonAtributivni, deletePogonAtributivni } from "../../lib/sifrarnikApi.js";

import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";

import { inpStyle } from "./sifrarnikPanelStyle.js";

import { useSifrarnikOpcije } from "./useSifrarnikOpcije.js";

import { usePogonOznake } from "./usePogonOznake.js";

import { PogonTekst } from "./SifrarnikPolje.jsx";



const POGON_FIELD_META = {
  pogon_kod: { type: "pogon" },
  karakteristika: { type: "select", opcijeKey: "karakteristika" },
};



const PRAZAN = {

  id_deo: "", pogon_kod: "", radni_nalog: "", naziv_dela: "", karakteristika: "",

  kom_za_kontrolu: 30, aktivan: true, napomena: "",

};



export default function PogonAtributivniPanel({ C, addToast }) {

  const { opcije: sifrarnikOpcije } = useSifrarnikOpcije(addToast);

  const { format: formatPogon, opcije: pogonOpcije } = usePogonOznake(addToast);

  const opcije = sifrarnikOpcije ? { ...sifrarnikOpcije, pogon: pogonOpcije } : null;

  const [lista, setLista] = useState([]);

  const [loading, setLoading] = useState(true);

  const [forma, setForma] = useState(null);

  const [snima, setSnima] = useState(false);

  const [idDeoFilter, setIdDeoFilter] = useState("");



  const ucitaj = useCallback(async () => {

    setLoading(true);

    try {

      setLista(await fetchPogonAtributivni({ idDeo: idDeoFilter || null }));

    } catch (e) { addToast?.(e.message, "greska"); }

    finally { setLoading(false); }

  }, [addToast, idDeoFilter]);



  useEffect(() => { ucitaj(); }, [ucitaj]);



  const snimi = async () => {

    setSnima(true);

    try {

      await upsertPogonAtributivni(forma);

      addToast?.("✓ Pogon sačuvan", "uspeh");

      setForma(null);

      await ucitaj();

    } catch (e) { addToast?.(e.message, "greska"); }

    finally { setSnima(false); }

  };



  return (

    <CrudShell C={C} loading={loading} count={lista.length} tabela="delovi_atributivni_pogon"

      onAdd={() => setForma({ ...PRAZAN })} addLabel="+ Pogon">

      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>

        Više pogona po istom ID delu — atributivna vizuelna kontrola.

      </div>

      <input value={idDeoFilter} onChange={(e) => setIdDeoFilter(e.target.value.toUpperCase())}

        placeholder="Filter ID dela…" style={{ ...inpStyle(C), marginBottom: 10, width: 140 }} />

      {forma && opcije && (

        <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}

          fields={[

            ["ID deo *", "id_deo"], ["Pogon *", "pogon_kod"], ["Radni nalog", "radni_nalog"],

            ["Naziv dela", "naziv_dela"], ["Karakteristika", "karakteristika"], ["Kom za kontrolu", "kom_za_kontrolu"],

          ]}

          fieldMeta={POGON_FIELD_META}

          opcije={opcije}

          addToast={addToast}

          cols={3} />

      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>

        <TableHead C={C} cols={["DELO", "POGON", "RN", "NAZIV", "KOM", ""]} widths="90px 150px 100px 1fr 50px 56px" />

        {lista.map((r, i) => (

          <TableRow key={`${r.id_deo}-${r.pogon_kod}`} C={C} i={i} widths="90px 150px 100px 1fr 50px 56px" cols={[

            r.id_deo,

            <PogonTekst key="p" kod={r.pogon_kod} format={formatPogon} />,

            r.radni_nalog || "—",

            r.naziv_dela || "—",

            r.kom_za_kontrolu ?? "—",

            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {

              if (!window.confirm("Obrisati pogon?")) return;

              try {

                await deletePogonAtributivni(r.id_deo, r.pogon_kod);

                await ucitaj();

              } catch (e) { addToast?.(e.message, "greska"); }

            }} />,

          ]} />

        ))}

      </div>

    </CrudShell>

  );

}


