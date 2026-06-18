/**
 * Browser / Teams obaveštenja adminu za zahteve operatera (prekid, kalibracija).
 */
import {
  ucitajPodesavanjaNotifikacija,
  posaljiObavestenje,
  zatraziBrowserDozvolu,
} from "./notifikacije.js";

const TIPOVI = {
  prekid: {
    naslov: (z) => `Zahtev za prekid: ${z.id_deo}`,
    opis: (z) => {
      const op = z.operater_ime ? `Operater: ${z.operater_ime}. ` : "";
      const pre = z.preostalo != null && z.cilj != null ? `Preostalo ${z.preostalo}/${z.cilj}. ` : "";
      return `${op}${pre}${z.razlog || ""}`.trim();
    },
    nivo: "visok",
  },
  kalibracija: {
    naslov: (z) => `Kalibracija istekla: ${z.id_deo}`,
    opis: (z) => {
      const op = z.operater_ime ? `Operater: ${z.operater_ime}. ` : "";
      const mer = z.instrumenti ? `Merila: ${z.instrumenti}. ` : "";
      return `${op}${mer}${z.razlog || ""}`.trim();
    },
    nivo: "visok",
  },
  spc_alarm: {
    naslov: (z) => `SPC van kontrole: ${z.id_deo}`,
    opis: (z) => {
      const karta = z.tip_karte ? `${z.tip_karte}-karta` : "SPC";
      const pravilo = z.pravilo ? ` · ${z.pravilo}` : "";
      const poz = z.pozicija ? ` · ${z.pozicija}` : "";
      return `${karta}${poz}${pravilo}`.trim();
    },
    nivo: "kriticno",
  },
  spc_karantin: {
    naslov: (z) => `KARANTIN SPC: ${z.id_deo}`,
    opis: (z) => {
      const rn = z.radni_nalog ? `RN ${z.radni_nalog}. ` : "";
      return `${rn}${z.razlog || z.komentar_operater || ""}`.trim();
    },
    nivo: "kriticno",
  },
};

/**
 * Šalje obaveštenje adminu.
 * @param {"svi"|"remote"} kanali — remote = samo Teams/email (sa operaterovog uređaja);
 *   svi = uključuje browser (na admin sesiji).
 */
export async function obavestiAdminZahtev(supabase, { tip, zahtev, kanali = "svi" }) {
  const cfg = TIPOVI[tip];
  if (!cfg || !zahtev?.id) return { preskoceno: true };

  const settings = await ucitajPodesavanjaNotifikacija(supabase);
  const eff = kanali === "remote"
    ? { ...settings, notif_browser: "0" }
    : settings;
  return posaljiObavestenje(supabase, eff, {
    id: `zahtev_${tip}_${zahtev.id}`,
    nivo: cfg.nivo,
    naslov: cfg.naslov(zahtev),
    opis: cfg.opis(zahtev),
  });
}

/** Jednom po sesiji — predloži browser dozvolu adminu. */
let trazenaDozvola = false;
export function predloziBrowserDozvoluAdminu() {
  if (trazenaDozvola) return;
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  trazenaDozvola = true;
  zatraziBrowserDozvolu().catch(() => {});
}
