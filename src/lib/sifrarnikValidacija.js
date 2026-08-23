/** Validacioni izveštaj šifrarnika — CSV pre objave / go-live. */
import { supabase } from "./supabaseClient.js";
import {
  fetchAktivniDeloviSaStatusom,
  fetchDuplikatiKarakteristike,
  fetchBarkodProfiliSet,
  jeSpremanZaBatchObjavu,
} from "./sifrarnikOdrzavanje.js";

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function fetchRnZastareli() {
  const danas = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("radni_nalozi")
    .select("id_deo,broj_rn,datum_do,aktivan")
    .eq("aktivan", true)
    .lt("datum_do", danas)
    .limit(100);
  if (error && !/does not exist/i.test(error.message)) throw error;
  return data || [];
}

async function fetchMerilaKalibracijaIstek() {
  const danas = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("merila")
    .select("id,naziv,kalibracije(sledeca_kal)")
    .limit(200);
  if (error && !/does not exist/i.test(error.message)) throw error;
  const istekla = [];
  for (const m of data || []) {
    const kal = [...(m.kalibracije || [])].sort(
      (a, b) => new Date(b.sledeca_kal || 0) - new Date(a.sledeca_kal || 0),
    )[0];
    if (kal?.sledeca_kal && kal.sledeca_kal < danas) {
      istekla.push({ naziv: m.naziv, sledeca_kal: kal.sledeca_kal });
    }
  }
  return istekla;
}

export async function generisiValidacioniIzvestaj() {
  const stavke = [];
  const [{ stavke: deloviStavke }, dups, bk, rnZastareli, kalIstek] = await Promise.all([
    fetchAktivniDeloviSaStatusom(),
    fetchDuplikatiKarakteristike({ limit: 100 }),
    fetchBarkodProfiliSet(),
    fetchRnZastareli(),
    fetchMerilaKalibracijaIstek(),
  ]);

  for (const { deo, status, opts, nedostaje } of deloviStavke) {
    if (status === "kompletan") continue;
    stavke.push({
      tip: "delimicno",
      id_deo: deo.id_deo,
      status,
      problem: (nedostaje || []).join("; "),
    });
    if (!deo.slika_naziv?.trim()) {
      stavke.push({ tip: "nema_crtez", id_deo: deo.id_deo, status, problem: "Nema crteža" });
    }
    if (jeSpremanZaBatchObjavu(deo, opts) && status !== "kompletan") {
      stavke.push({ tip: "spreman_za_objavu", id_deo: deo.id_deo, status, problem: "Spreman za batch objavu" });
    }
    const id = String(deo.id_deo || "").trim().toUpperCase();
    if ((opts.guBroj > 0 || status === "kompletan") && !bk.has(id)) {
      stavke.push({ tip: "nema_barkod", id_deo: deo.id_deo, status, problem: "Nema barkod profila" });
    }
  }

  for (const d of dups.slice(0, 50)) {
    stavke.push({
      tip: "duplikat",
      id_deo: d.idDeo,
      status: "",
      problem: `Dupli ${d.pogon}/${d.pozicija} (${d.broj}×)`,
    });
  }

  for (const rn of rnZastareli) {
    stavke.push({
      tip: "rn_zastareo",
      id_deo: rn.id_deo || "",
      status: "aktivan",
      problem: `RN ${rn.broj_rn || "?"} istekao ${rn.datum_do || ""}`,
    });
  }

  for (const m of kalIstek) {
    stavke.push({
      tip: "kalibracija_istekla",
      id_deo: "",
      status: "",
      problem: `Merilo ${m.naziv} — kalibracija ${m.sledeca_kal}`,
    });
  }

  return stavke;
}

export function validacioniIzvestajUCsv(stavke) {
  const header = ["tip", "id_deo", "status", "problem"].join(",");
  const redovi = (stavke || []).map((s) => [
    csvEscape(s.tip),
    csvEscape(s.id_deo),
    csvEscape(s.status),
    csvEscape(s.problem),
  ].join(","));
  return `\uFEFF${[header, ...redovi].join("\n")}`;
}

export function preuzmiValidacioniCsv(stavke) {
  const csv = validacioniIzvestajUCsv(stavke);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sifrarnik_validacija_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
