/**
 * NCR → 8D okidači — 4 jasna pravila kada je 8D obavezan.
 * Kolona „8D pokrenut“ = DA kada je ispunjen bar jedan obavezan okidač.
 */

export const NCR_8D_PRAGOVI = {
  ponavljanjeDana: 45,
  trosakSkartaEur: 500,
  kolicinaNeispravnaMin: 50,
  kolicinaSumnjivaMin: 100,
};

export const NCR_8D_OKIDACI = [
  {
    id: "reklamacija_kupca",
    redni: 1,
    naziv: "Eksterna reklamacija kupca",
    obavezan: true,
    opis: "Kupac je poslao zvaničnu reklamaciju — 8D je obavezan bez izuzetka.",
  },
  {
    id: "ponovljeni_ncr",
    redni: 2,
    naziv: "Ponovljeni NCR / sistemska greška",
    obavezan: true,
    opis: "Isti deo ili opis na istoj liniji u roku od 30–60 dana — proces je nestabilan.",
  },
  {
    id: "trosak_kolicina",
    redni: 3,
    naziv: "Finansijski trošak ili velika količina",
    obavezan: true,
    opis: "Trošak škarta prekoračio limit ili blokirana količina je velika.",
  },
  {
    id: "sc_cc",
    redni: 4,
    naziv: "SC / CC — bezbednost ili funkcija",
    obavezan: true,
    opis: "Greška na Specijalnoj (SC) ili Kritičnoj (CC) karakteristici.",
  },
];

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function normOpisKljuč(opis) {
  return norm(opis).replace(/\s+/g, " ").slice(0, 48);
}

function broj(val) {
  const n = Number(String(val ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function okidacReklamacijaKupca(forma) {
  const brojRek = String(forma.broj_reklamacije || "").trim();
  const uticaj = forma.uticaj_kupca === "DA";
  const izvorRek = norm(forma.izvor) === "reklamacija_kupca"
    || /reklamac|kupac|customer/i.test(String(forma.metoda_detekcije || ""));
  const aktivno = !!(brojRek || uticaj || (forma.kupac && izvorRek));
  return {
    id: "reklamacija_kupca",
    aktivno,
    detalj: brojRek
      ? `Broj reklamacije: ${brojRek}`
      : uticaj
        ? "Uticaj na kupca: DA"
        : aktivno
          ? "Reklamacija kupca / eksterni izvor"
          : "",
  };
}

export function okidacPonovljeniNcr(forma, prethodniLista = [], pragovi = NCR_8D_PRAGOVI) {
  const rucno = forma.ponavljanje === "DA";
  const idDeo = norm(forma.id_deo);
  const linija = norm(forma.linija);
  const opisKey = normOpisKljuč(forma.opis);

  const poklapanja = (prethodniLista || []).filter((p) => {
    if (forma.id && p.id === forma.id) return false;
    if (!idDeo || norm(p.id_deo) !== idDeo) return false;
    const istaLinija = linija && norm(p.linija) === linija;
    const sličanOpis = opisKey.length >= 12 && normOpisKljuč(p.opis) === opisKey;
    return istaLinija || sličanOpis;
  });

  const aktivno = rucno || poklapanja.length > 0;
  const prethodni = poklapanja[0];
  return {
    id: "ponovljeni_ncr",
    aktivno,
    detalj: rucno
      ? "Označeno ponavljanje: DA"
      : prethodni
        ? `Prethodni NCR ${prethodni.broj_ncr} (${prethodni.datum_otvaranja || "—"}) · u ${pragovi.ponavljanjeDana} dana`
        : "",
    prethodniNcr: prethodni?.broj_ncr || "",
    poklapanja,
  };
}

export function okidacTrosakKolicina(forma, pragovi = NCR_8D_PRAGOVI) {
  const trosak = broj(forma.trosak_skarta);
  const neispr = broj(forma.kolicina_neispravna);
  const sumnj = broj(forma.kolicina_sumnjiva);
  const razlozi = [];
  if (trosak >= pragovi.trosakSkartaEur) {
    razlozi.push(`Trošak škarta ${trosak} € ≥ ${pragovi.trosakSkartaEur} €`);
  }
  if (neispr >= pragovi.kolicinaNeispravnaMin) {
    razlozi.push(`Neispravna količina ${neispr} ≥ ${pragovi.kolicinaNeispravnaMin}`);
  }
  if (sumnj >= pragovi.kolicinaSumnjivaMin) {
    razlozi.push(`Sumnjiva količina ${sumnj} ≥ ${pragovi.kolicinaSumnjivaMin}`);
  }
  return {
    id: "trosak_kolicina",
    aktivno: razlozi.length > 0,
    detalj: razlozi.join(" · "),
  };
}

export function okidacScCc(forma) {
  const klasa = String(forma.karakteristika_klasa || "").trim().toUpperCase();
  const uSpec = /(^|\s)(SC|CC)(\s|$)/i.test(String(forma.zahtev_spec || ""));
  const uKar = /(^|\s)(SC|CC)(\s|$)/i.test(String(forma.karakteristika || ""));
  const aktivno = klasa === "SC" || klasa === "CC" || uSpec || uKar;
  return {
    id: "sc_cc",
    aktivno,
    detalj: klasa
      ? `Klasa karakteristike: ${klasa}`
      : uSpec || uKar
        ? "SC/CC u karakteristici ili specifikaciji"
        : "",
  };
}

export function evaluiraj8dOkidace(forma, { prethodniLista = [], pragovi = NCR_8D_PRAGOVI } = {}) {
  const rezultati = [
    okidacReklamacijaKupca(forma),
    okidacPonovljeniNcr(forma, prethodniLista, pragovi),
    okidacTrosakKolicina(forma, pragovi),
    okidacScCc(forma),
  ];

  const meta = Object.fromEntries(NCR_8D_OKIDACI.map((o) => [o.id, o]));
  const okidaci = rezultati
    .filter((r) => r.aktivno)
    .map((r) => ({ ...meta[r.id], ...r }));

  const obavezan8d = okidaci.length > 0;
  const razlogTekst = okidaci
    .map((o) => `${o.redni}. ${o.naziv}: ${o.detalj}`)
    .join("\n");

  const pon = okidacPonovljeniNcr(forma, prethodniLista, pragovi);

  return {
    obavezan8d,
    okidaci,
    razlogTekst,
    preporuka: {
      osmd_pokrenut: obavezan8d,
      ponavljanje: pon.aktivno ? "DA" : forma.ponavljanje || "NE",
      prethodni_ncr: pon.prethodniNcr || forma.prethodni_ncr || "",
      razlog_osmd: razlogTekst || forma.razlog_osmd || "",
    },
  };
}

export function ncrMozeZatvoritiBez8d(forma, eval8d) {
  const ev = eval8d || evaluiraj8dOkidace(forma);
  if (!ev.obavezan8d) return { ok: true };
  const ima8d = !!(forma.osmd_id || forma.osmd_pokrenut || forma.osmd_broj);
  if (ima8d) return { ok: true };
  return {
    ok: false,
    greska: "8D je obavezan (okidač ispunjen) — pokrenite 8D pre zatvaranja NCR-a.",
    okidaci: ev.okidaci,
  };
}

export function primeni8dPreporuku(forma, eval8d, { prepisiRazlog = false } = {}) {
  const ev = eval8d || evaluiraj8dOkidace(forma);
  if (!ev.obavezan8d) return forma;
  return {
    ...forma,
    osmd_pokrenut: true,
    ponavljanje: ev.preporuka.ponavljanje,
    prethodni_ncr: ev.preporuka.prethodni_ncr || forma.prethodni_ncr,
    razlog_osmd: prepisiRazlog || !String(forma.razlog_osmd || "").trim()
      ? ev.preporuka.razlog_osmd
      : forma.razlog_osmd,
  };
}
