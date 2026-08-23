/** Preview šta propagacija menja pre objave. */
import { supabase } from "./supabaseClient.js";
import {
  fetchGlavniUnosRedoviZaDeo,
  fetchGlavniUnosRedovi,
  fetchPogonLinijaMapa,
} from "./glavniUnosApi.js";
import { buildLookupsFromPogonRows, karakteristikeIzGlavniUnosRedova } from "./glavniUnosCore.js";
import { normalizujIdDeo } from "./idDeoUtil.js";

function kljucKar(r) {
  return `${String(r.id_deo).toUpperCase()}|${r.pogon_kod}|${r.pozicija || r.sifra_merenja || ""}`;
}

export async function previewPropagacije({ sheetNaziv = null, idDeo = null } = {}) {
  const pogonRows = await fetchPogonLinijaMapa();
  const lookups = buildLookupsFromPogonRows(pogonRows);

  let dbRedovi;
  if (idDeo) {
    dbRedovi = await fetchGlavniUnosRedoviZaDeo(normalizujIdDeo(idDeo));
  } else if (sheetNaziv) {
    dbRedovi = await fetchGlavniUnosRedovi(sheetNaziv);
  } else {
    return { novih: 0, izmenjenih: 0, ukupno: 0, delovi: [], poruka: "Navedi sheet ili ID dela" };
  }

  const izGlavnog = karakteristikeIzGlavniUnosRedova(dbRedovi || [], lookups);
  const touchedDeos = [...new Set(izGlavnog.map((r) => String(r.id_deo).toUpperCase()))];

  if (!touchedDeos.length) {
    return { novih: 0, izmenjenih: 0, ukupno: 0, delovi: [], poruka: "Nema mapiranih dimenzija" };
  }

  const { data: postojeci, error } = await supabase
    .from("karakteristike_merljive")
    .select("id,id_deo,pogon_kod,pozicija,sifra_merenja,nominala,lsl,usl")
    .in("id_deo", touchedDeos);
  if (error) throw error;

  const postojeMap = new Map((postojeci || []).map((r) => [kljucKar(r), r]));
  let novih = 0;
  let izmenjenih = 0;

  for (const r of izGlavnog) {
    const k = kljucKar(r);
    const stari = postojeMap.get(k);
    if (!stari) {
      novih += 1;
      continue;
    }
    const polja = ["nominala", "lsl", "usl", "naziv_mere"];
    if (polja.some((p) => String(stari[p] ?? "") !== String(r[p] ?? ""))) {
      izmenjenih += 1;
    }
  }

  return {
    novih,
    izmenjenih,
    ukupno: izGlavnog.length,
    delovi: touchedDeos,
    poruka: `${novih} novih, ${izmenjenih} izmenjenih dimenzija (ukupno ${izGlavnog.length} iz GU)`,
  };
}

/** Agregirani preview za više delova (batch objava). */
export async function previewBatchPropagacije(ids = [], { paralelno = 5 } = {}) {
  const uniq = [...new Set((ids || []).map((id) => String(id).trim().toUpperCase()).filter(Boolean))];
  if (!uniq.length) {
    return { novih: 0, izmenjenih: 0, ukupno: 0, delovi: 0, poruka: "Nema delova za preview" };
  }
  let novih = 0;
  let izmenjenih = 0;
  let ukupno = 0;
  const chunkSize = Math.max(1, paralelno);
  for (let i = 0; i < uniq.length; i += chunkSize) {
    const chunk = uniq.slice(i, i + chunkSize);
    const rezultati = await Promise.all(chunk.map((id) => previewPropagacije({ idDeo: id })));
    for (const p of rezultati) {
      novih += p.novih || 0;
      izmenjenih += p.izmenjenih || 0;
      ukupno += p.ukupno || 0;
    }
  }
  return {
    novih,
    izmenjenih,
    ukupno,
    delovi: uniq.length,
    poruka: `${novih} novih, ${izmenjenih} izmenjenih dimenzija (${uniq.length} delova, ${ukupno} redova GU)`,
  };
}
