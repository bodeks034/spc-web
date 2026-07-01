/** Period iz filter trake → ISO datum OD (danas − N dana). */
export function datumOdIzPerioda(period) {
  const od = new Date();
  od.setDate(od.getDate() - Number(period || 7));
  return od.toISOString().split("T")[0];
}

export function datumDoDanas() {
  return new Date().toISOString().split("T")[0];
}

/** Objekat za SPC karte iz AnalitikaFilterContext.
 *  Period se NE prosleđuje automatski — SPC kartama treba više istorije od KPI pregleda.
 *  Datumi se primenjuju samo ako korisnik eksplicitno zatraži (primeniPeriod). */
export function spcFilterIzAnalitike(filter, { primeniPeriod = false } = {}) {
  if (!filter) return null;
  const idDeo = String(filter.idDeo || "").trim().toUpperCase();
  const smena = filter.smena || "";
  const out = {
    aktivan: Boolean(idDeo || smena || filter.pozicija || primeniPeriod),
    idDeo,
    smena,
    pozicija: String(filter.pozicija || "").trim(),
  };
  if (primeniPeriod) {
    out.primeniPeriod = true;
    out.datumOd = datumOdIzPerioda(filter.period);
    out.datumDo = datumDoDanas();
  }
  return out;
}
