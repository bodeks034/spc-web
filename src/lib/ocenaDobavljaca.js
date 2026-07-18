export const PONDERI_OCENE_DOBAVLJACA = Object.freeze({
  kvalitet: 0.60,
  isporuka: 0.20,
  dokumentacija: 0.10,
  reakcija: 0.10,
});

export const OPIS_FORMULE_KVALITETA =
  "Automatski skor: PPM osnovni skor umanjen za odbijene prijeme (do 30 poena) "
  + "i uslovne prijeme (do 10 poena). Potrebna je bar jedna kontrolisana jedinica.";

const PPM_TACKE = [
  [0, 100],
  [500, 100],
  [1_000, 95],
  [2_500, 90],
  [5_000, 80],
  [10_000, 70],
  [25_000, 50],
  [50_000, 25],
  [100_000, 0],
];

function ogranicenBroj(v, naziv) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`${naziv} mora biti broj od 0 do 100`);
  }
  return n;
}

export function ppmSkor(ppm) {
  const p = Math.max(0, Number(ppm) || 0);
  for (let i = 1; i < PPM_TACKE.length; i += 1) {
    const [x1, y1] = PPM_TACKE[i];
    const [x0, y0] = PPM_TACKE[i - 1];
    if (p <= x1) {
      const odnos = (p - x0) / (x1 - x0 || 1);
      return +(y0 + odnos * (y1 - y0)).toFixed(2);
    }
  }
  return 0;
}

export function izracunajKvalitetSkor(stat = {}) {
  const kontrolisano = Number(stat.kontrolisano) || 0;
  const prijema = Number(stat.prijema) || 0;
  if (kontrolisano <= 0 || prijema <= 0) return null;

  const odbijenoStopa = (Number(stat.odbijeno) || 0) / prijema * 100;
  const uslovnoStopa = (Number(stat.uslovno) || 0) / prijema * 100;
  const penalOdbijeno = Math.min(30, odbijenoStopa * 0.6);
  const penalUslovno = Math.min(10, uslovnoStopa * 0.2);
  return +Math.max(0, ppmSkor(stat.ppm) - penalOdbijeno - penalUslovno).toFixed(2);
}

export function klasaDobavljaca(ukupno) {
  const n = Number(ukupno) || 0;
  if (n >= 90) return "A";
  if (n >= 75) return "B";
  if (n >= 60) return "C";
  return "D";
}

export function opisKlaseDobavljaca(klasa) {
  return ({
    A: "Odobren dobavljač",
    B: "Uslovno odobren — pratiti trend",
    C: "Potreban plan poboljšanja",
    D: "Predlog za blokadu ili ponovnu kvalifikaciju — bez automatske blokade",
  })[klasa] || "—";
}

export function izracunajUkupnuOcenu({
  kvalitet,
  isporuka,
  dokumentacija,
  reakcija,
}) {
  const k = ogranicenBroj(kvalitet, "Kvalitet");
  const i = ogranicenBroj(isporuka, "Isporuka");
  const d = ogranicenBroj(dokumentacija, "Dokumentacija");
  const r = ogranicenBroj(reakcija, "Reakcija");
  const ukupno = +(
    k * PONDERI_OCENE_DOBAVLJACA.kvalitet
    + i * PONDERI_OCENE_DOBAVLJACA.isporuka
    + d * PONDERI_OCENE_DOBAVLJACA.dokumentacija
    + r * PONDERI_OCENE_DOBAVLJACA.reakcija
  ).toFixed(2);
  return { ukupno, klasa: klasaDobavljaca(ukupno) };
}

export function napraviPredlogOcene(stat, ostalo = {}) {
  const kvalitet = izracunajKvalitetSkor(stat);
  if (kvalitet == null) return { kvalitet: null, ukupno: null, klasa: null };
  const isporuka = Number(ostalo.isporuka ?? 100);
  const dokumentacija = Number(ostalo.dokumentacija ?? 100);
  const reakcija = Number(ostalo.reakcija ?? 100);
  return {
    kvalitet,
    isporuka,
    dokumentacija,
    reakcija,
    ...izracunajUkupnuOcenu({ kvalitet, isporuka, dokumentacija, reakcija }),
  };
}
