/**
 * Opcije ID dela za 8D — celina vozila + delovi vozila + ostali delovi.
 * Prikaz: tipovi vozila (MRAP, NTV…) + svi delovi iz šifrarnika.
 * Snimanje: resolveOsmdIdDeoZaBazu mapira na id_deo iz tabele delovi (FK).
 */

/** Pronađi deo u šifrarniku za tip vozila (MRAP → MRAP-001). */
export function nadjiDeloZaTipVozila(tip, delovi = []) {
  const kod = String(tip?.kod || "").trim().toUpperCase();
  const prefiks = String(tip?.prefiks_id_deo || tip?.kod || "").trim().toUpperCase();
  if (!kod && !prefiks) return null;

  const kandidati = delovi.filter((d) => {
    const id = String(d.id_deo || "").toUpperCase();
    const vk = String(d.vozilo_katalog_id || "").toUpperCase();
    if (vk && (vk === kod || vk === prefiks)) return true;
    if (prefiks && (id === `${prefiks}-001` || id.startsWith(`${prefiks}-`))) return true;
    if (kod && (id === `${kod}-001` || id.startsWith(`${kod}-`))) return true;
    return false;
  });

  if (!kandidati.length) return null;

  kandidati.sort((a, b) => {
    const idA = String(a.id_deo).toUpperCase();
    const idB = String(b.id_deo).toUpperCase();
    const a001 = idA.endsWith("-001") ? 0 : 1;
    const b001 = idB.endsWith("-001") ? 0 : 1;
    if (a001 !== b001) return a001 - b001;
    return idA.localeCompare(idB, "sr");
  });

  return kandidati[0];
}

/** Fallback tipovi iz delovi.vozilo_katalog_id ako tipovi_vozila nije u bazi. */
function izvediTipoveIzDelova(delovi = []) {
  const map = new Map();
  for (const d of delovi) {
    const vk = String(d.vozilo_katalog_id || "").trim();
    if (!vk) continue;
    const key = vk.toUpperCase();
    if (!map.has(key)) {
      map.set(key, {
        kod: vk,
        naziv: vk,
        prefiks_id_deo: vk,
        aktivan: true,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.kod.localeCompare(b.kod, "sr"));
}

/**
 * id_deo za upis u bazu — mora postojati u delovi.
 * Mapira kod tipa (MRAP) → MRAP-001 itd.
 */
export function resolveOsmdIdDeoZaBazu(idDeo, delovi = [], tipoviVozila = []) {
  const raw = String(idDeo || "").trim();
  if (!raw) {
    return { id_deo: null, naziv_dela: "", nepoznat: false };
  }

  const idUp = raw.toUpperCase();
  const direktan = delovi.find((d) => String(d.id_deo || "").toUpperCase() === idUp);
  if (direktan) {
    return {
      id_deo: direktan.id_deo,
      naziv_dela: String(direktan.naziv_dela || "").trim(),
      nepoznat: false,
    };
  }

  const tipovi = tipoviVozila?.length ? tipoviVozila : izvediTipoveIzDelova(delovi);
  const tip = tipovi.find((t) => {
    const k = String(t.kod || "").toUpperCase();
    const p = String(t.prefiks_id_deo || "").toUpperCase();
    return k === idUp || p === idUp;
  });

  if (tip) {
    const deo = nadjiDeloZaTipVozila(tip, delovi);
    if (deo) {
      return {
        id_deo: deo.id_deo,
        naziv_dela: String(deo.naziv_dela || tip.naziv || "").trim(),
        nepoznat: false,
        tip_vozilo_kod: tip.kod,
      };
    }
    const prefiks = String(tip.prefiks_id_deo || tip.kod || "").trim();
    const pokusaj = delovi.find((d) => String(d.id_deo).toUpperCase() === `${prefiks.toUpperCase()}-001`);
    if (pokusaj) {
      return {
        id_deo: pokusaj.id_deo,
        naziv_dela: String(pokusaj.naziv_dela || tip.naziv || "").trim(),
        nepoznat: false,
      };
    }
  }

  return { id_deo: null, naziv_dela: raw, nepoznat: true };
}

export function buildOsmdIdDeoOpcije(delovi = [], tipoviVozila = []) {
  /** @type {Map<string, { id_deo: string, naziv_dela: string, grupa: string }>} */
  const poId = new Map();
  const tipovi = tipoviVozila?.length ? tipoviVozila : izvediTipoveIzDelova(delovi);

  // 1) Vozila (celina) — uvek iz tipova (MRAP, NTV, MRAP1…)
  for (const t of tipovi) {
    if (t.aktivan === false) continue;
    const kod = String(t.kod || t.prefiks_id_deo || "").trim();
    if (!kod) continue;

    const deo = nadjiDeloZaTipVozila(t, delovi);
    const idRaw = deo?.id_deo || kod;
    const idKey = String(idRaw).toUpperCase();
    const naziv = String(t.naziv || t.kod || kod).trim();

    poId.set(idKey, {
      id_deo: idRaw,
      naziv_dela: deo ? `${naziv} (${deo.id_deo})` : naziv,
      grupa: "vozilo",
    });
  }

  // 2) Delovi vozila + ostali delovi
  for (const d of delovi) {
    const idRaw = String(d.id_deo || "").trim();
    const idKey = idRaw.toUpperCase();
    if (!idKey) continue;
    if (poId.get(idKey)?.grupa === "vozilo") continue;

    const vk = String(d.vozilo_katalog_id || "").trim().toUpperCase();
    const jeDeoVozila = d.tip_kontrole === "vozilo"
      || (vk && (idKey.startsWith(`${vk}-`) || idKey === vk));

    poId.set(idKey, {
      id_deo: idRaw,
      naziv_dela: String(d.naziv_dela || idRaw).trim(),
      grupa: jeDeoVozila ? "deo_vozila" : "deo",
    });
  }

  const sortId = (a, b) => a.id_deo.localeCompare(b.id_deo, "sr");
  const vozila = [];
  const deloviVozila = [];
  const ostali = [];

  for (const st of poId.values()) {
    if (st.grupa === "vozilo") vozila.push(st);
    else if (st.grupa === "deo_vozila") deloviVozila.push(st);
    else ostali.push(st);
  }

  vozila.sort(sortId);
  deloviVozila.sort(sortId);
  ostali.sort(sortId);

  const grupe = [
    { key: "vozilo", label: "Vozila (celina)", stavke: vozila },
    { key: "deo_vozila", label: "Delovi vozila", stavke: deloviVozila },
    { key: "deo", label: "Delovi / artikli", stavke: ostali },
  ].filter((g) => g.stavke.length);

  return { grupe, svi: [...vozila, ...deloviVozila, ...ostali] };
}

export function nadjiOsmdDeo(idDeo, delovi = [], tipoviVozila = []) {
  if (!idDeo) return null;
  const { svi } = buildOsmdIdDeoOpcije(delovi, tipoviVozila);
  const idUp = String(idDeo).toUpperCase();
  const hit = svi.find((s) => String(s.id_deo).toUpperCase() === idUp);
  if (hit) return hit;

  const resolved = resolveOsmdIdDeoZaBazu(idDeo, delovi, tipoviVozila);
  if (resolved.id_deo) {
    return svi.find((s) => String(s.id_deo).toUpperCase() === String(resolved.id_deo).toUpperCase())
      || delovi.find((d) => String(d.id_deo).toUpperCase() === String(resolved.id_deo).toUpperCase())
      || { id_deo: resolved.id_deo, naziv_dela: resolved.naziv_dela };
  }
  return null;
}

export function porukaNepoznatOsmdId(idDeo) {
  const id = String(idDeo || "").trim();
  return `„${id}“ nije u tabeli delovi. U šifrarnik dodaj deo (npr. ${id}-001) ili izaberi drugi ID.`;
}
