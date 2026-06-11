/** Uvoz / spajanje master delovi + delovi_atributivni_pogon. */

export function mapDeloviRedIzExcela(r, pick, num, daNe) {
  const idDeo = pick(r, "id dela", "id_deo").toUpperCase();
  const tip = (pick(r, "tip kontrole", "tip_kontrole")
    || (idDeo.startsWith("AUTO") || idDeo.startsWith("NTV") || idDeo.startsWith("MRAP") ? "vozilo" : "deo")).toLowerCase();
  const pogonRaw = pick(r, "pogon kod", "pogon_kod", "pogon");
  const rnRaw = pick(r, "radni nalog", "radni_nalog", "radni nal", "rn");

  return {
    id_deo: idDeo,
    pogon_kod: pogonRaw ? String(pogonRaw).trim().toUpperCase() : "",
    radni_nalog: rnRaw ? String(rnRaw).trim().toUpperCase() : null,
    naziv_dela: pick(r, "naziv dela", "naziv_dela"),
    karakteristika: pick(r, "karakteristika kontrole", "karakteristika") || null,
    linija_id: num(pick(r, "linija id", "linija_id")),
    masina_id: num(pick(r, "masina id", "masina_id")),
    kom_za_kontrolu: num(pick(r, "kom za kontrolu n", "kom za kontrolu")) ?? 30,
    slika_naziv: pick(r, "slika/crtez", "slika_naziv") || null,
    aktivan: daNe(pick(r, "aktivan")),
    napomena: pick(r, "napomena") || null,
    tip_kontrole: tip === "vozilo" ? "vozilo" : "deo",
    vozilo_katalog_id: pick(r, "vozilo katalog id", "vozilo_katalog_id") || (tip === "vozilo" ? idDeo : null),
    greska_katalog_id: pick(r, "greska katalog id", "greska_katalog_id") || null,
  };
}

/** Excel redovi → master delovi + pogon redovi. */
export function podeliDeloviUvoz(mappedRows) {
  const masterById = new Map();
  const pogonRows = [];

  for (const row of mappedRows || []) {
    if (!row?.id_deo) continue;
    const master = {
      id_deo: row.id_deo,
      naziv_dela: row.naziv_dela,
      karakteristika: row.karakteristika,
      linija_id: row.linija_id,
      masina_id: row.masina_id,
      kom_za_kontrolu: row.kom_za_kontrolu,
      slika_naziv: row.slika_naziv,
      aktivan: row.aktivan,
      napomena: row.napomena,
      tip_kontrole: row.tip_kontrole,
      vozilo_katalog_id: row.vozilo_katalog_id,
      greska_katalog_id: row.greska_katalog_id,
    };
    if (!masterById.has(row.id_deo)) {
      masterById.set(row.id_deo, master);
    }
    if (row.pogon_kod) {
      pogonRows.push({
        id_deo: row.id_deo,
        pogon_kod: row.pogon_kod,
        radni_nalog: row.radni_nalog,
        naziv_dela: row.naziv_dela || null,
        karakteristika: row.karakteristika || null,
        linija_id: row.linija_id,
        masina_id: row.masina_id,
        kom_za_kontrolu: row.kom_za_kontrolu,
        napomena: row.napomena || null,
        aktivan: row.aktivan !== false,
      });
    }
  }

  return {
    masterRows: [...masterById.values()],
    pogonRows,
  };
}

/** Spoji master delovi + pogon red za prikaz u unosu. */
export function spojiDeoIPogon(master, pogonRed) {
  if (!master && !pogonRed) return null;
  return {
    ...(master || {}),
    ...(pogonRed || {}),
    id_deo: master?.id_deo || pogonRed?.id_deo,
    pogon_kod: pogonRed?.pogon_kod || "",
    radni_nalog: pogonRed?.radni_nalog || null,
    naziv_dela: pogonRed?.naziv_dela || master?.naziv_dela,
    karakteristika: pogonRed?.karakteristika || master?.karakteristika,
    kom_za_kontrolu: pogonRed?.kom_za_kontrolu ?? master?.kom_za_kontrolu,
    linija_id: pogonRed?.linija_id ?? master?.linija_id,
    masina_id: pogonRed?.masina_id ?? master?.masina_id,
    linija: pogonRed?.linija_id != null && pogonRed.linija_id !== master?.linija_id
      ? null
      : master?.linija,
    masina: pogonRed?.masina_id != null && pogonRed.masina_id !== master?.masina_id
      ? null
      : master?.masina,
    slika_naziv: master?.slika_naziv,
    tip_kontrole: master?.tip_kontrole,
    vozilo_katalog_id: master?.vozilo_katalog_id,
    greska_katalog_id: master?.greska_katalog_id,
    napomena: pogonRed?.napomena || master?.napomena,
    aktivan: master?.aktivan !== false && pogonRed?.aktivan !== false,
  };
}

/** Redovi za Excel tab delovi (master + po pogonu). */
export function deloviZaExcelEksport(masterRows, pogonRows) {
  const masterMap = new Map((masterRows || []).map((r) => [String(r.id_deo).toUpperCase(), r]));
  const out = [];

  for (const m of masterRows || []) {
    const id = String(m.id_deo).toUpperCase();
    const pogoni = (pogonRows || []).filter((p) => String(p.id_deo).toUpperCase() === id);
    if (!pogoni.length) {
      out.push({ ...m, pogon_kod: "", radni_nalog: "" });
    }
  }

  for (const p of pogonRows || []) {
    const id = String(p.id_deo).toUpperCase();
    const m = masterMap.get(id) || {};
    out.push({
      ...m,
      ...p,
      id_deo: id,
      aktivan: p.aktivan !== false,
    });
  }

  return out.sort((a, b) => {
    const c = String(a.id_deo).localeCompare(String(b.id_deo));
    return c !== 0 ? c : String(a.pogon_kod || "").localeCompare(String(b.pogon_kod || ""));
  });
}
