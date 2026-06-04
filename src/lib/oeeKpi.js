/** OEE i prateći KPI (škart, dorada, FPY). */

export function izracunajOeeKpi({
  planirano_min = 0,
  zastoj_min = 0,
  planirano_kom = 0,
  ukupno_kom = 0,
  ispravno_iz_prve = 0,
  ok_nakon_dorade = 0,
  skart = 0,
  dorada = 0,
}) {
  const plan = Number(planirano_min) || 0;
  const zastoj = Math.min(Number(zastoj_min) || 0, plan);
  const planKom = Number(planirano_kom) || 0;
  const uk = Number(ukupno_kom) || 0;
  const fp = Number(ispravno_iz_prve) || 0;
  const okPosle = Number(ok_nakon_dorade) || 0;
  const sk = Number(skart) || 0;
  const dor = Number(dorada) || 0;

  const availability = plan > 0 ? Math.max(0, (plan - zastoj) / plan) : null;
  const performance = planKom > 0
    ? Math.max(0, Math.min(1, uk / planKom))
    : null;
  const performancePct = performance != null ? performance : 1;
  const quality = uk > 0 ? Math.max(0, Math.min(1, (fp + okPosle) / uk)) : null;
  const oee = availability != null && quality != null
    ? availability * performancePct * quality * 100
    : (performance != null && quality != null
      ? performancePct * quality * 100
      : null);

  return {
    availability: availability != null ? +(availability * 100).toFixed(1) : null,
    performance: performance != null ? +(performance * 100).toFixed(1) : 100,
    quality: quality != null ? +(quality * 100).toFixed(1) : null,
    oee: oee != null ? +oee.toFixed(1) : null,
    fpy: uk > 0 ? +((fp / uk) * 100).toFixed(1) : null,
    skartStopa: uk > 0 ? +((sk / uk) * 100).toFixed(2) : null,
    doradaStopa: uk > 0 ? +((dor / uk) * 100).toFixed(2) : null,
    ukupno_kom: uk,
  };
}

export function podrazumevaniKpiIzMerenja({ kolone, potrebanBroj, brojKolona }) {
  let ukMerenja = 0;
  let nok = 0;
  (kolone || []).forEach(k => {
    if (k.naziv === "-") return;
    ukMerenja += k.merenja?.length || 0;
    nok += k.cntNOK || 0;
  });
  const ukKom = Math.max(1, (brojKolona || 1) * (potrebanBroj || 1));
  const ok = Math.max(0, ukMerenja - nok);
  return {
    ukupno_kom: ukKom,
    ispravno_iz_prve: ok,
    neusaglaseno: nok,
    dorada: 0,
    skart: 0,
    ok_nakon_dorade: 0,
    planirano_min: 480,
    zastoj_min: 0,
    planirano_kom: 0,
  };
}

export function podrazumevaniKpiIzListeP(listaP) {
  let ok = 0;
  let nok = 0;
  (listaP || []).forEach(s => {
    const q = s.kolicina || 1;
    if (s.status === "OK") ok += q;
    else nok += q;
  });
  const uk = ok + nok || 1;
  return {
    ukupno_kom: uk,
    ispravno_iz_prve: ok,
    neusaglaseno: nok,
    dorada: 0,
    skart: 0,
    ok_nakon_dorade: 0,
    planirano_min: 480,
    zastoj_min: 0,
    planirano_kom: 0,
  };
}

/** Dopuni KPI objekat planiranom količinom iz naloga. */
export function dopuniPlaniranoKom(kpi, planiranoKom) {
  const plan = Number(planiranoKom) || 0;
  if (!plan) return kpi;
  return { ...kpi, planirano_kom: kpi?.planirano_kom > 0 ? kpi.planirano_kom : plan };
}
