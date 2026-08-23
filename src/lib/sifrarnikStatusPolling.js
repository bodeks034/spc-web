/** Periodična invalidacija status keša + opcioni Supabase realtime. */
import { supabase } from "./supabaseClient.js";
import { invalidirajStatusAgregate } from "./sifrarnikStatusCache.js";
import { obavestiPromenuStatusaSifrarnika } from "./sifrarnikStatusEvent.js";

const POLL_MS = 60000;

export function pokreniSifrarnikStatusPolling({ intervalMs = POLL_MS } = {}) {
  if (typeof window === "undefined") return () => {};

  const tick = () => {
    invalidirajStatusAgregate();
    obavestiPromenuStatusaSifrarnika({ izvor: "polling", akcija: "osvezi" });
  };

  const interval = window.setInterval(tick, intervalMs);

  let channel = null;
  try {
    channel = supabase
      .channel("sifrarnik-status-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "delovi" }, tick)
      .on("postgres_changes", { event: "*", schema: "public", table: "karakteristike_merljive" }, tick)
      .subscribe();
  } catch {
    /* realtime opciono */
  }

  return () => {
    window.clearInterval(interval);
    if (channel) supabase.removeChannel(channel);
  };
}
