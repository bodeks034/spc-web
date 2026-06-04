/** Pragovi i evaluacija operativnih alarma. */

export const ALARM_PRAGOVI = {
  nokProcenatDanas: 10,
  oeeMinProcenat: 65,
  eskalacijaStariSati: 24,
  kalibracijaUpozorenjeDana: 30,
};

const OTVORENE_ESK = new Set(["otvoren", "u_toku", "aktivan", "open"]);

export function evaluirajAlarme({
  attr = {},
  merljive = {},
  oee = {},
  eskalacije = [],
  merila = [],
  offlinePaketi = 0,
  visokNokDelovi = [],
}) {
  const alarmi = [];
  const danas = new Date().toISOString().split("T")[0];

  const ukN = (attr.ukN || 0) + (merljive.merenja || 0);
  const ukNok = (attr.ukNOK || 0) + (merljive.nok || 0);
  const pNok = ukN > 0 ? (ukNok / ukN) * 100 : 0;

  if (ukN > 0 && pNok >= ALARM_PRAGOVI.nokProcenatDanas) {
    alarmi.push({
      id: "nok_danas",
      nivo: "visok",
      naslov: `Visok NOK danas: ${pNok.toFixed(1)}%`,
      opis: `Atributivne ${attr.ukNOK || 0} NOK · Merljive ${merljive.nok || 0} NOK (ukupno ${ukN} merenja)`,
    });
  }

  if (oee.prosek != null && oee.prosek < ALARM_PRAGOVI.oeeMinProcenat) {
    alarmi.push({
      id: "oee_nizak",
      nivo: "srednji",
      naslov: `Prosečan OEE ispod ${ALARM_PRAGOVI.oeeMinProcenat}%`,
      opis: `Prosek poslednjih KPI unosa: ${oee.prosek}%`,
    });
  }

  const otv = eskalacije.filter(e => OTVORENE_ESK.has((e.status || "").toLowerCase()));
  if (otv.length > 0) {
    alarmi.push({
      id: "eskalacije_otvorene",
      nivo: "srednji",
      naslov: `${otv.length} otvorenih eskalacija`,
      opis: otv.slice(0, 3).map(e => `${e.id_deo || "—"}: ${(e.opis || "").slice(0, 40)}`).join(" · "),
    });
  }

  const granica = Date.now() - ALARM_PRAGOVI.eskalacijaStariSati * 3600000;
  const stari = otv.filter(e => new Date(e.created_at).getTime() < granica);
  if (stari.length > 0) {
    alarmi.push({
      id: "eskalacije_stare",
      nivo: "visok",
      naslov: `${stari.length} eskalacija bez odgovora > ${ALARM_PRAGOVI.eskalacijaStariSati}h`,
      opis: stari.map(e => e.id_deo || "?").join(", "),
    });
  }

  const istekla = merila.filter(m => m.kalStatus === "istekla");
  if (istekla.length > 0) {
    alarmi.push({
      id: "kal_istekla",
      nivo: "visok",
      naslov: `${istekla.length} merila sa isteklom kalibracijom`,
      opis: istekla.map(m => m.naziv).slice(0, 5).join(", "),
    });
  }

  const uskoro = merila.filter(m => m.kalStatus === "uskoro");
  if (uskoro.length > 0) {
    alarmi.push({
      id: "kal_uskoro",
      nivo: "info",
      naslov: `${uskoro.length} merila — kalibracija uskoro`,
      opis: `U narednih ${ALARM_PRAGOVI.kalibracijaUpozorenjeDana} dana`,
    });
  }

  if (offlinePaketi > 0) {
    alarmi.push({
      id: "offline",
      nivo: "srednji",
      naslov: `${offlinePaketi} paketa čeka sinhronizaciju`,
      opis: "Offline red — poveži mrežu i sinhronizuj",
    });
  }

  (visokNokDelovi || []).forEach(d => {
    alarmi.push({
      id: `deo_nok_${d.id_deo}`,
      nivo: "srednji",
      naslov: `Deo ${d.id_deo}: ${d.pNok}% NOK danas`,
      opis: d.modul,
    });
  });

  const redosled = { visok: 0, srednji: 1, info: 2 };
  alarmi.sort((a, b) => redosled[a.nivo] - redosled[b.nivo]);

  return { alarmi, meta: { danas, pNok, ukN, otvoreneEsk: otv.length } };
}

export function bojaNivoa(nivo, C) {
  if (nivo === "visok") return C.crvena;
  if (nivo === "srednji") return C.zuta;
  return C.plava;
}
