/**
 * Katalog auto-pravila (bez LLM) — za UI vodič i dokumentaciju.
 */

import { AUTO_PRAGOVI } from "./autoAkcije.js";

export const AUTO_PRAVILA = [
  {
    id: "nok3",
    naslov: `${AUTO_PRAGOVI.nokUzastopnaEskalacija}× NOK uzastopna`,
    opis: "Auto eskalacija + NCR draft + email/Teams (auto kanal). Vodič predlaže pauzu serije i odobrenje QA.",
    okidač: "Snimanje merenja (merljive / atributivne)",
    kanal: "Teams auto · email",
  },
  {
    id: "spc_ncr",
    naslov: "SPC alarm na liniji",
    opis: "Draft NCR iz alarma + obaveštenje inženjeru. Alarm blokira liniju dok se ne potvrdi.",
    okidač: "Pravilo SPC karte (R1, trend…)",
    kanal: "Glavni Teams · email SPC",
  },
  {
    id: "ncr_zatvori",
    naslov: "Zatvaranje NCR",
    opis: "Auto-zatvaranje povezanih eskalacija i SPC alarma + obaveštenje o zatvaranju.",
    okidač: "Status NCR → zatvoren",
    kanal: "Teams auto · email",
  },
  {
    id: "ncr_rok",
    naslov: "NCR rok prošao / sutra",
    opis: "Podsetnik za NCR sa definisanim rokom.",
    okidač: "Dnevno 08:00 (Task Scheduler)",
    kanal: "Teams auto · email",
  },
  {
    id: "ncr_8d",
    naslov: "NCR bez 8D (24h+)",
    opis: "NCR u statusu otvoren/analiza bez pokrenute 8D analize duže od 24h.",
    okidač: "Dnevno 08:00",
    kanal: "Teams auto · email",
  },
  {
    id: "kpi_dorada",
    naslov: "KPI dorada nedostaje",
    opis: "Neusaglašeni komadi bez unosa dorade 2h+ u smeni.",
    okidač: "Proaktivno u aplikaciji + dnevni podsetnici",
    kanal: "Teams auto · email",
  },
  {
    id: "digest",
    naslov: "Smenski digest",
    opis: "KPI, alarmi, NCR, top prioritet smene; opciono PDF predaja smene. Sa DIGEST_PO_LINIJI=1 ili --po-linijama sekcije po liniji.",
    okidač: "14:05 i 22:05 (smena 1 / 2)",
    kanal: "Email (SMTP_TO)",
  },
  {
    id: "health",
    naslov: "Health check",
    opis: "DB, env, logovi zadataka, nedostajuće migracije.",
    okidač: "Dnevno 06:30",
    kanal: "Email ako problem",
  },
  {
    id: "erp",
    naslov: "ERP dnevni uvoz",
    opis: "Automatski uvoz plana / RN iz CSV foldera.",
    okidač: "Dnevno 06:00",
    kanal: "logs/erp-uvoz.log",
  },
  {
    id: "weekly",
    naslov: "Nedeljni rollup",
    opis: "KPI i prioriteti za 7 dana — email šefu/kvalitetu.",
    okidač: "Petak 15:00",
    kanal: "Email (SMTP_TO)",
  },
  {
    id: "ncr_8d_draft",
    naslov: "NCR → 8D auto-draft",
    opis: "Kreira 8D nacrt u bazi za NCR otvoren 24h+ bez analize.",
    okidač: "Dnevno 08:00 (podsetnici)",
    kanal: "Baza · audit log",
  },
  {
    id: "licenca",
    naslov: "Licenca ističe",
    opis: "Upozorenje 30/7 dana pre isteka (LICENSE_VAZI_DO).",
    okidač: "Dnevni podsetnici",
    kanal: "Teams auto · email",
  },
];

export function brojAutoPravila() {
  return AUTO_PRAVILA.length;
}
