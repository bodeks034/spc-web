/** Poruke za česte Supabase/Postgres greške (sekvence posle CSV/demo uvoza). */
export function porukaDbGreske(error) {
  const msg = error?.message || "";
  if (msg.includes("duplicate key") && msg.includes("kontrolni_log")) {
    return "Dupli ID u bazi (sekvenca nije usklađena posle CSV importa). "
      + "Pokreni 09_fix_kontrolni_log_sequence.sql u Supabase SQL Editoru, pa pokušaj ponovo.";
  }
  if (msg.includes("duplicate key") && msg.includes("merenja_varijabilna")) {
    return "Dupli ID u bazi (sekvenca merenja nije usklađena posle demo/CSV uvoza). "
      + "Pokreni 19_fix_merenja_varijabilna_sequence.sql u Supabase SQL Editoru, pa ponovo Sačuvaj seriju.";
  }
  return msg;
}
