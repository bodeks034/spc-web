/** Pregled i audit šifrarnika — duplikati, status dela. */
import { supabase } from "./supabaseClient.js";

export async function fetchDuplikatiKarakteristike({ limit = 5000 } = {}) {
  const { data, error } = await supabase
    .from("karakteristike_merljive")
    .select("id, id_deo, pogon_kod, pozicija, sifra_merenja, naziv_mere")
    .limit(limit);
  if (error) throw error;

  const grupe = new Map();
  for (const r of data || []) {
    const idDeo = String(r.id_deo || "").trim().toUpperCase();
    const pogon = String(r.pogon_kod || "").trim().toUpperCase();
    const poz = String(r.pozicija || r.sifra_merenja || "").trim().toUpperCase();
    if (!idDeo || !pogon || !poz) continue;
    const kljuc = `${idDeo}|${pogon}|${poz}`;
    if (!grupe.has(kljuc)) grupe.set(kljuc, []);
    grupe.get(kljuc).push(r);
  }

  return [...grupe.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([kljuc, rows]) => {
      const [idDeo, pogon, poz] = kljuc.split("|");
      return { idDeo, pogon, pozicija: poz, broj: rows.length, ids: rows.map((x) => x.id) };
    })
    .sort((a, b) => b.broj - a.broj || a.idDeo.localeCompare(b.idDeo));
}

export async function fetchGreskeBrojeviPoDeo() {
  const { data, error } = await supabase.from("greske_katalog").select("id_deo").limit(20000);
  if (error) throw error;
  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

export async function fetchBarkodProfiliSet() {
  const { data, error } = await supabase.from("barkod_profili").select("id_deo").limit(10000);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return new Set();
    throw error;
  }
  return new Set((data || []).map((r) => String(r.id_deo || "").trim().toUpperCase()).filter(Boolean));
}

/** @returns {'kompletan'|'delimicno'|'samo_master'} */
export function statusDeoUSifrarniku(deo, { guBroj = 0, greskeBroj = 0, imaBarkod = false } = {}) {
  const id = String(deo?.id_deo || "").trim();
  if (!id) return "samo_master";
  const imaCrtez = !!String(deo?.slika_naziv || "").trim();
  const imaGu = guBroj > 0;
  const imaGreske = greskeBroj > 0;
  const atrOk = imaGreske && imaCrtez;
  const barkodOk = imaBarkod;
  if (atrOk && (imaGu || barkodOk)) return "kompletan";
  if (imaGu || imaGreske || imaCrtez) return "delimicno";
  return "samo_master";
}

/** Lista stavki koje nedostaju za kompletan šifrarnik (za tooltip). */
export function nedostajeZaDeo(deo, { guBroj = 0, greskeBroj = 0, imaBarkod = false } = {}) {
  const ned = [];
  if (!(guBroj > 0)) ned.push("Glavni unos");
  if (!(greskeBroj > 0)) ned.push("Greške");
  if (!String(deo?.slika_naziv || "").trim()) ned.push("Crtež");
  const st = statusDeoUSifrarniku(deo, { guBroj, greskeBroj, imaBarkod });
  if (st !== "kompletan" && !imaBarkod && guBroj > 0) ned.push("Barkod profil");
  return ned;
}

export function tooltipStatusDeo(deo, opts) {
  const st = statusDeoUSifrarniku(deo, opts);
  if (st === "kompletan") return "Kompletan: GU + greške + crtež + (GU ili barkod)";
  const ned = nedostajeZaDeo(deo, opts);
  if (ned.length) return `Nedostaje: ${ned.join(", ")}`;
  return STATUS_DEO_LABEL[st]?.label || st;
}

export const STATUS_DEO_LABEL = {
  kompletan: { label: "Kompletan", boja: "zelena" },
  delimicno: { label: "Delimično", boja: "narandzasta" },
  samo_master: { label: "Samo master", boja: "sivi" },
};

const DEMO_ID_RE = /^(DEMO|TEST|SAMPLE|XXX)[-_]/i;

export function jeDemoIdDeo(idDeo) {
  return DEMO_ID_RE.test(String(idDeo || "").trim());
}

async function obrisiPoIdDeo(tabela, idDeo) {
  const { error } = await supabase.from(tabela).delete().eq("id_deo", idDeo);
  if (error && !/does not exist|relation/i.test(error.message)) throw error;
}

/** Briše deo i povezane šifrarnik redove (ne merenja — operativa ostaje). */
export async function obrisiDeoIzSifrarnika(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan");

  await obrisiPoIdDeo("glavni_unos_redovi", id);
  await obrisiPoIdDeo("greske_katalog", id);
  await obrisiPoIdDeo("karakteristike_merljive", id);
  await obrisiPoIdDeo("sop_deo_varijabilni", id);
  await obrisiPoIdDeo("delovi_atributivni_pogon", id);
  await obrisiPoIdDeo("barkod_profili", id);
  await obrisiPoIdDeo("radni_nalozi", id);
  await obrisiPoIdDeo("ciljevi", id);
  const { error } = await supabase.from("delovi").delete().eq("id_deo", id);
  if (error) throw error;
  return { idDeo: id };
}

/** Bulk brisanje — samo DEMO/TEST/SAMPLE/XXX prefiks. */
export async function obrisiDemoDelove(idDeoLista) {
  const ids = [...new Set((idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  const neDemo = ids.filter((id) => !jeDemoIdDeo(id));
  if (neDemo.length) {
    throw new Error(`Dozvoljeno samo DEMO/TEST ID. Odbijeno: ${neDemo.slice(0, 5).join(", ")}`);
  }
  const rez = [];
  for (const id of ids) {
    rez.push(await obrisiDeoIzSifrarnika(id));
  }
  return { obrisano: rez.length, ids: rez.map((r) => r.idDeo) };
}
