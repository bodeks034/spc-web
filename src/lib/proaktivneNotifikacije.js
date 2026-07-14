/**

 * Proaktivna obaveštenja — dorada, NCR rok, kalibracija/MSA (bez LLM).

 */



import { posaljiPraviloObavestenje } from "./autoObavestenja.js";

import { fetchKpiUnos } from "./kpiUnos.js";

import { createDedupeStore } from "./autoDedupe.js";

import { daniDoStudije } from "./msaKalendar.js";
import { ucitajVaziDoLicence } from "./licenca.js";



const DEDUPE_MS = 4 * 60 * 60 * 1000;

const defaultDedupe = createDedupeStore({ tip: "session", ms: DEDUPE_MS });



function danasIso() {

  return new Date().toISOString().slice(0, 10);

}



function sutraIso() {

  const d = new Date();

  d.setDate(d.getDate() + 1);

  return d.toISOString().slice(0, 10);

}



async function ucitajKalMsaDogadjaje(supabase) {

  const dogadjaji = [];

  try {

    const { data: mer } = await supabase.from("merila")

      .select("naziv,kalibracije(sledeca_kal,datum_kal)")

      .eq("aktivno", true);

    const danas = new Date();

    for (const m of mer || []) {

      const kal = (m.kalibracije || []).sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];

      if (!kal?.sledeca_kal) continue;

      const istekla = new Date(kal.sledeca_kal) < danas;

      if (istekla) {

        dogadjaji.push({

          id: `kal_istekla_${m.naziv}`,

          naslov: `Kalibracija istekla — ${m.naziv}`,

          opis: `Sledeća kalibracija bila ${kal.sledeca_kal}. Zakazati kalibraciju pre merenja.`,

          nivo: "visok",

        });

      }

    }

  } catch { /* */ }



  try {

    const { data: msa } = await supabase.from("msa_kalendar")

      .select("sledeca_studija,merilo:merila(naziv)")

      .order("sledeca_studija", { ascending: true });

    for (const r of msa || []) {

      const d = daniDoStudije(r.sledeca_studija);

      if (d === null) continue;

      const naziv = r.merilo?.naziv || "?";

      if (d < 0) {

        dogadjaji.push({

          id: `msa_kasni_${naziv}`,

          naslov: `MSA kasni — ${naziv}`,

          opis: `Studija trebala ${r.sledeca_studija} (${Math.abs(d)} dana kasni).`,

          nivo: "srednji",

        });

      } else if (d <= 7) {

        dogadjaji.push({

          id: `msa_uskoro_${naziv}_${r.sledeca_studija}`,

          naslov: `MSA uskoro — ${naziv}`,

          opis: `Studija za ${d} dana (${r.sledeca_studija}).`,

          nivo: "info",

        });

      }

    }

  } catch { /* */ }



  return dogadjaji;

}



export async function proveriProaktivneDogadjaje(supabase, {

  modul = "merljive",

  smena,

  alarmi = [],

} = {}) {

  const dogadjaji = [];

  const iso = danasIso();

  const sutra = sutraIso();



  for (const a of alarmi) {

    if (a.nivo === "kriticno" || a.nivo === "visok") {

      dogadjaji.push({

        id: `alarm_${a.id}`,

        naslov: a.naslov || "Operativni alarm",

        opis: a.opis || "",

        nivo: a.nivo,

      });

    }

  }



  const { data: ncrRok } = await supabase

    .from("ncr_capa")

    .select("id,broj_ncr,id_deo,rok,prioritet")

    .in("status", ["otvoren", "analiza", "akcija", "verifikacija"])

    .not("rok", "is", null)

    .lt("rok", iso)

    .limit(10);



  for (const n of ncrRok || []) {

    dogadjaji.push({

      id: `ncr_rok_${n.id}`,

      naslov: `NCR rok prošao — ${n.broj_ncr}`,

      opis: `Deo ${n.id_deo} · rok ${n.rok} · prioritet ${n.prioritet}`,

      nivo: n.prioritet === "kriticno" ? "kriticno" : "visok",

    });

  }



  const { data: ncrSutra } = await supabase

    .from("ncr_capa")

    .select("id,broj_ncr,id_deo,rok,prioritet")

    .in("status", ["otvoren", "analiza", "akcija", "verifikacija"])

    .eq("rok", sutra)

    .limit(10);



  for (const n of ncrSutra || []) {

    dogadjaji.push({

      id: `ncr_rok_sutra_${n.id}`,

      naslov: `NCR rok sutra — ${n.broj_ncr}`,

      opis: `Deo ${n.id_deo} · rok ${n.rok} · prioritet ${n.prioritet}`,

      nivo: n.prioritet === "kriticno" ? "visok" : "srednji",

    });

  }



  const kpiRows = await fetchKpiUnos(supabase, {

    modul,

    datum: iso,

    smena: smena || undefined,

    limit: 80,

  });



  const cutoff = Date.now() - 2 * 60 * 60 * 1000;

  for (const r of kpiRows) {

    const neus = Number(r.neusaglaseno) || 0;

    const dor = Number(r.dorada) || 0;

    const created = new Date(r.created_at || 0).getTime();

    if (neus > 0 && dor === 0 && created < cutoff) {

      dogadjaji.push({

        id: `kpi_dorada_${r.id}`,

        naslov: `Nema dorade — ${r.id_deo}`,

        opis: `RN ${r.radni_nalog || "—"} · smena ${r.smena} · ${neus} neusaglašenih bez unosa dorade (2h+)`,

        nivo: "srednji",

      });

    }

  }



  const kalMsa = await ucitajKalMsaDogadjaje(supabase);

  dogadjaji.push(...kalMsa);

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: ncrBez8d } = await supabase
    .from("ncr_capa")
    .select("id,broj_ncr,id_deo,status,created_at")
    .in("status", ["otvoren", "analiza"])
    .is("osmd_id", null)
    .lt("created_at", cutoff24h)
    .limit(10);

  for (const n of ncrBez8d || []) {
    dogadjaji.push({
      id: `ncr_bez_8d_${n.id}`,
      naslov: `NCR bez 8D — ${n.broj_ncr}`,
      opis: `Deo ${n.id_deo} · status ${n.status} · otvoren 24h+ bez pokrenute 8D analize`,
      nivo: n.status === "analiza" ? "srednji" : "visok",
    });
  }

  const licDo = await ucitajVaziDoLicence(supabase);
  dogadjaji.push(...licencaDogadjajiIzDatuma(licDo));

  return dogadjaji;

}

export function licencaDogadjajiIzDatuma(vaziDo) {
  if (!vaziDo) return [];
  const dana = Math.ceil((new Date(vaziDo) - new Date()) / 86400000);
  if (dana <= 0) {
    return [{
      id: "licenca_istekla",
      naslov: "Licenca istekla",
      opis: `Važila do ${vaziDo} — kontaktirajte podršku`,
      nivo: "kriticno",
    }];
  }
  if (dana <= 30) {
    return [{
      id: `licenca_uskoro_${vaziDo}`,
      naslov: `Licenca ističe za ${dana} dana`,
      opis: `Važi do ${vaziDo}`,
      nivo: dana <= 7 ? "visok" : "srednji",
    }];
  }
  return [];
}

export async function proaktivniLicencaDogadjaji({ envDo, vaziDo, supabase } = {}) {
  let doDat = vaziDo || envDo || null;
  if (!doDat && supabase) {
    doDat = await ucitajVaziDoLicence(supabase);
  }
  return licencaDogadjajiIzDatuma(doDat);
}

/** Kreira 8D draft za NCR otvoren 24h+ bez osmd_id. */
export async function obradiNcr8dDrafte(supabase) {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: lista } = await supabase
    .from("ncr_capa")
    .select("*")
    .in("status", ["otvoren", "analiza"])
    .is("osmd_id", null)
    .lt("created_at", cutoff24h)
    .limit(10);

  const { kreirajOsmdDraftIzNcr } = await import("./ncrCapa.js");
  const kreirano = [];
  for (const n of lista || []) {
    try {
      const dr = await kreirajOsmdDraftIzNcr(supabase, n);
      if (dr) kreirano.push(dr);
    } catch { /* */ }
  }
  return kreirano;
}

export async function obradiProaktivneNotifikacije(supabase, settings, dogadjaji = [], {

  dedupe = defaultDedupe,

} = {}) {

  const poslato = [];

  for (const d of dogadjaji) {

    const skip = typeof dedupe.vecPoslato === "function"

      ? await Promise.resolve(dedupe.vecPoslato(d.id))

      : false;

    if (skip) continue;

    const rez = await posaljiPraviloObavestenje(supabase, settings, {
      id: d.id,
      naslov: d.naslov,
      opis: d.opis,
      nivo: d.nivo || "info",
    }, { dedupe, auto: true });

    if ((d.nivo === "kriticno" || d.nivo === "visok") && !rez?.preskoceno) {
      const { posaljiBrowserObavestenje } = await import("./notifikacije.js");
      posaljiBrowserObavestenje(settings, {
        naslov: d.naslov,
        opis: d.opis,
        tag: d.id,
      });
    }

    if (!rez?.preskoceno) {

      if (typeof dedupe.oznaci === "function") dedupe.oznaci(d.id);

    }

    poslato.push({ ...d, rez });

  }

  return poslato;

}


