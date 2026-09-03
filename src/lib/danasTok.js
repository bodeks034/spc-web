/**
 * Prioriteti za „Danas · šta uraditi“ panel.
 * Čista funkcija — unit test bez React-a.
 */

export function rangirajDanasKorake({
  online = true,
  offlineTotal = 0,
  zaglavljenih = 0,
  imaKriticniAlarm = false,
  listaNedovrsena = false,
  linija = false,
  sifrarnik = false,
  qa = false,
  admin = false,
} = {}) {
  const koraci = [];

  if (zaglavljenih > 0) {
    koraci.push({ id: "zaglavljen", prioritet: 0 });
  } else if (!online || offlineTotal > 0) {
    koraci.push({ id: "offline", prioritet: 1 });
  }

  if (imaKriticniAlarm) {
    koraci.push({ id: "alarm", prioritet: 2 });
  }

  if (listaNedovrsena && linija) {
    koraci.push({ id: "lista", prioritet: 2.5 });
  }

  if (linija) {
    koraci.push({ id: "unos-atr", prioritet: 3 });
    koraci.push({ id: "unos-mer", prioritet: 4 });
  }

  if (sifrarnik) {
    koraci.push({ id: "sifrarnik", prioritet: 5 });
  }

  if (qa && !imaKriticniAlarm) {
    koraci.push({ id: "odobrenja", prioritet: 6 });
  }

  if (admin) {
    koraci.push({ id: "admin", prioritet: 7 });
  }

  return koraci
    .sort((a, b) => a.prioritet - b.prioritet)
    .slice(0, 3)
    .map((k) => k.id);
}
