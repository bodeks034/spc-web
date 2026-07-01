/**
 * Reakcioni plan za SPC analitiku — situacija → akcija.
 * Čuva se u localStorage (šifrarnik liste ostaje za stare dropdown vrednosti).
 */

const STORAGE_KEY = "spc_reakcioni_plan_v1";

export const PODRAZUMEVANI_REAKCIONI_PLAN_SPC = [
  {
    id: "van_lsl_usl",
    kategorija: "granice",
    situacija: "Merenje van LSL/USL",
    akcija: "Zaustaviti proizvodnju",
  },
  {
    id: "rupa_pozicija",
    kategorija: "dimenzija",
    situacija: "Rupa van pozicije tolerancije",
    akcija: "Odbaciti deo",
  },
  {
    id: "ravnost",
    kategorija: "dimenzija",
    situacija: "Ravnost > 0,2 mm",
    akcija: "Ispravka ili škart",
  },
  {
    id: "spc_upozorenje_2",
    kategorija: "spc",
    situacija: "2 uzastopna dela van SPC upozorenja",
    akcija: "Podešavanje alata",
  },
  {
    id: "cpk_133",
    kategorija: "kapabilitet",
    situacija: "Cpk < 1,33",
    akcija: "PFMEA analiza",
  },
  {
    id: "cpk_100",
    kategorija: "kapabilitet",
    situacija: "Cpk < 1,00",
    akcija: "100% kontrola serije",
  },
  {
    id: "van_ucl_lcl",
    kategorija: "spc",
    situacija: "Tačka van UCL/LCL na kontrolnoj karti",
    akcija: "Zaustaviti i proveriti uzrok (alat, materijal, podešavanje)",
  },
  {
    id: "we_obrazac",
    kategorija: "spc",
    situacija: "Western Electric obrazac (trend, serija, alternacija)",
    akcija: "Analiza uzroka — korektivna mera pre nastavka",
  },
  {
    id: "trend_6",
    kategorija: "spc",
    situacija: "6 uzastopnih tačaka rasta ili pada na X̄ karti",
    akcija: "Podešavanje procesa pre prelaska granica",
  },
  {
    id: "nok_serija",
    kategorija: "kvalitet",
    situacija: "NOK serija prekoračila prag po klasi defekta",
    akcija: "Zaustaviti lot, sortirati, obavestiti kvalitet",
  },
  {
    id: "ppk_133",
    kategorija: "kapabilitet",
    situacija: "Ppk < 1,33 (dugoročna kapabilitet)",
    akcija: "Revizija procesa i PFMEA",
  },
  {
    id: "fai_nok",
    kategorija: "fai",
    situacija: "FAI merenje NOK",
    akcija: "Zaustaviti puštanje serije — odobrenje kvaliteta",
  },
  {
    id: "kalibracija",
    kategorija: "merila",
    situacija: "Merilo van kalibracije",
    akcija: "Zabrana merenja do validne kalibracije",
  },
  {
    id: "sigma_nizak",
    kategorija: "kapabilitet",
    situacija: "Sigma nivo procesa < 4σ",
    akcija: "Plan poboljšanja — smanjenje varijacije",
  },
];

export function ucitajReakcioniPlanSpc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...PODRAZUMEVANI_REAKCIONI_PLAN_SPC];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [...PODRAZUMEVANI_REAKCIONI_PLAN_SPC];
    return parsed.map((r, i) => ({
      id: r.id || `red_${i}`,
      kategorija: r.kategorija || "ostalo",
      situacija: String(r.situacija || "").trim(),
      akcija: String(r.akcija || "").trim(),
    })).filter((r) => r.situacija && r.akcija);
  } catch {
    return [...PODRAZUMEVANI_REAKCIONI_PLAN_SPC];
  }
}

export function snimiReakcioniPlanSpc(redovi) {
  const clean = (redovi || [])
    .map((r, i) => ({
      id: r.id || `red_${i}`,
      kategorija: r.kategorija || "ostalo",
      situacija: String(r.situacija || "").trim(),
      akcija: String(r.akcija || "").trim(),
    }))
    .filter((r) => r.situacija && r.akcija);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean.length ? clean : PODRAZUMEVANI_REAKCIONI_PLAN_SPC));
  return clean;
}

export function resetujReakcioniPlanSpc() {
  localStorage.removeItem(STORAGE_KEY);
  return [...PODRAZUMEVANI_REAKCIONI_PLAN_SPC];
}

const KAT_NAZIV = {
  granice: "Granice",
  dimenzija: "Dimenzija",
  spc: "SPC karta",
  kapabilitet: "Cp/Cpk",
  kvalitet: "Kvalitet",
  fai: "FAI",
  merila: "Merila",
  ostalo: "Ostalo",
};

export function labelKategorijeReakcije(k) {
  return KAT_NAZIV[k] || k || "—";
}

/** Koje pravila su relevantna za trenutni kontekst analitike. */
export function aktivneAkcijeZaAnalitiku(ctx = {}, plan = null) {
  const rows = plan || ucitajReakcioniPlanSpc();
  const out = [];
  const cpk = Number(ctx.cpk);
  const cp = Number(ctx.cp);
  const vanUcl = Number(ctx.vanUclLcl) > 0;
  const we = Number(ctx.weUpozorenja) > 0;
  const nok2 = Number(ctx.nokUzastopna) >= 2;
  const sigma = Number(ctx.sigmaNivo);

  for (const r of rows) {
    let hit = false;
    switch (r.id) {
      case "van_lsl_usl":
        hit = !!ctx.vanLslUsl;
        break;
      case "cpk_133":
        hit = Number.isFinite(cpk) && cpk < 1.33;
        break;
      case "cpk_100":
        hit = Number.isFinite(cpk) && cpk < 1.0;
        break;
      case "ppk_133":
        hit = Number.isFinite(cp) && cp < 1.33;
        break;
      case "van_ucl_lcl":
        hit = vanUcl;
        break;
      case "we_obrazac":
      case "trend_6":
        hit = we;
        break;
      case "spc_upozorenje_2":
        hit = nok2 || we;
        break;
      case "sigma_nizak":
        hit = Number.isFinite(sigma) && sigma < 4;
        break;
      case "nok_serija":
        hit = !!ctx.nokSerija;
        break;
      case "fai_nok":
        hit = !!ctx.faiNok;
        break;
      case "kalibracija":
        hit = !!ctx.kalibracijaIstekla;
        break;
      default:
        break;
    }
    if (hit) out.push(r);
  }
  return out;
}

/** Predlog akcije za SPC alarm modal. */
export function predloziAkcijeZaAlarm(alarm, plan = null) {
  const rows = plan || ucitajReakcioniPlanSpc();
  const pravilo = String(alarm?.pravilo || "").toLowerCase();
  const tip = String(alarm?.tip_karte || "").toLowerCase();
  const out = [];

  if (pravilo.includes("nok") || tip === "linija") {
    out.push(...rows.filter((r) => r.id === "van_lsl_usl" || r.id === "nok_serija"));
  }
  if (pravilo.includes("western") || pravilo.includes("we") || tip.includes("xbar")) {
    out.push(...rows.filter((r) => r.id === "we_obrazac" || r.id === "van_ucl_lcl"));
  }
  if (pravilo.includes("cpk") || pravilo.includes("1.33")) {
    out.push(...rows.filter((r) => r.id === "cpk_133"));
  }
  if (pravilo.includes("1.00") || pravilo.includes("1,00")) {
    out.push(...rows.filter((r) => r.id === "cpk_100"));
  }

  const uniq = [];
  const seen = new Set();
  for (const r of out) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    uniq.push(r);
  }
  if (!uniq.length) {
    return rows.filter((r) => r.id === "van_lsl_usl" || r.id === "we_obrazac").slice(0, 2);
  }
  return uniq;
}
