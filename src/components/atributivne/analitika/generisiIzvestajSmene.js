import { supabase } from "../../../lib/supabaseClient.js";
import { generisiPredajaSmenePdf } from "../../../lib/predajaSmenePdf.js";

export async function generisiIzvestajSmene(korisnik, smena, C) {
  await generisiPredajaSmenePdf(supabase, {
    korisnik,
    smena,
    modul: "atributivne",
    addToast: (msg, tip) => {
      if (tip === "greska") alert(msg);
      else if (tip === "uspeh") alert(msg);
    },
  });
}
