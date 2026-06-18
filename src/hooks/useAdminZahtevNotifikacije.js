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

      let naslov;
      let poruka = "";
      if (tip === "kalibracija") {
        naslov = `📤 Kalibracija: ${row.id_deo}`;
        poruka = String(row.razlog || "").substring(0, 80);
      } else if (tip === "spc_alarm") {
        naslov = `⛔ SPC alarm: ${row.id_deo}`;
        poruka = [row.tip_karte, row.pravilo].filter(Boolean).join(" · ").substring(0, 80);
      } else if (tip === "spc_karantin") {
        naslov = `🔒 Karantin SPC: ${row.id_deo}`;
        poruka = String(row.razlog || row.komentar_operater || "").substring(0, 80);
      } else {
        naslov = `📤 Prekid: ${row.id_deo}`;
        poruka = String(row.razlog || "").substring(0, 80);
      }
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

    const obradiSpcAlarm = async (row) => {
      if (!row?.id || row.status !== "otvoren") return;
      const kljuc = `spc_alarm_${row.id}`;
      if (obradjeno.current.has(kljuc)) return;
      obradjeno.current.add(kljuc);
      await obavestiAdminZahtev(supabase, { tip: "spc_alarm", zahtev: row });
      onInAppToast?.(
        `⛔ SPC alarm: ${row.id_deo} — ${[row.tip_karte, row.pravilo].filter(Boolean).join(" · ")}`,
        "greska",
      );
    };

    const chSpc = supabase.channel("admin_notif_spc_alarmi")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "spc_alarmi",
      }, (payload) => {
        obradiSpcAlarm(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chPrekid);
      supabase.removeChannel(chKal);
      supabase.removeChannel(chSpc);
    };
  }, [enabled, korisnik?.radnikId, supabase, onInAppToast]);
}
