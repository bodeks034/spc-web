/** Checklist posle propagacije Glavnog unosa — tab ID-evi iz SifrarnikHub. */
import { GLAVNI_UNOS_SHEET_TIP } from "./glavniUnosSheetTip.js";
import { normalizujKodLinije } from "./linijaProizvoda.js";

/**
 * @param {{ tip: string, sifra_vozila?: string | null }} analiza
 * @param {string | null} idDeo
 * @returns {Array<{ id: string, label: string, tab: string, ctx?: object, opis?: string }>}
 */
export function stavkeChecklistePoslePropagacije(analiza, idDeo = null) {
  const id = idDeo ? ` (${idDeo})` : "";
  const linija = normalizujKodLinije(analiza?.sifra_vozila) || null;
  const linijaCtx = linija ? { linijaKod: linija, voziloKod: linija } : {};

  const zajednicko = [
    {
      id: "greske",
      tab: "greske",
      label: linija ? `Katalog grešaka — ${linija}${id}` : `Katalog grešaka${id}`,
      ctx: { ...linijaCtx },
      opis: "NOK dropdown na liniji — propagacija ne unosi greške.",
    },
    {
      id: "crtez",
      tab: "delovi_atr",
      label: idDeo ? `Crtež dela${id}` : "Crtež dela",
      ctx: { otvoriCrtezForm: true },
      opis: "Slika u Storage atributivne/.",
    },
    {
      id: "barkod",
      tab: "barkod",
      label: idDeo ? `Barkod etiketa${id}` : "Barkod etiketa",
      ctx: { otvoriBarkod: true },
      opis: "Štampaj i probaj sken na Modul 1.",
    },
    {
      id: "pogon",
      tab: "pogon_mapa",
      label: "Pogon mapa (audit)",
      opis: "Linija ↔ slovo A–H — proveri pre go-live.",
    },
  ];

  if (analiza?.tip === GLAVNI_UNOS_SHEET_TIP.FINAL) {
    const lk = linija || "linija";
    return [
      {
        id: "tip_vozilo",
        tab: "vozila",
        label: linija ? `Tip linije + dijagram — ${lk}` : "Tip linije + dijagram",
        ctx: { ...linijaCtx },
        opis: linija ? `/sifrarnik/linije/…/${lk}/dijagram/` : "Silueta / shema proizvoda.",
      },
      {
        id: "defekti_vozilo",
        tab: "defekti",
        label: linija ? `Defekti po liniji — ${lk}` : "Defekti po liniji",
        ctx: { ...linijaCtx },
        opis: "Katalog grešaka za finalnu kontrolu.",
      },
      {
        id: "delovi_vozilo",
        tab: "delovi_vozilo",
        label: linija ? `Delovi po liniji — ${lk}` : "Delovi po liniji",
        ctx: { ...linijaCtx },
        opis: "tip_kontrole=vozilo u pregledu.",
      },
      ...zajednicko.filter((s) => s.id !== "crtez" || idDeo),
    ];
  }

  return [
    {
      id: "delovi",
      tab: "delovi",
      label: linija ? `Delovi (pregled) — ${linija}` : "Delovi (pregled)",
      ctx: { ...linijaCtx, radnaLinijaFilter: linija || undefined },
      opis: linija
        ? `Filtrirano na liniju ${linija}.`
        : "Proveri tip_kontrole=deo i aktivan=DA.",
    },
    ...zajednicko,
  ];
}
