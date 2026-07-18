import { memo } from "react";
import {
  koristiUgaoUnosKolone,
  inputModeMerenja,
  proveriOkNok,
  bojaUnosMerenja,
  formatOpsegPlausibilnosti,
  sanitizujInputMerenja,
  tekstNominalaOznaka,
} from "../../lib/varijabilneUtils.js";
import { tekstInstrumentaSaBrojem } from "../../lib/meriloStatus.js";
import { dimKolonaUnos, onFocusTastatura } from "../../layout/index.js";
import FotoNokUnos from "../FotoNokUnos.jsx";
import { metaRed, mobMetaCelija, metaLevoDesno, inpMerenjeBaza } from "./merljiveKolonaUi.jsx";

function KolonaKompletna({ k, K, kompakt, C }) {
  return (
    <div style={{
      width: "100%",
      flexShrink: 0,
      background: `${C.zelena}14`,
      border: `1px solid ${C.zelena}55`,
      borderRadius: K.kartica.borderRadius,
      padding: kompakt ? "10px 8px" : K.inputMerenje.padding,
      minHeight: kompakt ? 40 : K.inputMerenje.minHeight,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginBottom: kompakt ? 0 : K.inputMerenje.marginBottom,
      color: C.zelena,
      fontSize: kompakt ? 11 : 12,
      fontWeight: 700,
      boxSizing: "border-box",
    }}>
      <span>✓</span>
      <span>Kompletno · {k.ukupnoLabel}</span>
    </div>
  );
}

function MerljiveKolonaKartica({
  k,
  i,
  kompakt = false,
  C,
  inp,
  aktivnaKolona,
  setAktivnaKolona,
  koristiTastMerenja,
  tastMerenjaVidljiva,
  setTastMerenjaVidljiva,
  merilaMap,
  inputRefs,
  kolonaJePuna,
  prebaciNaSledecuPraznuKolonu,
  promeniInputMerenja,
  blurInputMerenja,
  keyDownInputMerenja,
  klikDodajMerenje,
  fotoPoPoziciji,
  setFotoPoPoziciji,
  komentarPoPoziciji,
  setKomentarPoPoziciji,
  setPoruka,
}) {
  const K = dimKolonaUnos({ kompakt });
  const inpMerenje = inpMerenjeBaza(inp, kompakt);
  const kolonaPuna = kolonaJePuna(k);

  return (
    <div style={{
      background: C.panel,
      border: kolonaPuna
        ? `2px solid ${C.zelena}`
        : aktivnaKolona === i && k.naziv !== "-"
        ? `${K.kartica.borderAktivna}px solid ${C.zelena}`
        : `${K.kartica.borderObicna}px solid ${C.border}`,
      opacity: kolonaPuna ? 0.92 : 1,
      borderRadius: K.kartica.borderRadius,
      padding: K.kartica.padding,
      boxSizing: "border-box",
      width: "100%",
      height: kompakt ? undefined : "100%",
      flex: kompakt ? undefined : 1,
      minHeight: kompakt ? undefined : 0,
      display: "flex",
      flexDirection: "column",
    }}>
      {k.naziv !== "-" ? (
        <>
          {!kompakt && (
            <>
              {metaRed(C, "Šta se meri", k.naziv, C.plava, K)}
              {tekstNominalaOznaka(k)
                ? metaRed(C, "Nominala / oznaka", tekstNominalaOznaka(k), undefined, K)
                : null}
              {metaRed(C, "Merni instrument", tekstInstrumentaSaBrojem(k.instrument, merilaMap), undefined, K)}
              {k.klasaLabel ? metaRed(C, "Klasa defekta", k.klasaLabel, C.sivi, K) : null}
              {metaRed(C, "Broj merenja", k.ukupnoLabel, C.zuta, K)}
            </>
          )}
          {!kompakt && metaLevoDesno(C, "LSL", k.lslText, "USL", k.uslText, undefined, undefined, K)}
          {!kompakt && k.plausibilnost && (
            <div style={{
              color: C.sivi,
              fontSize: K.plausibilnost.fontSize,
              marginTop: K.plausibilnost.marginTop,
              marginBottom: K.plausibilnost.marginBottom,
              lineHeight: 1.35,
            }}>
              Opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
            </div>
          )}
          {kompakt ? (
            <>
              <div style={{
                background: C.input,
                border: `1px solid ${C.border}`,
                borderRadius: K.kartica.borderRadius,
                padding: "6px 8px",
                marginBottom: 4,
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {mobMetaCelija(C, "Šta se meri", k.naziv, C.plava, "left", K)}
                  {mobMetaCelija(C, "Broj merenja", k.ukupnoLabel, C.zuta, "center", K)}
                  {mobMetaCelija(C, "Merni instrument", tekstInstrumentaSaBrojem(k.instrument, merilaMap), undefined, "right", K)}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {mobMetaCelija(C, "LSL", k.lslText, undefined, "left", K)}
                  {mobMetaCelija(C, "Nominala / oznaka", tekstNominalaOznaka(k) || "—", undefined, "center", K)}
                  {mobMetaCelija(C, "USL", k.uslText, undefined, "right", K)}
                </div>
                {kolonaPuna ? <KolonaKompletna k={k} K={K} kompakt C={C} /> : (
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    readOnly={koristiTastMerenja}
                    inputMode={koristiTastMerenja ? "none" : inputModeMerenja(k)}
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      ...inpMerenje,
                      width: "100%",
                      marginBottom: 0,
                      background: bojaUnosMerenja(k.input, k.lslDec, k.uslDec, k.nominalDec, k.jedinica, C),
                      outline: aktivnaKolona === i ? `2px solid ${C.zelena}55` : "none",
                      border: `1px solid ${C.border}`,
                      cursor: koristiTastMerenja ? "pointer" : undefined,
                    }}
                    value={k.input}
                    onFocus={(e) => {
                      if (kolonaJePuna(k)) {
                        e.target.blur();
                        prebaciNaSledecuPraznuKolonu(i + 1);
                        return;
                      }
                      if (!koristiTastMerenja) onFocusTastatura(e);
                      setAktivnaKolona(i);
                      if (koristiTastMerenja) setTastMerenjaVidljiva(true);
                    }}
                    onChange={koristiTastMerenja
                      ? undefined
                      : (e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k))}
                    onBlur={() => {
                      if (koristiTastMerenja) setTastMerenjaVidljiva(false);
                      blurInputMerenja(i);
                    }}
                    onKeyDown={koristiTastMerenja ? undefined : (e => keyDownInputMerenja(e, i, k))}
                    placeholder={koristiUgaoUnosKolone(k)
                      ? "440000 = 44°00′00″"
                      : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
                  />
                )}
              </div>
              {k.plausibilnost && !kolonaPuna && (
                <div style={{
                  color: C.sivi,
                  fontSize: K.plausibilnost.fontSize,
                  marginTop: 1,
                  marginBottom: 3,
                  lineHeight: 1.3,
                }}>
                  Opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
                </div>
              )}
              {!kolonaPuna && !(koristiTastMerenja && tastMerenjaVidljiva && aktivnaKolona === i) && (
              <button type="button" onClick={() => klikDodajMerenje(i)}
                style={{
                  width: K.dugmeDodaj.width,
                  background: C.plava,
                  border: "none",
                  borderRadius: K.dugmeDodaj.borderRadius,
                  color: C.onAkcent,
                  padding: K.dugmeDodaj.padding,
                  minHeight: K.dugmeDodaj.minHeight,
                  cursor: "pointer",
                  fontSize: K.dugmeDodaj.fontSize,
                  fontWeight: K.dugmeDodaj.fontWeight,
                  marginBottom: K.dugmeDodaj.marginBottom,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}>
                + Dodaj
              </button>
              )}
            </>
          ) : (
            <>
              <div style={{
                color: C.border,
                fontSize: K.labelUnos.fontSize,
                textTransform: "uppercase",
                letterSpacing: K.labelUnos.letterSpacing,
                marginTop: K.labelUnos.marginTop,
                marginBottom: K.labelUnos.marginBottom,
                flexShrink: 0,
              }}>
                Unos merenja
              </div>
              {kolonaPuna ? <KolonaKompletna k={k} K={K} kompakt={false} C={C} /> : (
                <input
                  ref={el => { inputRefs.current[i] = el; }}
                  style={{
                    ...inpMerenje,
                    marginBottom: K.inputMerenje.marginBottom,
                    flexShrink: 0,
                    width: "100%",
                    background: bojaUnosMerenja(k.input, k.lslDec, k.uslDec, k.nominalDec, k.jedinica, C),
                    outline: aktivnaKolona === i ? `2px solid ${C.zelena}55` : "none",
                  }}
                  value={k.input}
                  onFocus={() => {
                    if (kolonaJePuna(k)) {
                      prebaciNaSledecuPraznuKolonu(i + 1);
                      return;
                    }
                    setAktivnaKolona(i);
                    if (koristiTastMerenja) setTastMerenjaVidljiva(true);
                  }}
                  onChange={e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k)}
                  onBlur={() => {
                    if (koristiTastMerenja) setTastMerenjaVidljiva(false);
                    blurInputMerenja(i);
                  }}
                  onKeyDown={e => keyDownInputMerenja(e, i, k)}
                  title={k.plausibilnost
                    ? `Dozvoljen opseg: ${formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}`
                    : undefined}
                  placeholder={koristiUgaoUnosKolone(k)
                    ? "440000 = 44°00′00″"
                    : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
                />
              )}
              {!kolonaPuna && !(koristiTastMerenja && tastMerenjaVidljiva && aktivnaKolona === i) && (
              <button type="button" onClick={() => klikDodajMerenje(i)}
                style={{
                  width: K.dugmeDodaj.width,
                  background: C.plava,
                  border: "none",
                  borderRadius: K.dugmeDodaj.borderRadius,
                  color: C.onAkcent,
                  padding: K.dugmeDodaj.padding,
                  minHeight: K.dugmeDodaj.minHeight,
                  cursor: "pointer",
                  fontSize: K.dugmeDodaj.fontSize,
                  fontWeight: K.dugmeDodaj.fontWeight,
                  marginBottom: K.dugmeDodaj.marginBottom,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}>
                + Dodaj
              </button>
              )}
            </>
          )}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: K.okNok.gap,
            marginBottom: K.okNok.marginBottom,
            flexShrink: 0,
          }}>
            {[["NOK", k.cntNOK, C.crvena], ["OK", k.cntOK, C.zelena]].map(([lblOk, br, boja]) => (
              <div key={lblOk} style={{
                background: `${boja}14`,
                border: `1px solid ${boja}40`,
                borderRadius: K.okNok.borderRadius,
                padding: K.okNok.padding,
                textAlign: "center",
                minHeight: K.okNok.minHeight,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}>
                <span style={{ color: C.border, fontSize: K.okNok.labelFont, letterSpacing: 0.8, marginBottom: 2 }}>{lblOk}</span>
                <span style={{
                  color: boja, fontSize: K.okNok.brojFont, fontWeight: 800, lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {br ?? 0}
                </span>
              </div>
            ))}
          </div>
          <FotoNokUnos
            C={C}
            kompakt
            foto={fotoPoPoziciji[k.naziv] || null}
            komentar={komentarPoPoziciji[k.naziv] || ""}
            onFoto={url => setFotoPoPoziciji(p => {
              const next = { ...p };
              if (url) next[k.naziv] = url;
              else delete next[k.naziv];
              return next;
            })}
            onKomentar={t => setKomentarPoPoziciji(p => ({ ...p, [k.naziv]: t }))}
            onGreska={m => setPoruka(m)}
          />
          <div style={{
            color: C.border,
            fontSize: K.lista.labelFont,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: K.lista.marginBottom,
            flexShrink: 0,
          }}>
            Lista merenja
          </div>
          <ul style={{
            listStyle: "none", padding: 0, margin: 0, flex: 1,
            minHeight: K.lista.minHeight,
            maxHeight: K.lista.maxHeight ?? undefined,
            overflow: "auto",
            fontSize: K.lista.fontSize,
            fontVariantNumeric: "tabular-nums",
          }}>
            {k.merenja.map((m, j) => (
              <li key={j} style={{
                padding: K.lista.itemPadding,
                marginBottom: 1,
                borderRadius: 3,
                background: proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica) === "OK"
                  ? `${C.zelena}12` : `${C.crvena}12`,
                color: proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica) === "OK" ? C.zelena : C.crvena,
                fontWeight: 600,
              }}>
                {m.raw}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div style={{ color: C.border, fontSize: 11, textAlign: "center", margin: "auto" }}>—</div>
      )}
    </div>
  );
}

export default memo(MerljiveKolonaKartica);
