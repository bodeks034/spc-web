/** Digitalni momentni ključ — vendor profili, rezolucija JOB-a, neutralni export. */

export const MOMENT_VENDOR = {
  ATLAS: "atlas",
  BOSCH: "bosch",
  STAHLWILLE: "stahlwille",
  SALTUS: "saltus",
  NORBAR: "norbar",
};

export const MOMENT_VENDOR_NAZIV = {
  atlas: "Atlas Copco",
  bosch: "Bosch Rexroth",
  stahlwille: "Stahlwille MANOSKOP",
  saltus: "Saltus",
  norbar: "Norbar / Snap-on",
};

export const MOMENT_KLASA = {
  VSK: "VSK",
  KSK: "KSK",
  STD: "STD",
};

/** Katalog zone → id_deo u delovi. */
export const MOMENT_DEO_ALIAS = {
  "MRAP1-FINAL-001": "MRAP1-001",
  "MRAP-FINAL-001": "MRAP-001",
  "NTV-FINAL-001": "NTV-001",
};

/** Ako nema JOB-ova za tip, probaj susedni (MRAP koristi MRAP1 sekvence). */
export const MOMENT_TIP_FALLBACK = {
  MRAP: ["MRAP1"],
};

/** Iz MRAP1-001 → MRAP1 (MRAP1 pre MRAP u regex-u). */
export function tipVozilaIzIdDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const m = id.match(/^(MRAP1|MRAP|NTV|AUTO)-/);
  return m ? m[1] : null;
}

export function tipoviZaMomentPretragu(tipVozila) {
  const tip = String(tipVozila || "").trim().toUpperCase();
  if (!tip) return [];
  const fb = MOMENT_TIP_FALLBACK[tip] || [];
  return [...new Set([tip, ...fb])];
}

/** Da li korak zahteva 100% evidenciju i tvrdu blokadu na NOK. */
export function momentBlokadaZaKlasu(klasifikacija, eksplicitno = null) {
  if (eksplicitno != null) return !!eksplicitno;
  const k = String(klasifikacija || "").trim().toUpperCase();
  if (k === MOMENT_KLASA.VSK) return true;
  if (k === MOMENT_KLASA.KSK) return true;
  return false;
}

export function momentUzorakObavezan(klasifikacija) {
  const k = String(klasifikacija || "").trim().toUpperCase();
  return k !== MOMENT_KLASA.STD;
}

/** Specifičnost: id_deo+operacija+linija → id_deo+operacija → id_deo → tip_vozila+operacija */
export function rangMomentJob(job) {
  let score = 0;
  if (job?.id_deo) score += 100;
  if (job?.operacija) score += 40;
  if (job?.pogon_kod) score += 20;
  if (job?.linija) score += 20;
  if (job?.tip_vozila && !job?.id_deo) score += 10;
  return score;
}

export function izaberiMomentJobove(kandidati, {
  idDeo,
  operacija = null,
  pogonKod = null,
  linija = null,
  tipVozila = null,
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const op = String(operacija || "").trim().toUpperCase() || null;
  const pog = String(pogonKod || "").trim().toUpperCase() || null;
  const lin = String(linija || "").trim() || null;
  const tip = String(tipVozila || "").trim().toUpperCase() || null;

  const aktivni = (kandidati || []).filter((j) => j.aktivan !== false);

  const poDeu = aktivni.filter((j) => String(j.id_deo || "").toUpperCase() === id);
  if (poDeu.length) {
    return filtrirajOpcione(poDeu, op, pog, lin)
      .sort((a, b) => rangMomentJob(b) - rangMomentJob(a));
  }

  const tipovi = tipoviZaMomentPretragu(tip);
  for (const t of tipovi) {
    const poTipu = aktivni
      .filter((j) => String(j.tip_vozila || "").toUpperCase() === t)
      .filter((j) => !op || String(j.operacija || "").toUpperCase() === op);
    if (poTipu.length) {
      return filtrirajOpcione(poTipu, op, pog, lin)
        .sort((a, b) => rangMomentJob(b) - rangMomentJob(a));
    }
  }

  return [];
}

function filtrirajOpcione(lista, operacija, pogonKod, linija) {
  const imaOp = lista.some((j) => j.operacija);
  const imaPog = lista.some((j) => j.pogon_kod);
  const imaLin = lista.some((j) => j.linija);

  return lista.filter((j) => {
    if (imaOp && operacija && String(j.operacija || "").toUpperCase() !== operacija) return false;
    if (imaPog && pogonKod && String(j.pogon_kod || "").toUpperCase() !== pogonKod) return false;
    if (imaLin && linija && String(j.linija || "").trim() !== linija) return false;
    return true;
  });
}

export function izracunajTolerancijuNm(korak) {
  const cilj = Number(korak?.cilj_nm);
  if (!Number.isFinite(cilj)) return { min: null, max: null };

  const minEks = Number(korak?.tol_min);
  const maxEks = Number(korak?.tol_max);
  if (Number.isFinite(minEks) && Number.isFinite(maxEks)) {
    return { min: minEks, max: maxEks };
  }

  const pct = Number(korak?.tol_pct);
  if (Number.isFinite(pct) && pct > 0) {
    const delta = cilj * (pct / 100);
    return { min: roundNm(cilj - delta), max: roundNm(cilj + delta) };
  }

  return { min: null, max: null };
}

function roundNm(v) {
  return Math.round(v * 10) / 10;
}

export function proveriMomentOk(korak, ostvarenoNm, ostvarenoUgao = null) {
  const nm = Number(ostvarenoNm);
  if (!Number.isFinite(nm)) return { ok: false, razlog: "Nema vrednosti Nm" };

  const { min, max } = izracunajTolerancijuNm(korak);
  if (Number.isFinite(min) && nm < min) {
    return { ok: false, razlog: `Ispod tolerancije (${min}–${max} Nm)` };
  }
  if (Number.isFinite(max) && nm > max) {
    return { ok: false, razlog: `Iznad tolerancije (${min}–${max} Nm)` };
  }

  if (korak?.tip === "NM_UGAO" || korak?.ugao_cilj != null) {
    const u = Number(ostvarenoUgao);
    const cilj = Number(korak?.ugao_cilj);
    const tol = Number(korak?.ugao_tol) || 5;
    if (!Number.isFinite(u) || !Number.isFinite(cilj)) {
      return { ok: false, razlog: "Nedostaje ugao" };
    }
    if (Math.abs(u - cilj) > tol) {
      return { ok: false, razlog: `Ugao van tolerancije (cilj ${cilj}° ±${tol}°)` };
    }
  }

  return { ok: true, razlog: null };
}

/** SPC neutral JSON za export na bilo koji adapter. */
export function momentJobNeutralExport(job, koraci, { idDeo, vendorProfil = null } = {}) {
  const koraciSort = [...(koraci || [])].sort((a, b) => a.redosled - b.redosled);
  return {
    format: "spc-moment-job-v1",
    id_deo: idDeo || job?.id_deo,
    job: {
      kod: job?.kod_job,
      naziv: job?.naziv,
      revizija: job?.revizija || "A",
      operacija: job?.operacija || null,
      vendor_profil: vendorProfil || job?.vendor_profil || null,
    },
    koraci: koraciSort.map((k) => {
      const tol = izracunajTolerancijuNm(k);
      return {
        n: k.redosled,
        ukupno: koraciSort.length,
        poz_br: k.poz_br,
        prolaz: k.prolaz,
        tip: k.tip,
        cilj_nm: k.cilj_nm,
        tol_min: tol.min,
        tol_max: tol.max,
        ugao_cilj: k.ugao_cilj,
        ugao_tol: k.ugao_tol,
        klasifikacija: k.klasifikacija,
        varijanta: k.varijanta,
        blokiraj_na_nok: momentBlokadaZaKlasu(k.klasifikacija, k.blokiraj_na_nok),
      };
    }),
  };
}

export function preuzmiMomentJobJson(payload, imeFajla = "moment_job.json") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = imeFajla;
  a.click();
  URL.revokeObjectURL(url);
}
