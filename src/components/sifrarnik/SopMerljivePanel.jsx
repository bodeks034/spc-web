import { useState, useEffect, useCallback } from "react";

import { fetchSopMerljive, upsertSopMerljive, deleteSopMerljive } from "../../lib/sifrarnikApi.js";
import { propagirajMerljiviDeo } from "../../lib/glavniUnosApi.js";

import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { btnStyle } from "./sifrarnikPanelStyle.js";

import { usePogonOznake } from "./usePogonOznake.js";

import { PogonTekst } from "./SifrarnikPolje.jsx";

import SifrarnikFilterBar from "./SifrarnikFilterBar.jsx";
import { normalizujIdDeo } from "../../lib/idDeoUtil.js";



const SOP_FIELD_META = {

  pogon_kod: { type: "pogon" },

  slika: { type: "slika", modul: "merljive" },

};



const PRAZAN = {

  id_deo: "", pogon_kod: "A", radni_nalog: "", naziv_dela: "", slika: "",

  masina: "", linija: "", broj_merenja: 5, kontrolor_ime: "",

};



export default function SopMerljivePanel({ C, addToast }) {

  const { format: formatPogon, opcije } = usePogonOznake(addToast);

  const [lista, setLista] = useState([]);

  const [loading, setLoading] = useState(true);

  const [forma, setForma] = useState(null);

  const [snima, setSnima] = useState(false);

  const [idDeoDraft, setIdDeoDraft] = useState("");

  const [idDeoFilter, setIdDeoFilter] = useState("");

  const [propaguje, setPropaguje] = useState(false);



  const ucitaj = useCallback(async (idOverride) => {

    setLoading(true);

    try {

      setLista(await fetchSopMerljive({

        idDeo: idOverride !== undefined ? idOverride : (idDeoFilter || null),

      }));

    } catch (e) { addToast?.(e.message, "greska"); }

    finally { setLoading(false); }

  }, [addToast, idDeoFilter]);



  useEffect(() => { ucitaj(); }, []);



  const primeniFilter = () => {

    const id = normalizujIdDeo(idDeoDraft);

    setIdDeoFilter(id);

    ucitaj(id || null);

  };

  const propagirajIzOsnovnog = async () => {

    const id = normalizujIdDeo(idDeoFilter || idDeoDraft);

    if (!id) {

      addToast?.("Unesi ID dela pa Pretraži", "greska");

      return;

    }

    setPropaguje(true);

    try {

      const res = await propagirajMerljiviDeo(id);

      const msg = res.izKarakteristika

        ? `✓ Sinhronizovano iz dimenzija za ${id}`

        : res.izSop

          ? `✓ SOP za ${id} vec postoji`

          : `✓ Propagirano za ${id} (${res.karakteristike} dim.) iz Osnovnog`;

      addToast?.(msg, "uspeh");

      setIdDeoFilter(id);

      await ucitaj(id);

    } catch (e) { addToast?.(e.message, "greska"); }

    finally { setPropaguje(false); }

  };



  const snimi = async () => {

    setSnima(true);

    try {

      await upsertSopMerljive(forma);

      addToast?.("✓ SOP sačuvan", "uspeh");

      setForma(null);

      await ucitaj();

    } catch (e) { addToast?.(e.message, "greska"); }

    finally { setSnima(false); }

  };



  return (

    <CrudShell C={C} loading={loading} count={lista.length} tabela="sop_deo_varijabilni"

      onAdd={() => setForma({ ...PRAZAN, id_deo: idDeoFilter || idDeoDraft || "" })}

      addLabel="+ SOP deo">

      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>

        SOP zaglavlje merljivog unosa po delu i pogonu — obavezno za unos merenja.

      </div>

      <SifrarnikFilterBar

        C={C}

        idDraft={idDeoDraft}

        onIdDraftChange={setIdDeoDraft}

        onPrimeni={primeniFilter}

        loading={loading}

      />

      {idDeoFilter && !loading && lista.length === 0 && (

        <div style={{

          marginBottom: 10, padding: "8px 10px", borderRadius: 8,

          border: `1px solid ${C.border}`, background: C.hover, fontSize: 10, color: C.sivi,

        }}>

          Nema SOP zapisa za <strong style={{ color: C.bela }}>{idDeoFilter}</strong>.

          Propagiraj iz Osnovnog ili sinhronizuj iz postojećih dimenzija:

          <button

            type="button"

            onClick={propagirajIzOsnovnog}

            disabled={propaguje}

            style={{ ...btnStyle(C, C.plava, { disabled: propaguje }), marginLeft: 8, marginTop: 6 }}

          >

            {propaguje ? "…" : "Propagiraj / sinhronizuj"}

          </button>

        </div>

      )}

      {forma && (

        <FormGrid C={C} forma={forma} setForma={setForma} onCancel={() => setForma(null)} onSave={snimi} snima={snima}

          fieldMeta={SOP_FIELD_META}

          opcije={{ pogon: opcije }}

          addToast={addToast}

          fields={[

            ["ID deo *", "id_deo"], ["Pogon", "pogon_kod"], ["Radni nalog", "radni_nalog"],

            ["Naziv dela", "naziv_dela"], ["Slika", "slika"], ["Linija", "linija"],

            ["Mašina", "masina"], ["Broj merenja", "broj_merenja"], ["Kontrolor", "kontrolor_ime"],

          ]} cols={3} />

      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>

        <TableHead C={C} cols={["DELO", "POGON", "RN", "NAZIV", "BR.M", ""]} widths="90px 150px 100px 1fr 50px 56px" />

        {lista.map((r, i) => (

          <TableRow key={`${r.id_deo}-${r.pogon_kod}`} C={C} i={i} widths="90px 150px 100px 1fr 50px 56px" cols={[

            r.id_deo,

            <PogonTekst key="p" kod={r.pogon_kod} format={formatPogon} />,

            r.radni_nalog || "—",

            r.naziv_dela || "—",

            r.broj_merenja ?? "—",

            <RowActions key="a" C={C} onEdit={() => setForma({ ...r })} onDelete={async () => {

              if (!window.confirm("Obrisati SOP?")) return;

              try {

                await deleteSopMerljive(r.id_deo, r.pogon_kod);

                await ucitaj();

              } catch (e) { addToast?.(e.message, "greska"); }

            }} />,

          ]} />

        ))}

      </div>

    </CrudShell>

  );

}


