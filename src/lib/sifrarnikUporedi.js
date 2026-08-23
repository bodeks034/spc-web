/** Upoređivanje dva dela u šifrarniku. */
import { supabase } from "./supabaseClient.js";
import { fetchGlavniUnosBrojZaDeo } from "./glavniUnosApi.js";
import { fetchGreskeBrojZaDeo, fetchImaBarkodZaDeo, statusDeoUSifrarniku } from "./sifrarnikOdrzavanje.js";
import { normalizujIdDeo } from "./idDeoUtil.js";

async function ucitajDeo(id) {
  const { data, error } = await supabase
    .from("delovi")
    .select("*")
    .eq("id_deo", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ucitajDimenzije(id) {
  const { data, error } = await supabase
    .from("karakteristike_merljive")
    .select("pogon_kod,pozicija,nominala,lsl,usl,jedinica,naziv_mere")
    .eq("id_deo", id)
    .order("pogon_kod")
    .order("pozicija")
    .limit(500);
  if (error) throw error;
  return data || [];
}

async function ucitajGreske(id) {
  const { data, error } = await supabase
    .from("greske_katalog")
    .select("kategorija,defekt,opis,pogon_kod")
    .eq("id_deo", id)
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function uporediDelovi(idA, idB) {
  const a = normalizujIdDeo(idA);
  const b = normalizujIdDeo(idB);
  if (!a || !b) throw new Error("Unesi oba ID dela");

  const [deoA, deoB, guA, guB, grA, grB, bkA, bkB, dimA, dimB, gresA, gresB] = await Promise.all([
    ucitajDeo(a),
    ucitajDeo(b),
    fetchGlavniUnosBrojZaDeo(a),
    fetchGlavniUnosBrojZaDeo(b),
    fetchGreskeBrojZaDeo(a),
    fetchGreskeBrojZaDeo(b),
    fetchImaBarkodZaDeo(a),
    fetchImaBarkodZaDeo(b),
    ucitajDimenzije(a),
    ucitajDimenzije(b),
    ucitajGreske(a),
    ucitajGreske(b),
  ]);

  const optsA = { guBroj: guA, greskeBroj: grA, imaBarkod: bkA };
  const optsB = { guBroj: guB, greskeBroj: grB, imaBarkod: bkB };

  const kljuceviA = new Set(dimA.map((r) => `${r.pogon_kod}|${r.pozicija}`));
  const kljuceviB = new Set(dimB.map((r) => `${r.pogon_kod}|${r.pozicija}`));
  const samoA = dimA.filter((r) => !kljuceviB.has(`${r.pogon_kod}|${r.pozicija}`));
  const samoB = dimB.filter((r) => !kljuceviA.has(`${r.pogon_kod}|${r.pozicija}`));

  return {
    a: { deo: deoA, opts: optsA, status: deoA ? statusDeoUSifrarniku(deoA, optsA) : null, dimenzije: dimA, greske: gresA },
    b: { deo: deoB, opts: optsB, status: deoB ? statusDeoUSifrarniku(deoB, optsB) : null, dimenzije: dimB, greske: gresB },
    razlike: { samoA, samoB, brojDimA: dimA.length, brojDimB: dimB.length, brojGresA: gresA.length, brojGresB: gresB.length },
  };
}
