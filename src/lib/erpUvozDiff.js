/** Parsiranje ERP uvoz detalja za admin pregled — šta je novo/izmenjeno. */



const PREFIXI = [

  { pref: "✓", tip: "uspeh" },

  { pref: "✗", tip: "greska" },

  { pref: "—", tip: "preskoceno" },

  { pref: "○", tip: "iskljuceno" },

  { pref: "⏳", tip: "ceka" },

  { pref: "⚠", tip: "upozorenje" },

];



function tipIzPrefiksa(linija) {

  for (const { pref, tip } of PREFIXI) {

    if (linija.startsWith(pref)) return tip;

  }

  return null;

}



function izvuciUpsertBroj(opis) {

  const m = String(opis || "").match(/upsert\s+(\d+)/i);

  return m ? Number(m[1]) : 0;

}



function izvuciFajl(opis) {

  const m = String(opis || "").match(/^([^—]+?)\s*—/);

  if (m) return m[1].trim();

  const pre = String(opis || "").split("—")[0]?.trim();

  return pre || "";

}



export function parsirajErpUvozDetalj(detalj = "") {

  if (!detalj) return [];

  return String(detalj)

    .split(/\r?\n/)

    .map((l) => l.trim())

    .filter((l) => tipIzPrefiksa(l))

    .map((linija) => {

      const tip = tipIzPrefiksa(linija);

      const uspeh = tip === "uspeh";

      const greska = tip === "greska";

      const preskoceno = tip === "preskoceno" || tip === "iskljuceno";

      const ceka = tip === "ceka";

      const upozorenje = tip === "upozorenje";

      const cist = linija.replace(/^[✓✗—○⏳⚠]\s*/, "");

      const [entitet, ...rest] = cist.split(":");

      const opis = rest.join(":").trim();

      const upsertovano = izvuciUpsertBroj(opis);

      return {

        linija,

        tip,

        uspeh,

        greska,

        preskoceno,

        ceka,

        upozorenje,

        entitet: (entitet || "").trim(),

        opis,

        fajl: izvuciFajl(opis),

        upsertovano,

        promenjeno: uspeh && upsertovano > 0,

      };

    });

}



export function sumirajErpUvozLog(log) {

  if (!log) return null;

  const stavke = parsirajErpUvozDetalj(log.detalj);

  const promene = stavke.filter((s) => s.promenjeno);

  return {

    ...log,

    stavke,

    promene,

    uspesnih: stavke.filter((s) => s.uspeh).length,

    gresaka: stavke.filter((s) => s.greska).length,

    preskocenih: stavke.filter((s) => s.preskoceno).length,

    ukupnoUpsert: promene.reduce((a, s) => a + (s.upsertovano || 0), 0),

  };

}



/** Ljudski sažetak za inženjera — bez čitanja log fajla. */

export function sastaviErpDiffSažetak(trenutni, prethodni = null) {

  if (!trenutni) return { naslov: "Nema uvoza", redovi: [], promene: [] };

  const promene = trenutni.promene || [];

  const redovi = [];



  if (promene.length) {

    redovi.push(`Upsert-ovano ${trenutni.ukupnoUpsert || 0} redova u ${promene.length} entiteta:`);

    for (const p of promene) {

      redovi.push(`· ${p.entitet}: ${p.upsertovano} (${p.fajl || "CSV"})`);

    }

  } else if (trenutni.uspeh) {

    redovi.push("Uvoz OK — nema novih upsert redova (fajlovi nepromenjeni ili prazni).");

  }



  const greske = (trenutni.stavke || []).filter((s) => s.greska || s.upozorenje);

  for (const g of greske) {

    redovi.push(`⚠ ${g.entitet}: ${g.opis}`);

  }



  if (prethodni?.created_at) {

    const delta = (trenutni.ukupnoUpsert || 0) - (prethodni.ukupnoUpsert || 0);

    if (delta !== 0) {

      redovi.push(`U odnosu na prethodni uvoz: ${delta > 0 ? "+" : ""}${delta} upsert redova.`);

    }

  }



  return {

    naslov: promene.length

      ? `Danas izmenjeno: ${promene.map((p) => p.entitet).join(", ")}`

      : (trenutni.uspeh ? "Uvoz bez novih promena" : "Uvoz sa greškama"),

    redovi,

    promene,

  };

}



export function danasIso() {

  return new Date().toISOString().split("T")[0];

}



export function logJeDanas(log) {

  if (!log?.created_at) return false;

  return String(log.created_at).startsWith(danasIso());

}



export function formatirajErpLogKratko(log) {

  if (!log) return "—";

  const v = log.created_at ? new Date(log.created_at) : null;

  const datum = v ? v.toLocaleString("sr-RS", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";

  const status = log.uspeh ? "OK" : "FAIL";

  return `${datum} · ${status} · upsert ${log.upsertovano ?? 0}`;

}


