import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  pfmeaPrazanRed,
  cpPrazanRed,
  izracunajRpnSummary,
  pfmeaCpRefIzRedova,
  pfmeaCpRefZaDefekt,
} from "../lib/pfmeaControlPlan.js";
import { PFMEA_UNOS_GRUPE, CP_UNOS_GRUPE, primeniRpnKalkulaciju } from "../lib/pfmeaCpPolja.js";
import {
  listaPfmeaCpDokumenata,
  ucitajPfmeaCpDokument,
  sacuvajPfmeaCpDokument,
  kreirajPfmeaCpDokument,
  obrisiPfmeaCpDokument,
  duplirajPfmeaCpDokument,
  proveriPfmeaCpTabele,
} from "../lib/pfmeaCpDb.js";
import {
  localListaDokumenata,
  localUcitajDokument,
  localKreirajDokument,
  localSacuvajDokument,
  localObrisiDokument,
  localDuplirajDokument,
} from "../lib/pfmeaCpLocal.js";
import { resetujKešPredloga } from "../lib/predloziIzBaze.js";
import { preuzmiPfmeaCpExcel } from "../lib/pfmeaCpExcelExport.js";
import { exportPfmeaCpPdf } from "../lib/pfmeaCpPdf.js";
import { jeKvalitetIliVise } from "../lib/uloge.js";
import PfmeaCpUnosForma from "./pfmea/PfmeaCpUnosForma.jsx";
import RpnSummaryPregled from "./pfmea/RpnSummaryPregled.jsx";
import {
  noviPfmeaCpDocIz8d,
  primeniPrefillNaPfmeaCpDoc,
  prefillPfmeaCpIz8d,
  izvuciOsmdIdIzNapomene,
  izvuciBroj8dIzNapomene,
} from "../lib/osmdPfmeaCpBridge.js";

const PODTABOVI = [
  ["pfmea", "PFMEA"],
  ["cp", "Control Plan"],
  ["rpn", "RPN Summary"],
];

function prazanRed(tip, idDeo) {
  const r = tip === "pfmea" ? pfmeaPrazanRed() : cpPrazanRed();
  if (idDeo) r.br_dela = idDeo;
  return r;
}

function StavkaRed({ red, tip, idx, izabran, onIzaberi, onUredi, onObrisi, mozeEdit, C }) {
  const naslov = tip === "pfmea"
    ? red.mod_greske || red.efekat_greske || red.proces || `Stavka ${idx + 1}`
    : red.karakteristika || red.proces || `Stavka ${idx + 1}`;
  const pod = tip === "pfmea"
    ? `S/O/D: ${red.s || "—"}/${red.o || "—"}/${red.d || "—"} · RPN: ${red.rpn_before || "—"} → ${red.rpn_after || "—"}`
    : `${red.klasifikacija || "—"} · ${red.metoda?.slice(0, 40) || "—"}`;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      background: C.panel, border: `1px solid ${izabran ? C.plava : C.border}`,
      borderRadius: 8,
    }}>
      <input type="radio" name={`ref-${tip}`} checked={izabran} onChange={onIzaberi} title="REF za 8D" />
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onUredi} role="presentation">
        <div style={{ color: C.tekst, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          #{idx + 1} · {naslov}
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 2 }}>{pod}</div>
      </div>
      {mozeEdit && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onUredi}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.plava, fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer",
            }}
          >
            Uredi
          </button>
          {onObrisi && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onObrisi(); }}
              style={{
                background: "none", border: `1px solid ${C.crvena}66`, borderRadius: 6,
                color: C.crvena, fontSize: 10, fontWeight: 700, padding: "6px 10px", cursor: "pointer",
              }}
            >
              Obriši
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function trim(s) {
  return String(s ?? "").trim();
}

/** Spoji nesačuvanu formu u dokument pre snimanja. */
function pripremaDocZaSnimanje(doc, podtab, formaRed, formaIdx) {
  const pf = [...(doc.pfmea?.redovi || [])];
  const cp = [...(doc.controlPlan?.redovi || [])];

  if (formaIdx === "new") {
    if (podtab === "pfmea" && (trim(formaRed.mod_greske) || trim(formaRed.efekat_greske))) {
      pf.push(primeniRpnKalkulaciju({ ...formaRed }));
    }
    if (podtab === "cp" && trim(formaRed.karakteristika)) {
      cp.push({ ...formaRed });
    }
  } else if (typeof formaIdx === "number") {
    if (podtab === "pfmea" && pf[formaIdx]) {
      pf[formaIdx] = primeniRpnKalkulaciju({ ...formaRed });
    }
    if (podtab === "cp" && cp[formaIdx]) {
      cp[formaIdx] = { ...formaRed };
    }
  }

  return {
    ...doc,
    pfmea: { redovi: pf },
    controlPlan: { redovi: cp },
    rpnSummary: izracunajRpnSummary(pf),
  };
}

function formaImaNesacuvanSadrzaj(podtab, formaRed, formaIdx) {
  if (formaIdx === "new") {
    if (podtab === "pfmea") return Boolean(trim(formaRed.mod_greske) || trim(formaRed.efekat_greske));
    if (podtab === "cp") return Boolean(trim(formaRed.karakteristika));
    return false;
  }
  if (typeof formaIdx === "number") return true;
  return false;
}

function brojStavkiLabel(n) {
  if (n === 1) return "1 stavka";
  if (n >= 2 && n <= 4) return `${n} stavke`;
  return `${n} stavki`;
}

function inicijalizujFormu(doc, tip, idDeoFilter, preferIdx = 0) {
  const redovi = tip === "pfmea" ? doc?.pfmea?.redovi : doc?.controlPlan?.redovi;
  if (redovi?.length) {
    const idx = Math.min(Math.max(0, preferIdx), redovi.length - 1);
    return { formaIdx: idx, formaRed: { ...redovi[idx] } };
  }
  return {
    formaIdx: "new",
    formaRed: prazanRed(tip, doc?.idDeo || idDeoFilter),
  };
}

function nadjiDokumentZa8d(lista, prefill) {
  if (!prefill) return null;
  if (prefill.osmdId) {
    const hit = lista.find((d) =>
      d.osmd_izvestaj_id === prefill.osmdId || d.osmdIzvestajId === prefill.osmdId,
    );
    if (hit) return hit;
  }
  if (prefill.broj8d) {
    const hit = lista.find((d) =>
      String(d.broj_8d || d.broj8d || "").toUpperCase() === String(prefill.broj8d).toUpperCase(),
    );
    if (hit) return hit;
  }
  if (prefill.naziv) {
    const hit = lista.find((d) => d.naziv === prefill.naziv);
    if (hit) return hit;
  }
  return null;
}

export default function PfmeaCpModul({
  C, addToast, korisnik, idDeoFilter = "", onUbaciU8d, onOtvori8d,
  prefillIz8d = null, onPrefillIz8dUsed,
}) {
  const mozeEdit = jeKvalitetIliVise(korisnik?.uloga);
  const [storageMode, setStorageMode] = useState(null);
  const [dokumenti, setDokumenti] = useState([]);
  const [doc, setDoc] = useState(null);
  const [podtab, setPodtab] = useState("pfmea");
  const [filterTekst, setFilterTekst] = useState("");
  const [prljavo, setPrljavo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selPfmea, setSelPfmea] = useState(0);
  const [selCp, setSelCp] = useState(0);
  /** null = forma skrivena, 'new' = nova stavka, broj = indeks za uređivanje */
  const [formaIdx, setFormaIdx] = useState("new");
  const [formaRed, setFormaRed] = useState(() => prazanRed("pfmea", idDeoFilter));
  const docRef = useRef(null);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const osveziListu = useCallback(async () => {
    if (storageMode === "supabase") {
      const lista = await listaPfmeaCpDokumenata(supabase);
      setDokumenti(lista);
      return lista;
    }
    const lista = localListaDokumenata();
    setDokumenti(lista);
    return lista;
  }, [storageMode]);

  const ucitajDoc = useCallback(async (id) => {
    setLoading(true);
    try {
      const d = storageMode === "supabase"
        ? await ucitajPfmeaCpDokument(supabase, id)
        : localUcitajDokument(id);
      if (d) {
        setDoc(d);
        setSelPfmea(0);
        setSelCp(0);
        setPrljavo(false);
        const tip = podtab === "cp" ? "cp" : "pfmea";
        const init = inicijalizujFormu(d, tip, idDeoFilter);
        setFormaIdx(init.formaIdx);
        setFormaRed(init.formaRed);
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [storageMode, addToast, podtab, idDeoFilter]);

  useEffect(() => {
    (async () => {
      const ok = await proveriPfmeaCpTabele(supabase);
      setStorageMode(ok ? "supabase" : "local");
    })();
  }, []);

  useEffect(() => {
    if (!storageMode || prefillIz8d) return;
    (async () => {
      setLoading(true);
      try {
        await osveziListu();
        setDoc(null);
        setFormaIdx("new");
        setFormaRed(prazanRed("pfmea", idDeoFilter));
      } catch (e) {
        addToast?.(e.message, "greska");
      } finally {
        setLoading(false);
      }
    })();
  }, [storageMode, osveziListu, idDeoFilter, addToast, prefillIz8d]);

  useEffect(() => {
    if (!storageMode || !prefillIz8d) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const lista = await osveziListu();
        const meta = nadjiDokumentZa8d(lista, prefillIz8d);

        let baza = null;
        if (meta) {
          baza = storageMode === "supabase"
            ? await ucitajPfmeaCpDokument(supabase, meta.id)
            : localUcitajDokument(meta.id);
        }

        if (baza?.id) {
          if (cancelled) return;
          setDoc(baza);
          setFilterTekst("");
          setPodtab("pfmea");
          setSelPfmea(0);
          setSelCp(0);
          const init = inicijalizujFormu(baza, "pfmea", baza.idDeo || idDeoFilter);
          setFormaIdx(init.formaIdx);
          setFormaRed(init.formaRed);
          setPrljavo(false);
          await osveziListu();
          addToast?.(
            "✓ Otvoren postojeći PFMEA/CP — vaše izmene su sačuvane. Za ponovni uvoz iz 8D: „↻ Ponovo iz 8D“.",
            "uspeh",
          );
          onPrefillIz8dUsed?.();
          return;
        }

        const noviDoc = noviPfmeaCpDocIz8d(prefillIz8d);

        let snimljen;
        const kreiran = storageMode === "supabase"
          ? await kreirajPfmeaCpDokument(supabase, {
            naziv: noviDoc.naziv,
            idDeo: noviDoc.idDeo || idDeoFilter,
            revizija: noviDoc.revizija,
            osmdIzvestajId: noviDoc.osmdIzvestajId,
            broj8d: noviDoc.broj8d,
            napomena: noviDoc.napomena,
            korisnik,
          })
          : localKreirajDokument({
            naziv: noviDoc.naziv,
            idDeo: noviDoc.idDeo || idDeoFilter,
            osmdIzvestajId: noviDoc.osmdIzvestajId,
            broj8d: noviDoc.broj8d,
            napomena: noviDoc.napomena,
          });
        snimljen = storageMode === "supabase"
          ? await sacuvajPfmeaCpDokument(supabase, { ...noviDoc, id: kreiran.id }, korisnik)
          : localSacuvajDokument({ ...noviDoc, id: kreiran.id });

        if (cancelled) return;
        setDoc(snimljen);
        setFilterTekst("");
        setPodtab("pfmea");
      setSelPfmea(0);
      setSelCp(0);
      const init = inicijalizujFormu(snimljen, "pfmea", snimljen.idDeo || idDeoFilter, 0);
        setFormaIdx(init.formaIdx);
        setFormaRed(init.formaRed);
        setPrljavo(false);
        await osveziListu();
        addToast?.(
          `✓ Preneto iz 8D (${prefillIz8d.prenetoOpis || "PFMEA/CP"}). Proverite stavke.`,
          "uspeh",
        );
        onPrefillIz8dUsed?.();
      } catch (e) {
        if (!cancelled) {
          addToast?.(e.message || "Greška pri prenosu iz 8D", "greska");
          onPrefillIz8dUsed?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prefillIz8d, storageMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (podtab === "rpn" || !doc) return;
    const tip = podtab === "cp" ? "cp" : "pfmea";
    const prefer = tip === "pfmea" ? selPfmea : selCp;
    const init = inicijalizujFormu(doc, tip, idDeoFilter, prefer);
    setFormaIdx(init.formaIdx);
    setFormaRed(init.formaRed);
  }, [podtab, doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pfmeaRedovi = doc?.pfmea?.redovi || [];
  const cpRedovi = doc?.controlPlan?.redovi || [];
  const rpnRedovi = useMemo(
    () => izracunajRpnSummary(pfmeaRedovi),
    [pfmeaRedovi],
  );

  const setPfmea = (redovi) => {
    setDoc((p) => ({
      ...p,
      pfmea: { redovi },
      rpnSummary: izracunajRpnSummary(redovi),
    }));
    setPrljavo(true);
  };

  const setCp = (redovi) => {
    setDoc((p) => ({
      ...p,
      controlPlan: { redovi },
      rpnSummary: izracunajRpnSummary(p.pfmea?.redovi || []),
    }));
    setPrljavo(true);
  };

  const sacuvajDokument = async () => {
    const osnovni = docRef.current;
    if (!osnovni) return;
    const zaSnim = pripremaDocZaSnimanje(osnovni, podtab, formaRed, formaIdx);
    try {
      const snimljen = storageMode === "supabase"
        ? await sacuvajPfmeaCpDokument(supabase, zaSnim, korisnik)
        : localSacuvajDokument(zaSnim);
      setDoc(snimljen);
      docRef.current = snimljen;
      if (formaImaNesacuvanSadrzaj(podtab, formaRed, formaIdx)) {
        setFormaIdx("new");
        setFormaRed(prazanRed(podtab === "cp" ? "cp" : "pfmea", snimljen.idDeo || idDeoFilter));
      }
      if (storageMode === "supabase") resetujKešPredloga();
      await osveziListu();
      setPrljavo(false);
      addToast?.(
        storageMode === "supabase" ? "✓ Sačuvano u Supabase" : "✓ Sačuvano lokalno",
        "uspeh",
      );
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const sacuvajStavku = () => {
    const tip = podtab;
    if (tip !== "pfmea" && tip !== "cp") return;

    const obavezno = tip === "pfmea"
      ? (trim(formaRed.mod_greske) || trim(formaRed.efekat_greske))
      : trim(formaRed.karakteristika);
    if (!obavezno) {
      addToast?.(
        tip === "pfmea" ? "Efekat greške ili mod greške je obavezan" : "Karakteristika je obavezna",
        "greska",
      );
      return;
    }

    const noviRed = tip === "pfmea"
      ? primeniRpnKalkulaciju({ ...formaRed })
      : { ...formaRed };

    setDoc((p) => {
      if (!p) return p;
      if (tip === "pfmea") {
        const postojeci = p.pfmea?.redovi || [];
        const redovi = formaIdx === "new"
          ? [...postojeci, noviRed]
          : postojeci.map((r, i) => (i === formaIdx ? noviRed : r));
        return {
          ...p,
          pfmea: { redovi },
          rpnSummary: izracunajRpnSummary(redovi),
        };
      }
      const postojeci = p.controlPlan?.redovi || [];
      const redovi = formaIdx === "new"
        ? [...postojeci, noviRed]
        : postojeci.map((r, i) => (i === formaIdx ? noviRed : r));
      return {
        ...p,
        controlPlan: { redovi },
        rpnSummary: izracunajRpnSummary(p.pfmea?.redovi || []),
      };
    });
    setPrljavo(true);

    if (formaIdx === "new") {
      addToast?.("✓ Stavka dodata u listu ispod — kliknite „Sačuvaj dokument“", "uspeh");
    } else {
      addToast?.("✓ Stavka ažurirana — sačuvajte dokument", "uspeh");
    }
    setFormaIdx("new");
    setFormaRed(prazanRed(tip, doc?.idDeo || idDeoFilter));
  };

  const obrisiStavkuPoIndeksu = (idx) => {
    if (!window.confirm(`Obrisati stavku #${idx + 1}?`)) return;
    const tip = podtab === "cp" ? "cp" : "pfmea";
    const redovi = tip === "pfmea" ? pfmeaRedovi : cpRedovi;
    const noviRedovi = redovi.filter((_, i) => i !== idx);

    if (tip === "pfmea") setPfmea(noviRedovi);
    else setCp(noviRedovi);

    if (noviRedovi.length === 0) {
      setFormaIdx("new");
      setFormaRed(prazanRed(tip, doc?.idDeo || idDeoFilter));
    } else if (formaIdx === idx || formaIdx === "new") {
      const newIdx = Math.min(idx, noviRedovi.length - 1);
      setFormaIdx(newIdx);
      setFormaRed({ ...noviRedovi[newIdx] });
    } else if (typeof formaIdx === "number" && formaIdx > idx) {
      setFormaIdx(formaIdx - 1);
    }

    if (tip === "pfmea") setSelPfmea(Math.max(0, Math.min(selPfmea, noviRedovi.length - 1)));
    else setSelCp(Math.max(0, Math.min(selCp, noviRedovi.length - 1)));
    setPrljavo(true);
    addToast?.("✓ Stavka obrisana — kliknite „Sačuvaj dokument“", "uspeh");
  };

  const obrisiStavku = () => {
    if (typeof formaIdx !== "number") return;
    obrisiStavkuPoIndeksu(formaIdx);
  };

  const otvoriUredi = (idx) => {
    const redovi = podtab === "pfmea" ? pfmeaRedovi : cpRedovi;
    if (!redovi[idx]) return;
    if (podtab === "pfmea") setSelPfmea(idx);
    else setSelCp(idx);
    setFormaIdx(idx);
    setFormaRed({ ...redovi[idx] });
  };

  const exportPayload = () => ({
    naziv: doc?.naziv,
    idDeo: doc?.idDeo,
    revizija: doc?.revizija,
    pfmeaRedovi,
    cpRedovi,
    rpnSummary: rpnRedovi,
  });

  const veza8d = useMemo(() => {
    if (!doc) return { osmdId: null, broj8d: "" };
    return {
      osmdId: doc.osmdIzvestajId || izvuciOsmdIdIzNapomene(doc.napomena),
      broj8d: trim(doc.broj8d) || izvuciBroj8dIzNapomene(doc.napomena),
    };
  }, [doc]);

  const imaVezu8d = Boolean(veza8d.osmdId || veza8d.broj8d);

  const ponovoPrenesiIz8d = async () => {
    if (!doc) return;
    if (!imaVezu8d) {
      addToast?.("Dokument nema vezu sa 8D — prenesite prvo iz 8D editora.", "greska");
      return;
    }
    if (!window.confirm(
      "Zameniti sve PFMEA i CP stavke jednim redom iz povezanog 8D izveštaja?",
    )) return;

    setLoading(true);
    try {
      let q = supabase.from("osmd_izvestaji").select("*");
      if (veza8d.osmdId) q = q.eq("id", veza8d.osmdId);
      else q = q.eq("broj_8d", veza8d.broj8d);
      const { data: osmd, error } = await q.maybeSingle();
      if (error || !osmd) {
        addToast?.("8D izveštaj nije pronađen u bazi.", "greska");
        return;
      }
      const prefill = prefillPfmeaCpIz8d(osmd);
      if (!prefill?.pfmea?.redovi?.length && !prefill?.controlPlan?.redovi?.length) {
        addToast?.("8D nema dovoljno podataka za prenos.", "greska");
        return;
      }
      const azuriran = primeniPrefillNaPfmeaCpDoc(doc, prefill, { zameni: true });
      const snimljen = storageMode === "supabase"
        ? await sacuvajPfmeaCpDokument(supabase, {
          ...azuriran,
          osmdIzvestajId: osmd.id,
          broj8d: osmd.broj_8d || veza8d.broj8d,
        }, korisnik)
        : localSacuvajDokument({
          ...azuriran,
          osmdIzvestajId: osmd.id,
          broj8d: osmd.broj_8d || veza8d.broj8d,
        });
      setDoc(snimljen);
      setFilterTekst(prefill.filterDefekt || "");
      setPodtab("pfmea");
      setSelPfmea(0);
      setSelCp(0);
      const init = inicijalizujFormu(snimljen, "pfmea", snimljen.idDeo || idDeoFilter, 0);
      setFormaIdx(init.formaIdx);
      setFormaRed(init.formaRed);
      setPrljavo(false);
      await osveziListu();
      addToast?.(`✓ Ponovo preneto iz 8D (${prefill.prenetoOpis})`, "uspeh");
    } catch (e) {
      addToast?.(e.message || "Greška pri ponovnom prenosu", "greska");
    } finally {
      setLoading(false);
    }
  };

  const otvoriPovezani8d = () => {
    if (!doc) return;
    const handler = onOtvori8d || onUbaciU8d;
    if (!handler) return;

    if (imaVezu8d) {
      handler({ osmdId: veza8d.osmdId, broj8d: veza8d.broj8d, otvoriPostojeci: true });
      addToast?.("→ Otvoren povezani 8D", "uspeh");
      return;
    }

    const defekt = filterTekst.trim();
    let pRed = pfmeaRedovi[selPfmea];
    let cRed = cpRedovi[selCp];
    if (defekt) {
      const auto = pfmeaCpRefZaDefekt(defekt, { pfmeaRedovi, cpRedovi });
      pRed = auto.pfmeaRed || pRed;
      cRed = auto.cpRed || cRed;
    }
    const refs = pfmeaCpRefIzRedova(pRed, cRed);
    if (!refs.pfmea_ref && !refs.control_plan_ref) {
      addToast?.("Dodajte stavke i označite REF (radio) ili filter defekta", "greska");
      return;
    }
    handler({
      ...refs,
      defekt_nedostatak: defekt || pRed?.mod_greske || cRed?.karakteristika || "",
      id_deo: doc.idDeo || idDeoFilter || "",
      otvoriPostojeci: false,
    });
    addToast?.("→ 8D REF", "uspeh");
  };

  const kreirajNoviDokument = async () => {
    const d = storageMode === "supabase"
      ? await kreirajPfmeaCpDokument(supabase, { idDeo: idDeoFilter, korisnik })
      : localKreirajDokument({ idDeo: idDeoFilter });
    await osveziListu();
    setDoc(d);
    setPrljavo(false);
    setPodtab("pfmea");
    setFormaIdx("new");
    setFormaRed(prazanRed("pfmea", d.idDeo || idDeoFilter));
  };

  const nazadNaListu = async () => {
    if (prljavo && !window.confirm("Imate nesačuvane izmene. Napustiti editor?")) return;
    setDoc(null);
    setPrljavo(false);
    await osveziListu();
  };

  const BTN = (bg, opts = {}) => ({
    fontSize: 10, padding: "7px 12px", cursor: opts.dis ? "not-allowed" : "pointer",
    borderRadius: 6, border: opts.outline ? `1px solid ${bg}` : "none",
    background: opts.outline ? C.hover : bg, color: opts.outline ? bg : "#fff",
    fontWeight: 700, opacity: opts.dis ? 0.5 : 1,
  });
  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", fontFamily: "inherit",
  };

  const filtriraniIndeksi = (redovi) => {
    const q = filterTekst.trim().toLowerCase();
    if (!q) return redovi.map((r, i) => ({ r, i }));
    return redovi.map((r, i) => ({ r, i })).filter(({ r }) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  };

  const renderListaStavki = (tip) => {
    const redovi = tip === "pfmea" ? pfmeaRedovi : cpRedovi;
    const filtrirani = filtriraniIndeksi(redovi);
    const filterAktivan = Boolean(filterTekst.trim());
    const skriveno = filterAktivan ? redovi.length - filtrirani.length : 0;

    return (
      <div id={`${tip}-stavke-lista`} style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          marginBottom: 8,
        }}>
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, letterSpacing: 0.6 }}>
            SAČUVANE STAVKE — {tip === "pfmea" ? "PFMEA" : "CONTROL PLAN"} ({brojStavkiLabel(redovi.length)})
          </div>
          {filterAktivan && (
            <button
              type="button"
              onClick={() => setFilterTekst("")}
              style={{
                background: `${C.narandzasta}22`, border: `1px solid ${C.narandzasta}`,
                borderRadius: 6, color: C.narandzasta, fontSize: 10, fontWeight: 700,
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              ✕ Obriši filter „{filterTekst.trim()}“
              {skriveno > 0 ? ` (${skriveno} skriveno)` : ""}
            </button>
          )}
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
          {tip === "pfmea"
            ? "Klik na stavku otvara formu iznad. Radio = REF za 8D. Obriši uklanja stavku (pa Sačuvaj dokument)."
            : "Klik na stavku otvara formu iznad."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtrirani.map(({ r, i }) => (
            <StavkaRed
              key={`${tip}-${i}-${r.mod_greske || r.karakteristika || i}`}
              red={r}
              tip={tip}
              idx={i}
              izabran={tip === "pfmea" ? selPfmea === i : selCp === i}
              mozeEdit={mozeEdit}
              onIzaberi={() => otvoriUredi(i)}
              onUredi={() => otvoriUredi(i)}
              onObrisi={mozeEdit ? () => obrisiStavkuPoIndeksu(i) : undefined}
              C={C}
            />
          ))}
          {!redovi.length && (
            <div style={{
              color: C.sivi, fontStyle: "italic", padding: 12,
              background: C.hover, borderRadius: 8, border: `1px dashed ${C.border}`,
            }}>
              Još nema stavki — popunite formu ispod i kliknite „Dodaj stavku“.
            </div>
          )}
          {redovi.length > 0 && !filtrirani.length && (
            <div style={{ color: C.narandzasta, fontSize: 11, padding: 12 }}>
              Filter „{filterTekst.trim()}“ ne poklapa nijednu stavku — obrišite filter da vidite sve ({redovi.length}).
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !doc && !prefillIz8d) {
    return <div style={{ padding: 24, color: C.sivi }}>Učitavanje…</div>;
  }

  if (!doc && !prefillIz8d) {
    return (
      <div style={{ padding: 18, maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {storageMode === "local" && (
          <div style={{
            background: `${C.narandzasta}18`, border: `1px solid ${C.narandzasta}55`,
            borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: C.tekst,
          }}>
            <strong>Lokalni režim</strong> — primenite migracije{" "}
            <code>48_pfmea_control_plan.sql</code> i <code>51_pfmea_osmd_veza.sql</code> za Supabase.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            PFMEA / CONTROL PLAN IZVEŠTAJI
          </div>
          {mozeEdit && (
            <button type="button" onClick={kreirajNoviDokument} style={{
              background: C.plava, border: "none", borderRadius: 8, color: "#fff",
              fontSize: 12, fontWeight: 700, padding: "9px 16px", cursor: "pointer",
            }}>
              + Novi PFMEA/CP
            </button>
          )}
        </div>
        {!dokumenti.length ? (
          <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
            Nema sačuvanih PFMEA/CP izveštaja
          </div>
        ) : dokumenti.map((d) => (
          <div
            key={d.id}
            onClick={() => ucitajDoc(d.id)}
            style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 16, marginBottom: 10, cursor: "pointer", transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.plava; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: C.tekst, fontWeight: 700, fontSize: 13 }}>{d.naziv}</span>
                {d.id_deo && <span style={{ color: C.sivi, fontSize: 10 }}>· {d.id_deo}</span>}
                {d.revizija && (
                  <span style={{
                    background: `${C.plava}20`, color: C.plava, fontSize: 9,
                    padding: "2px 8px", borderRadius: 10,
                  }}>
                    Rev. {d.revizija}
                  </span>
                )}
                {(d.broj_8d || d.osmd_izvestaj_id) && (
                  <span style={{
                    background: `${C.zelena}20`, color: C.zelena, fontSize: 9,
                    padding: "2px 8px", borderRadius: 10,
                  }}>
                    8D {d.broj_8d || `#${d.osmd_izvestaj_id}`}
                  </span>
                )}
              </div>
              <span style={{ color: C.border, fontSize: 10 }}>
                {d.updated_at ? new Date(d.updated_at).toLocaleDateString("sr-RS") : "—"}
              </span>
            </div>
            <div style={{ color: C.sivi, fontSize: 11 }}>
              {d.napomena?.substring(0, 80) || "—"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading && !doc) {
    return <div style={{ padding: 24, color: C.sivi }}>Učitavanje…</div>;
  }

  return (
    <div style={{ padding: 16, flex: 1, overflow: "auto", maxWidth: 880, margin: "0 auto" }}>
      {storageMode === "local" && (
        <div style={{
          background: `${C.narandzasta}18`, border: `1px solid ${C.narandzasta}55`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: C.tekst,
        }}>
          <strong>Lokalni režim</strong> — primenite migracije{" "}
          <code>48_pfmea_control_plan.sql</code> za čuvanje u Supabase. Unos radi odmah u browseru.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <button
            type="button"
            onClick={nazadNaListu}
            style={{
              background: "none", border: "none", color: C.plava, fontSize: 11,
              fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 6,
            }}
          >
            ← Nazad na listu
          </button>
          <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>PFMEA / CONTROL PLAN</div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4 }}>
            Popunite formu → <strong>Dodaj/Ažuriraj stavku</strong> → <strong>Sačuvaj dokument</strong>.
            Pri otvaranju dokumenta forma se puni prvom sačuvanom stavkom.
            {imaVezu8d && (
              <span style={{ color: C.zelena }}> · Povezan sa 8D {veza8d.broj8d || `#${veza8d.osmdId}`}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {prljavo && <span style={{ color: C.narandzasta, fontSize: 10 }}>● Nesačuvano</span>}
          {mozeEdit && <button type="button" onClick={sacuvajDokument} style={BTN(C.plava)}>💾 Sačuvaj</button>}
          <button type="button" onClick={() => preuzmiPfmeaCpExcel(exportPayload())} style={BTN(C.zelena, { outline: true })}>Excel</button>
          <button type="button" onClick={() => { exportPfmeaCpPdf(exportPayload()); }} style={BTN(C.zelena, { outline: true })}>PDF</button>
          {(onOtvori8d || onUbaciU8d) && (
            <button
              type="button"
              onClick={otvoriPovezani8d}
              style={BTN(C.crvena, { outline: true })}
            >
              {imaVezu8d ? "→ Otvori 8D" : "→ 8D REF"}
            </button>
          )}
          {imaVezu8d && mozeEdit && (
            <button
              type="button"
              onClick={ponovoPrenesiIz8d}
              disabled={loading}
              style={BTN(C.narandzasta, { outline: true, dis: loading })}
              title="Obriše sve stavke i ponovo prenese 1 PFMEA + 1 CP red iz 8D"
            >
              ↻ Očisti i ponovo iz 8D
            </button>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14,
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10,
      }}>
        <select
          value={doc?.id || ""}
          onChange={(e) => ucitajDoc(storageMode === "supabase" ? Number(e.target.value) : e.target.value)}
          style={{ ...INP, minWidth: 160 }}
        >
          {dokumenti.map((d) => (
            <option key={d.id} value={d.id}>{d.naziv}</option>
          ))}
        </select>
        {mozeEdit && (
          <>
            <input
              value={doc?.naziv || ""}
              onChange={(e) => { setDoc((p) => ({ ...p, naziv: e.target.value })); setPrljavo(true); }}
              placeholder="Naziv dokumenta"
              style={{ ...INP, flex: 1, minWidth: 120 }}
            />
            <input
              value={doc?.idDeo || ""}
              onChange={(e) => { setDoc((p) => ({ ...p, idDeo: e.target.value.toUpperCase() })); setPrljavo(true); }}
              placeholder="ID dela"
              style={{ ...INP, width: 88 }}
            />
            <input
              value={doc?.revizija || ""}
              onChange={(e) => { setDoc((p) => ({ ...p, revizija: e.target.value })); setPrljavo(true); }}
              placeholder="Rev."
              style={{ ...INP, width: 48 }}
            />
            <button
              type="button"
              style={BTN(C.plava, { outline: true })}
              onClick={kreirajNoviDokument}
            >
              + Dok.
            </button>
            <button
              type="button"
              style={BTN(C.sivi, { outline: true })}
              onClick={async () => {
                if (!doc?.id) return;
                const d = storageMode === "supabase"
                  ? await duplirajPfmeaCpDokument(supabase, doc.id, korisnik)
                  : localDuplirajDokument(doc.id);
                await osveziListu();
                setDoc(d);
              }}
            >
              Dupl.
            </button>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PODTABOVI.map(([id, lbl]) => {
          const n = id === "pfmea" ? pfmeaRedovi.length : id === "cp" ? cpRedovi.length : rpnRedovi.length;
          const opis = id === "rpn"
            ? `${lbl} · ${brojStavkiLabel(n)} u pregledu`
            : `${lbl} · ${brojStavkiLabel(n)}`;
          return (
          <button
            key={id}
            type="button"
            onClick={() => setPodtab(id)}
            title={id === "pfmea" || id === "cp"
              ? `Broj sačuvanih stavki u dokumentu`
              : "Broj redova u RPN pregledu (iz PFMEA)"}
            style={{
              ...BTN(podtab === id ? C.plava : C.hover, { outline: podtab !== id }),
              color: podtab === id ? "#fff" : C.tekst,
            }}
          >
            {opis}
          </button>
          );
        })}
        {podtab !== "rpn" && (
        <input
          value={filterTekst}
          onChange={(e) => setFilterTekst(e.target.value)}
          placeholder="Filter stavki (defekt, deo…)"
          title="Filtrira listu PFMEA/CP — ne utiče na RPN Summary"
          style={{ ...INP, marginLeft: "auto", width: 180 }}
        />
        )}
      </div>

      {podtab === "rpn" && (
        <RpnSummaryPregled
          redovi={rpnRedovi}
          C={C}
          praznoPoruka={pfmeaRedovi.length
            ? "Unesite S, O i D (i opciono S/O/D posle) u PFMEA stavkama — RPN se računa automatski."
            : "Nema PFMEA stavki — dodajte ih u tabu PFMEA."}
        />
      )}

      {podtab === "pfmea" && mozeEdit && (
        <PfmeaCpUnosForma
          tip="pfmea"
          grupe={PFMEA_UNOS_GRUPE}
          vrednosti={formaRed}
          onChange={setFormaRed}
          mozeEdit
          C={C}
          naslov={formaIdx === "new" ? "UNOS PFMEA — nova stavka" : `UNOS PFMEA — izmena stavke #${formaIdx + 1}`}
          indeks={formaIdx === "new" ? null : formaIdx}
          onSacuvaj={sacuvajStavku}
          onOtkazi={() => {
            setFormaIdx("new");
            setFormaRed(prazanRed("pfmea", doc?.idDeo || idDeoFilter));
          }}
          onObrisi={typeof formaIdx === "number" ? obrisiStavku : undefined}
        />
      )}

      {podtab === "cp" && mozeEdit && (
        <PfmeaCpUnosForma
          tip="cp"
          grupe={CP_UNOS_GRUPE}
          vrednosti={formaRed}
          onChange={setFormaRed}
          mozeEdit
          C={C}
          naslov={formaIdx === "new" ? "UNOS CONTROL PLAN — nova stavka" : `UNOS CONTROL PLAN — izmena #${formaIdx + 1}`}
          indeks={formaIdx === "new" ? null : formaIdx}
          onSacuvaj={sacuvajStavku}
          onOtkazi={() => {
            setFormaIdx("new");
            setFormaRed(prazanRed("cp", doc?.idDeo || idDeoFilter));
          }}
          onObrisi={typeof formaIdx === "number" ? obrisiStavku : undefined}
        />
      )}

      {podtab === "pfmea" && renderListaStavki("pfmea")}

      {podtab === "cp" && renderListaStavki("cp")}

      {!mozeEdit && podtab !== "rpn" && (
        <div style={{ color: C.sivi, fontSize: 11, padding: 16 }}>
          Unos je dostupan korisnicima u ulozi Kvalitet ili više.
        </div>
      )}
    </div>
  );
}
