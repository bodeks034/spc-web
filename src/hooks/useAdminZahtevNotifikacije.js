import { useEffect, useRef } from "react";
import {
  obavestiAdminZahtev,
  predloziBrowserDozvoluAdminu,
} from "../lib/adminZahtevNotifikacije.js";

/**
 * Realtime: admin dobija browser/Teams obaveštenje kad operater pošalje zahtev.
 * Radi dok je aplikacija otvorena (bilo koji tab/modul).
 */
export default function useAdminZahtevNotifikacije({
  supabase,
  korisnik,
  enabled = false,
  onInAppToast,
}) {
  const obradjeno = useRef(new Set());

  useEffect(() => {
    if (!enabled || !korisnik?.radnikId || !supabase) return;

    predloziBrowserDozvoluAdminu();

    const obradiInsert = async (tip, row) => {
      if (!row?.id || row.status !== "ceka") return;
      const kljuc = `${tip}_${row.id}`;
      if (obradjeno.current.has(kljuc)) return;
      obradjeno.current.add(kljuc);

      await obavestiAdminZahtev(supabase, { tip, zahtev: row });

      const naslov = tip === "kalibracija"
        ? `📤 Kalibracija: ${row.id_deo}`
        : `📤 Prekid: ${row.id_deo}`;
      const poruka = String(row.razlog || "").substring(0, 80);
      onInAppToast?.(naslov + (poruka ? ` — ${poruka}` : ""), "greska");
    };

    const chPrekid = supabase.channel("admin_notif_prekidi")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "prekidi_zahtevi",
      }, (payload) => {
        obradiInsert("prekid", payload.new);
      })
      .subscribe();

    const chKal = supabase.channel("admin_notif_kalibracija")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "kalibracija_zahtevi",
      }, (payload) => {
        obradiInsert("kalibracija", payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chPrekid);
      supabase.removeChannel(chKal);
    };
  }, [enabled, korisnik?.radnikId, supabase, onInAppToast]);
}
