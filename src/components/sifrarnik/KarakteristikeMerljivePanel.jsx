import { useState, useEffect, useCallback } from "react";
import {
  fetchKarakteristikeMerljive, upsertKarakteristikaMerljiva, deleteKarakteristikaMerljiva,
} from "../../lib/sifrarnikApi.js";
import { propagirajMerljiviDeo } from "../../lib/glavniUnosApi.js";
import { CrudShell, FormGrid, TableHead, TableRow, RowActions } from "./LinijePanel.jsx";
import { btnStyle } from "./sifrarnikPanelStyle.js";
import { useSifrarnikOpcije } from "./useSifrarnikOpcije.js";
import { usePogonOznake } from "./usePogonOznake.js";
import { PogonTekst } from "./SifrarnikPolje.jsx";
import SifrarnikFilterBar from "./SifrarnikFilterBar.jsx";
import { formatGraniceRedZaFormu, granicaZaPrikaz } from "../../lib/glavniUnosGranice.js";
import { normalizujIdDeo } from "../../lib/idDeoUtil.js";

const KAR_FIELD_META = {
  pogon_kod: { type: "pogon" },
  pozicija: { type: "select", opcijeKey: "karakteristika" },
  klasa: { type: "select", opcijeKey: "klasa" },
  jedinica: { type: "select", opcijeKey: "jedinica" },
  nominala: { type: "granica" },
  lsl: { type: "granica" },
  usl: { type: "granica" },
  merni_instrument: { type: "select", opcijeKey: "instrument" },
  napomena: { type: "text" },
  slika: { type: "slika", modul: "merljive" },
};

const PRAZAN = {
  id_deo: "", pogon_kod: "A", pozicija: "", sifra_merenja: "", naziv_mere: "",
  nominala: "", lsl: "", usl: "", jedinica: "mm", merni_instrument: "",
  kom_za_kontrolu_n: "", broj_merenja: "", fai_broj_merenja: "", nivo_kontrole: "",
  klasa: "", radni_nalog: "", napomena: "", slika: "",
};

export default function KarakteristikeMerljivePanel({ C, addToast }) {
  const { opcije } = useSifrarnikOpcije(addToast);
  const { format: formatPogon, opcije: pogonOpcije } = usePogonOznake(addToast);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);
  const [snima, setSnima] = useState(false);
  const [idDeoDraft, setIdDeoDraft] = useState("");
  const [idDeoFilter, setIdDeoFilter] = useState("");
  const [pogonFilter, setPogonFilter] = useState("");
  const [filter, setFilter] = useState("");
  const [propaguje, setPropaguje] = useState(false);

  const ucitaj = useCallback(async (idDeo = null, pogonKod = null) => {
    setLoading(true);
    try {
      setLista(await fetchKarakteristikeMerljive({ idDeo, pogonKod }));
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const primeniFilter = () => {
    const id = normalizujIdDeo(idDeoDraft);
    setIdDeoFilter(id);
    ucitaj(id || null, pogonFilter || null);
  };

  const onPogonFilterChange = (v) => {
    setPogonFilter(v);
    ucitaj(idDeoFilter || normalizujIdDeo(idDeoDraft) || null, v || null);
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
        ? `✓ Sinhronizovano iz dimenzija za ${id} (SOP/RN/delovi)`
        : res.izSop
          ? `✓ SOP za ${id} vec postoji — osvezi prikaz`
          : `✓ Propagirano ${res.karakteristike} dimenzija za ${id} iz Osnovnog`;
      addToast?.(msg, "uspeh");
      setIdDeoFilter(id);
      await ucitaj(id, pogonFilter || null);
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setPropaguje(false); }
  };

  const snimi = async () => {
    setSnima(true);
    try {
      await upsertKarakteristikaMerljiva(forma);
      addToast?.("✓ Dimenzija sačuvana (SOP/RN sinhronizovani)", "uspeh");
      setForma(null);
      await ucitaj(idDeoFilter || null, pogonFilter || null);
    } catch (e) { addToast?.(e.message, "greska"); }
    finally { setSnima(false); }
  };

  const prikaz = lista.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [r.pozicija, r.naziv_mere, r.sifra_merenja, r.id_deo].some(
      (s) => String(s || "").toLowerCase().includes(q),
    );
  });

  const polja = [
    ["ID deo *", "id_deo"], ["Pogon", "pogon_kod"], ["Pozicija *", "pozicija"], ["Šifra merenja", "sifra_merenja"],
    ["Naziv mere", "naziv_mere"], ["Nominala", "nominala"], ["LSL", "lsl"], ["USL", "usl"],
    ["Jedinica", "jedinica"], ["Instrument", "merni_instrument"], ["Kom kontrola n", "kom_za_kontrolu_n"],
    ["Broj merenja", "broj_merenja"], ["FAI broj", "fai_broj_merenja"], ["Nivo kontrole", "nivo_kontrole"],
    ["Klasa", "klasa"], ["Radni nalog", "radni_nalog"], ["Napomena", "napomena"],
    ["Crtež / slika", "slika"],
  ];

  return (
    <CrudShell C={C} loading={loading} count={prikaz.length} tabela="karakteristike_merljive"
      onAdd={() => setForma({ ...PRAZAN, id_deo: idDeoFilter || idDeoDraft || "", pogon_kod: pogonFilter || "A" })}
      addLabel="+ Dimenzija">
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 8 }}>
        Glavni izvor za merljive — LSL/USL, FAI, broj merenja. Za stepene: DMS unos (npr. 444444).
      </div>
      <SifrarnikFilterBar
        C={C}
        idDraft={idDeoDraft}
        onIdDraftChange={setIdDeoDraft}
        onPrimeni={primeniFilter}
        loading={loading}
        showPogon
        pogonFilter={pogonFilter}
        onPogonChange={onPogonFilterChange}
        pogonOpcije={pogonOpcije}
        showText
        textFilter={filter}
        onTextFilterChange={setFilter}
        textPlaceholder="Pretraga pozicija…"
      />
      {idDeoFilter && !loading && lista.length === 0 && (
        <div style={{
          marginBottom: 10, padding: "8px 10px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.hover, fontSize: 10, color: C.sivi,
        }}>
          Nema dimenzija za <strong style={{ color: C.bela }}>{idDeoFilter}</strong> u bazi.
          Ako je deo u Osnovnom unosu (sačuvan), propagiraj ga; ako su dimenzije već unete ručno, sinhronizuj SOP:
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
      {forma && opcije && (
        <FormGrid
          C={C}
          cols={4}
          forma={forma}
          setForma={setForma}
          fields={polja}
          fieldMeta={KAR_FIELD_META}
          opcije={{ ...opcije, pogon: pogonOpcije }}
          addToast={addToast}
          onSave={snimi}
          onCancel={() => setForma(null)}
          snima={snima}
        />
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
        <TableHead C={C}
          cols={["DELO", "POGON", "POZ", "NOM", "LSL", "USL", "INST", ""]}
          widths="80px 150px 1fr 70px 60px 60px 80px 56px" />
        {prikaz.map((r, i) => (
          <TableRow key={r.id} C={C} i={i} widths="80px 150px 1fr 70px 60px 60px 80px 56px" cols={[
            r.id_deo,
            <PogonTekst key="p" kod={r.pogon_kod} format={formatPogon} />,
            r.pozicija,
            granicaZaPrikaz(r.nominala, r.jedinica) || "—",
            granicaZaPrikaz(r.lsl, r.jedinica) || "—",
            granicaZaPrikaz(r.usl, r.jedinica) || "—",
            <span key="i" style={{ fontSize: 9, color: C.sivi }}>{r.merni_instrument || "—"}</span>,
            <RowActions key="a" C={C} onEdit={() => setForma(formatGraniceRedZaFormu(r))} onDelete={async () => {
              if (!window.confirm("Obrisati dimenziju?")) return;
              try {
                await deleteKarakteristikaMerljiva(r.id);
                await ucitaj(idDeoFilter || null, pogonFilter || null);
              } catch (e) { addToast?.(e.message, "greska"); }
            }} />,
          ]} />
        ))}
      </div>
    </CrudShell>
  );
}
