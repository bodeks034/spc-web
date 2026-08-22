/** Checklist posle propagacije Glavnog unosa — tab ID-evi iz SifrarnikHub. */
import { GLAVNI_UNOS_SHEET_TIP } from "./glavniUnosSheetTip.js";

/**
 * @param {{ tip: string, idDeo?: string | null }} analiza
 * @returns {Array<{ id: string, label: string, tab: string, grupa?: string, opis?: string }>}
 */
export function stavkeChecklistePoslePropagacije(analiza, idDeo = null) {
  const id = idDeo ? ` (${idDeo})` : "";
  const zajednicko = [
    {
      id: "greske",
      tab: "greske",
      label: `Katalog grešaka${id}`,
      opis: "NOK dropdown na liniji — propagacija ne unosi greške.",
    },
    {
      id: "crtez",
      tab: "delovi_atr",
      label: `Crtež dela${id}`,
      opis: "Slika u Storage atributivne/.",
    },
    {
      id: "barkod",
      tab: "barkod",
      label: `Barkod etiketa${id}`,
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
    return [
      {
        id: "tip_vozilo",
        tab: "vozila",
        label: "Tip vozila + dijagram",
        opis: "public/vozilo/dijagrami/",
      },
      {
        id: "defekti_vozilo",
        tab: "defekti",
        label: "Defekti po zonama",
        opis: "Katalog grešaka za celo vozilo.",
      },
      {
        id: "delovi_vozilo",
        tab: "delovi_vozilo",
        label: "Deo vozila (pregled)",
        opis: "tip_kontrole=vozilo u Delovi.",
      },
      ...zajednicko.filter((s) => s.id !== "crtez" || idDeo),
    ];
  }

  return [
    {
      id: "delovi",
      tab: "delovi",
      label: "Delovi (pregled)",
      opis: "Proveri tip_kontrole=deo i aktivan=DA.",
    },
    ...zajednicko,
  ];
}
