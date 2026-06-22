/** Smene po satu: 1 → 06–14, 2 → 14–22, 3 → 22–06 */

export const SMENA_OPISI = {
  1: "06–14",
  2: "14–22",
  3: "22–06",
};

/** Trenutna smena (1–3) prema lokalnom vremenu. */
export function smenaPoSatu(d = new Date()) {
  const min = d.getHours() * 60 + d.getMinutes();
  if (min >= 6 * 60 && min < 14 * 60) return 1;
  if (min >= 14 * 60 && min < 22 * 60) return 2;
  return 3;
}

export function opisSmene(smena) {
  return SMENA_OPISI[Number(smena)] || "";
}
