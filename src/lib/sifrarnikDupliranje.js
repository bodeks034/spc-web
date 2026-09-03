/** Dupliranje dela kao šablon — master + Glavni unos + greške + barkod profil. */
import { supabase } from "./supabaseClient.js";
import { klonirajDeoUGlavniUnos } from "./glavniUnosApi.js";
import { fetchGreskeKatalog, upsertGreskaKatalog, fetchBarkodProfili, upsertBarkodProfil } from "./sifrarnikApi.js";
import { logSifrarnikAudit } from "./sifrarnikAudit.js";

function norm(id) {
  return String(id || "").trim().toUpperCase();
}

export async function postojiDeo(idDeo) {
  const id = norm(idDeo);
  if (!id) return false;
  const { data, error } = await supabase
    .from("delovi")
    .select("id_deo")
    .eq("id_deo", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Kopira sve što čini deo kompletnim na novi ID.
 * Vraća broj kopiranih stavki po celini, uz listu koraka koji nisu uspeli.
 */
export async function dupilrajDeo(izvorId, ciljId, {
  kopirajGu = true,
  kopirajGreske = true,
  kopirajBarkod = true,
} = {}) {
  const izvor = norm(izvorId);
  const cilj = norm(ciljId);
  if (!izvor || !cilj) throw new Error("Izvor i cilj ID su obavezni");
  if (izvor === cilj) throw new Error("Izvor i cilj moraju biti različiti");
  if (await postojiDeo(cilj)) throw new Error(`Deo ${cilj} već postoji`);

  const rezultat = { izvor, cilj, gu: 0, greske: 0, barkod: 0, upozorenja: [] };

  if (kopirajGu) {
    try {
      const gu = await klonirajDeoUGlavniUnos(izvor, cilj, { kopirajMaster: true });
      rezultat.gu = gu.redova || 0;
    } catch (e) {
      // Deo bez GU redova je i dalje vredan duplikat — kopiraj bar master.
      rezultat.upozorenja.push(`Glavni unos: ${e.message}`);
      await kopirajMasterDeo(izvor, cilj);
    }
  } else {
    await kopirajMasterDeo(izvor, cilj);
  }

  if (kopirajGreske) {
    try {
      const greske = await fetchGreskeKatalog({ idDeo: izvor });
      for (const g of greske) {
        const { id, created_at, updated_at, ...ostalo } = g;
        await upsertGreskaKatalog({ ...ostalo, id_deo: cilj });
        rezultat.greske += 1;
      }
    } catch (e) {
      rezultat.upozorenja.push(`Greške: ${e.message}`);
    }
  }

  if (kopirajBarkod) {
    try {
      const profili = await fetchBarkodProfili(izvor);
      for (const p of profili) {
        const { id, created_at, updated_at, sadrzaj_barkoda, ...ostalo } = p;
        await upsertBarkodProfil({ ...ostalo, id_deo: cilj, sadrzaj_barkoda: null });
        rezultat.barkod += 1;
      }
    } catch (e) {
      rezultat.upozorenja.push(`Barkod: ${e.message}`);
    }
  }

  logSifrarnikAudit({
    idDeo: cilj,
    akcija: "dupliraj_deo",
    izvor: "sifrarnik",
    detalji: { izvor, gu: rezultat.gu, greske: rezultat.greske, barkod: rezultat.barkod },
  });

  return rezultat;
}

async function kopirajMasterDeo(izvor, cilj) {
  const { data: srcDeo, error } = await supabase
    .from("delovi")
    .select("*")
    .eq("id_deo", izvor)
    .maybeSingle();
  if (error) throw error;
  if (!srcDeo) throw new Error(`Deo ${izvor} ne postoji`);

  const { id, created_at, updated_at, ...ostalo } = srcDeo;
  const naziv = String(srcDeo.naziv_dela || cilj).trim();
  const { error: insErr } = await supabase.from("delovi").insert({
    ...ostalo,
    id_deo: cilj,
    naziv_dela: naziv.includes("(kopija)") ? naziv : `${naziv} (kopija)`,
  });
  if (insErr) throw insErr;
}
