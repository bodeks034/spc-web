/** Paginirano učitavanje merenja_varijabilna + normalizacija pozicije (dijakritika, razmaci). */

export const MERENJA_PAGE_SIZE = 1000;
export const MERENJA_MAX_ROWS = 50000;

export function normalizujPozicijuKljuč(naziv) {
  return String(naziv || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function pozicijaSePoklapa(a, b) {
  const ka = normalizujPozicijuKljuč(a);
  const kb = normalizujPozicijuKljuč(b);
  return !!ka && ka === kb;
}

export function filtrirajMerenjaPoPoziciji(merenja, pozicija) {
  const p = String(pozicija || "").trim();
  if (!p) return merenja || [];
  return (merenja || []).filter((m) => pozicijaSePoklapa(m.pozicija, p));
}

export function nadjiKarakteristikuPoPoziciji(karakteristike, idDeo, pozicija) {
  const deo = String(idDeo || "").trim().toUpperCase();
  const p = String(pozicija || "").trim();
  if (!deo || !p) return null;
  return (karakteristike || []).find(
    (k) => String(k.id_deo || "").trim().toUpperCase() === deo && pozicijaSePoklapa(k.pozicija, p),
  ) || null;
}

function primeniOrder(q, order = []) {
  let out = q;
  for (const item of order) {
    if (Array.isArray(item)) {
      const [col, opts] = item;
      out = out.order(col, opts);
    } else {
      out = out.order(item);
    }
  }
  return out;
}

/**
 * Učitava sva merenja za deo (paginacija) i opciono filtrira po poziciji (normalizovano).
 * Supabase/PostgREST podrazumevano vraća max 1000 redova — bez paginacije gubi se ostatak.
 */
export async function fetchMerenjaVarijabilna(supabase, {
  idDeo,
  select = "*",
  datumOd,
  datumDo,
  smena,
  pozicija,
  order = [
    ["datum", { ascending: true }],
    ["created_at", { ascending: true }],
  ],
  pageSize = MERENJA_PAGE_SIZE,
  maxRows = MERENJA_MAX_ROWS,
} = {}) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (!deo) return [];

  const all = [];
  let from = 0;

  while (from < maxRows) {
    const to = from + pageSize - 1;
    let q = supabase.from("merenja_varijabilna").select(select).eq("id_deo", deo);
    if (datumOd) q = q.gte("datum", datumOd);
    if (datumDo) q = q.lte("datum", datumDo);
    if (smena !== "" && smena != null) q = q.eq("smena", Number(smena));
    q = primeniOrder(q, order);

    const { data, error } = await q.range(from, to);
    if (error) throw error;

    const batch = data || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return filtrirajMerenjaPoPoziciji(all, pozicija);
}
