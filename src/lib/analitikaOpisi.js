/** Kratki opisi tabova Modula 2 i SPC karata — par rečenica za inženjera. */

/** Skraćeni tooltip — NCR / CAPA oznake u navigaciji i KPI karticama. */
export const NCR_CAPA_TOOLTIP = "NCR (izveštaj o neusaglašenosti) · CAPA (korektivne i preventivne akcije)";

/** Opis taba Modula 2 → Kvalitet → NCR / CAPA (title + traka ispod tabova). */
export const NCR_CAPA_OPIS_TAB = "NCR — izveštaj o neusaglašenosti: dokumentuj problem, uzrok i odgovornost. CAPA — korektivne i preventivne akcije: plan mera i verifikacija efekta. Veza sa 8D i SPC alarmima.";

/** Skraćeni tooltip — PFMEA oznake. */
export const PFMEA_TOOLTIP = "PFMEA — analiza mogućih grešaka i njihovih efekata u procesu";

/** Opis taba Modula 2 → Kvalitet → PFMEA / CP. */
export const PFMEA_CP_OPIS_TAB = "PFMEA — analiza mogućih grešaka i njihovih efekata u procesu (S/O/D, RPN). Control Plan — kontrolne mere, metode i odgovornosti u proizvodnji.";

export const OPISI_ANALITIKA_ATRIB = {
  pregled: "Zbirni KPI pogona: FPY atributivno, RTY, OEE, alarmi i TOP NOK za izabrani filter.",
  dashboard: "SPC fokus: p-karta, Pareto grešaka, DPMO i FPY trend.",
  karte: "SPC kontrolne karte (p, np, C, u…) — stabilnost procesa i udeo neispravnih.",
  stanje: "Inteligencija procesa: predikcija, rizik i preporuke za intervenciju.",
  oc: "Operativna karakteristika — koliko proces može da promeni pre nego što padne u NOK.",
  stabilnost: "Da li je proces statistički stabilan kroz vreme (bez posebnih uzroka).",
  msa: "MSA / merila — repeatability, kalibracija, Gage R&R i MSA kalendar.",
  kplan: "Kontrolni plan — koje karakteristike, koliko, kojom metodom.",
  odobrenja: "SPC alarmi, zahtevi za prekid serije i kalibracija — odobrenje bez Admin panela.",
  ncr: NCR_CAPA_OPIS_TAB,
  "8d": "8D izveštaj i korektivne mere za sistemski problem.",
  "pfmea-cp": PFMEA_CP_OPIS_TAB,
  eskalacije: "Otvoreni problemi, rokovi i eskalacije ka inženjeru / menadžmentu.",
  aql: "AQL uzorkovanje po ISO — prihvatljiv nivo kvaliteta za lot.",
  kupac: "Izveštaj kvaliteta formatiran za kupca / audit.",
  dobavljac: "Izveštaj i ocena dobavljača: PPM, OK stopa, A–D klasa (kvalitet 60% + isporuka/dokumentacija/reakcija).",
  trasabilitet: "Trag dela kroz merenja, log i KPI — ko, kada, šta.",
  smena: "Rezime smene: OK/NOK, DPMO, ključni događaji.",
  oee: "OEE, škart i dorada iz KPI unosa za period filtera.",
  kalibracija: "Status merila i kalibracija — istek, upozorenja, zahtevi.",
  ciljevi: "Ciljevi FPY/DPMO po delu — uporedi stvarno vs cilj.",
  nalozi: "Radni nalozi povezani sa delovima i proizvodnjom.",
  prijemna: "Prijem dobavljača: lot/prijemnica, pa Ulazna kontrola (pogon A) za OK/NOK po komadu.",
  excel: "Izvoz podataka u Excel za inženjera (bez admin uvoza).",
};

export const OPISI_ANALITIKA_MER = {
  pregled: "Zbirni KPI: FPY merljivo, RTY, OEE, alarmi i problematični delovi u filteru.",
  karte: "X̄/R, I/MR, Cp/Cpk — dimenzije, granice i SPC upozorenja.",
  stanje: "Inteligencija procesa za merljive karakteristike.",
  oc: "OC kriva ISO 3951 (Pa) + odluka lota iz merenja (Qu/Ql ≥ k).",
  heatmap: "NOK po danu i smeni — brzo vidi kada i gde pada kvalitet.",
  stabilnost: "Stabilnost dimenzija i procesa kroz period.",
  msa: "MSA / merila — repeatability, kalibracija, spremnost alata.",
  kplan: "Kontrolni plan — koje dimenzije, koliko, kojim alatom.",
  odobrenja: "SPC alarmi, prekidi i kalibracija — QA odobrenja.",
  ncr: NCR_CAPA_OPIS_TAB,
  "8d": "8D izveštaj i korektivne mere za sistemski problem.",
  "pfmea-cp": PFMEA_CP_OPIS_TAB,
  eskalacije: "Otvoreni problemi, rokovi i eskalacije ka inženjeru / menadžmentu.",
  aql: "AQL uzorkovanje po ISO — prihvatljiv nivo kvaliteta za lot.",
  fai: "First Article Inspection — odobrenje prvog uzorka serije.",
  kupac: "Merljivi izveštaj za kupca.",
  dobavljac: "Izveštaj i ocena dobavljača: PPM, OK stopa, A–D klasa (kvalitet 60% + isporuka/dokumentacija/reakcija).",
  trasabilitet: "Trag merenja po delu, seriji i operateru.",
  smena: "Rezime merenja i NOK po smeni.",
  oee: "OEE i KPI dorade/škarta za merljive serije.",
  ciljevi: "Ciljevi kvaliteta za merljive delove.",
  nalozi: "Radni nalozi za varijabilne delove.",
  excel: "Izvoz merenja i KPI u Excel.",
};

export const OPISI_SPC_ATRIB = {
  p: "Udeo neispravnih komada po periodu — kada se menja veličina uzorka (n).",
  np: "Broj neispravnih komada — stabilan uzorak n po tački.",
  c: "Broj defekata po jedinici — više grešaka na istom komadu.",
  nc: "Ukupan broj defekata po periodu.",
  u: "Prosečan broj defekata po komadu ili jedinici.",
  pareto: "Koji tip greške dominira — fokus korektivnih mera.",
  smena: "Poređenje kvaliteta između smena.",
  masina: "NOK po mašini / radnom mestu.",
  operater: "NOK po kontroloru / operateru.",
  rty: "FPY trend i DPMO/PPM po danu — prolaz iz prve.",
  heatmap: "Top NOK po danu — brza slika rizika.",
  sigma: "Sigma nivo procesa iz DPMO i benchmark tabela.",
  korelacija: "Veza između tipa greške i mašine.",
  poredi: "Uporedi dva perioda za isti deo.",
  foto_spc: "Foto arhiva NOK zapisa.",
  oc_spc: "OC kriva ISO 3951 — Pa + odluka lota iz merenja (Q ≥ k).",
  stabilnost_spc: "Stabilnost merljivog procesa kroz vreme.",
};

export const OPISI_SPC_MER = {
  xbar: "Sredina podgrupe (X̄) — da li proces drži centar.",
  r: "Raspon unutar podgrupe — varijacija merenja u seriji.",
  i: "Pojedinačna merenja — malo tačaka ili 1 merenje po uzorku.",
  mr: "Pomeraj između uzastopnih merenja (moving range).",
  cpk: "Cp/Cpk — koliko proces staje unutar LSL/USL.",
  plan: "Reakcioni plan kad SPC signalizira problem.",
  rty: "FPY merenja, DPMO/PPM trend po danu.",
  sigma: "Sigma nivo iz DPMO i kapabiliteta.",
  dashboard: "SPC fokus: X̄/R karte, Cp/Cpk, Pareto i DPMO — jedan ekran za odluku.",
  pareto: "Koja dimenzija najčešće pada (NOK).",
  smena: "Merenja i NOK po smeni.",
  heatmap: "NOK po danu × smeni.",
  masina: "NOK po mašini.",
  operater: "NOK po operateru / kontroloru.",
  korelacija: "Dimenzija × mašina za NOK.",
  poredi: "Tekući vs prethodni period.",
  foto_spc: "Foto NOK merenja.",
  "8d": "8D izveštaj za dimenziju / deo.",
  hist: "Histogram raspodele oko LSL/USL i nominala.",
  oee: "OEE, škart i dorada iz KPI za filter.",
};

export function opisAnalitikaTaba(tabId, modul = "atributivne") {
  const map = modul === "merljive" ? OPISI_ANALITIKA_MER : OPISI_ANALITIKA_ATRIB;
  return map[String(tabId || "").toLowerCase()] || "";
}

export function opisSpcKarte(tabId, modul = "atributivne") {
  const map = modul === "merljive" ? OPISI_SPC_MER : OPISI_SPC_ATRIB;
  return map[String(tabId || "").toLowerCase()] || "";
}
