/** Admin: postavljanje lozinke radniku (Edge Function + opcioni email reset). */

export function validirajRadnikLozinku(loz1, loz2) {
  if (!loz1 || loz1.length < 6) return "Lozinka mora imati najmanje 6 karaktera.";
  if (loz1 !== loz2) return "Lozinke se ne poklapaju.";
  return null;
}

function porukaIzInvoke(error, data) {
  if (data?.error) return String(data.error);
  const msg = error?.message || "";
  if (/edge function/i.test(msg) || /failed to send a request/i.test(msg)) {
    return [
      "Edge funkcija admin-radnik-lozinka nije deploy-ovana na Supabase projektu.",
      "",
      "Za IT / inženjera (jednokratno, u folderu spc-web):",
      "1) npm install -g supabase",
      "2) supabase login",
      "3) supabase link --project-ref wzxkcomeurogvfisticq",
      "4) supabase functions deploy admin-radnik-lozinka",
      "",
      "Provera: Supabase Dashboard → Edge Functions → admin-radnik-lozinka",
      "",
      "Do tada: u prozoru Lozinka koristi „Pošalji reset link na email“ (SMTP u Auth).",
    ].join("\n");
  }
  return msg || "Greška pri postavljanju lozinke.";
}

export async function postaviRadnikLozinku(supabase, radnikId, novaLozinka) {
  const { data, error } = await supabase.functions.invoke("admin-radnik-lozinka", {
    body: { radnikId, novaLozinka },
  });
  if (error || !data?.ok) {
    throw new Error(porukaIzInvoke(error, data));
  }
  return data;
}

export async function posaljiResetLozinkeEmail(supabase, email, redirectTo) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Radnik nema email.");
  const { error } = await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: redirectTo || window.location.origin,
  });
  if (error) throw new Error(error.message);
}
