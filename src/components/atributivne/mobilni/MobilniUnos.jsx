import { useState, useEffect, useMemo } from "react";
import UnosPokaYokeKorak from "../../UnosPokaYokeKorak.jsx";
import AtrCrtezPregled from "../../AtrCrtezPregled.jsx";
import SmenaIdUnosRed from "../../SmenaIdUnosRed.jsx";
import PogonIzborPanel from "../../PogonIzborPanel.jsx";
import VoziloZonaNav from "../../VoziloZonaNav.jsx";
import LinijaWizardNav, { KORACI_ATRIB_LINIJA, KORACI_ATRIB_KONTROLOR } from "../../LinijaWizardNav.jsx";
import LinijaDonjaTraka, { DugmeTraka } from "../../LinijaDonjaTraka.jsx";
import IdDeoBarkodRed from "../../IdDeoBarkodRed.jsx";
import SmenaAutoPrikaz from "../../SmenaAutoPrikaz.jsx";
import SkartDoradaOeePanel from "../../SkartDoradaOeePanel.jsx";
import { useEkran } from "../../../lib/useEkran.js";
import { stilOmotLinija, onFocusTastatura } from "../../../layout/tastaturaMobil.js";
import { dp } from "../../../layout/dp.js";
import { TELEFON } from "../../../layout/tokens/telefon.js";
import { TABLET } from "../../../layout/tokens/tablet.js";
import { useVoziloDijagramSrc } from "../../../lib/useVoziloDijagramSrc.js";
import { idBarkodInputHandleri } from "../../../lib/barkod.js";
import { mozeAdminLokalno as mozeAdmin } from "../../../lib/atributivneUnosHelper.js";
import { labelPogona } from "../../../lib/pogonSop.js";
import { UnosCiljBanner, UnosAqlPanel } from "../UnosAqlBlok.jsx";

function MobilniUnos({
  linijaMode = false,
  kontrolorLinija = false,
  smena = 1,
  radniNalog = "",
  setRadniNalog,
  unosKorakAtr,
  setUnosKorakAtr,
  korisnikIme,
  idDeo, setIdDeo, deoInfo, upoz,
  dostupniPogoni = [],
  omoguceniPogoni = null,
  pogonKod = "",
  onPogonChange,
  trebaIzborPogona = false,
  porukaPogon = "",
  deoSpreman = false,
  nalogInfo = null,
  predloziDelova = [],
  linijaNaziv, masinaNaziv, prikaziLokaciju = true,
  status, setStatus,
  kategorija, setKategorija,
  podkat, setPodkat,
  defekt, setDefekt,
  kolicina, setKolicina,
  greskeKat,
  defektiMap,
  koristiDefekte,
  voziloMode = false,
  voziloZona = null,
  onVoziloZonaChange,
  listaG, setListaG,
  listaP, setListaP,
  preostalo, cilj,
  prekidOdobrenId, onZahtevPrekid, korisnik,
  smenaOK, smenaNOK, smenaTotal,
  lotVelicina, lotIzvor = "rucno", onLotVelicinaChange, onOtvoriAqlTab,
  dodajGresku, snimiDeo, zapisi,
  noviNalog, saving, online, offlineQueueTotal, C,
  kpiSerija, setKpiSerija,
  kontrolnaListaOk = true,
  idRef,
  onBarkodSken,
}) {
  const ekran = useEkran();
  const { url: voziloDijagramSrc, loading: voziloDijagramUcitava } = useVoziloDijagramSrc(deoInfo);
  const [korak, setKorak] = useState(1);
  const ukupnoKoraka = 4;
  const korakPoka = 2;
  const korakUnos = 3;
  const korakLista = 4;
  const wizardKoraci = kontrolorLinija ? KORACI_ATRIB_KONTROLOR : KORACI_ATRIB_LINIJA;

  const idBarkodPolje = useMemo(
    () => (onBarkodSken
      ? idBarkodInputHandleri(onBarkodSken, { postaviId: setIdDeo, upperCase: true })
      : { onChange: (e) => setIdDeo(e.target.value.toUpperCase()) }),
    [onBarkodSken, setIdDeo],
  );

  useEffect(() => { if (idDeo.length < 3) setKorak(1); }, [idDeo]);

  // Sync mobilni korak sa unosKorakAtr — posle checkliste / učitanog dela ide na poka-yoke
  useEffect(() => {
    if (!kontrolnaListaOk || !deoSpreman) return;
    if (unosKorakAtr === "forma") setKorak(korakUnos);
    else if (unosKorakAtr === "poka") setKorak(korakPoka);
  }, [kontrolnaListaOk, deoSpreman, unosKorakAtr, korakPoka, korakUnos]);

  const korakWizardId = linijaMode
    ? (korak === 1 ? "id" : korak === 2 ? "poka" : korak === 3 ? "unos" : kontrolorLinija ? "snimi" : "lista")
    : null;

  const analitikaKompakt = !linijaMode && (ekran.mob || ekran.tablet);
  const prikaziCrtezMob = ekran.mob || ekran.tablet || ekran.linijaUredjaj;
  const unosIdKompakt = analitikaKompakt || (linijaMode && prikaziCrtezMob);
  const analitikaInpStil = {
    borderRadius: unosIdKompakt && linijaMode ? 12 : 10,
    padding: linijaMode && ekran.linijaUredjaj
      ? "18px 12px"
      : ekran.tablet ? "10px 8px" : "8px 6px",
    fontSize: linijaMode && ekran.linijaUredjaj
      ? 22
      : ekran.tablet ? 16 : 14,
  };
  const analitikaSirine = {
    smena: ekran.tablet || ekran.linijaUredjaj ? 52 : 44,
    barkod: ekran.tablet || ekran.linijaUredjaj ? 44 : 36,
    crtez: ekran.tablet || ekran.linijaUredjaj ? 44 : 36,
  };

  const predloziDelovaUi = linijaMode && predloziDelova.length > 0 && !deoSpreman ? (
    <div data-testid="atr-predlozi-dela" style={{ marginBottom: 10 }}>
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6, letterSpacing: 0.8 }}>
        DELOVI NA OVOJ LINIJI / POGONU
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {predloziDelova.slice(0, 12).map((d) => (
          <button
            key={d.id_deo}
            type="button"
            data-testid={`atr-predlog-${d.id_deo}`}
            onClick={() => setIdDeo(d.id_deo)}
            style={{
              background: `${C.plava}18`,
              border: `1px solid ${C.plava}55`,
              borderRadius: 8,
              color: C.plava,
              fontSize: linijaMode && ekran.linijaUredjaj ? 12 : 10,
              fontWeight: 700,
              padding: "8px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {d.id_deo}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const datalistDelova = predloziDelova.length ? (
    <datalist id="atr-dela-linija">
      {predloziDelova.map((d) => (
        <option key={d.id_deo} value={d.id_deo}>{d.naziv_dela}</option>
      ))}
    </datalist>
  ) : null;

  const analitikaUnosRed = ({ autoFocus = false, bezRef = false } = {}) => (
    <SmenaIdUnosRed
      C={C}
      akcent={C.plava}
      smena={String(smena)}
      onBarkodSken={onBarkodSken}
      lblStyle={{ fontSize: ekran.tablet || ekran.linijaUredjaj ? 10 : 9, marginBottom: 2 }}
      inpStyle={analitikaInpStil}
      sirinaSmena={analitikaSirine.smena}
      sirinaBarkod={analitikaSirine.barkod}
      sirinaCrtez={analitikaSirine.crtez}
      prikaziCrtez={false}
      idLabel="ID deo"
    >
      <input
        ref={bezRef ? undefined : idRef}
        data-testid="atr-id-deo"
        value={idDeo}
        {...idBarkodPolje}
        onFocus={onFocusTastatura}
        placeholder="5501-A"
        list={predloziDelova.length ? "atr-dela-linija" : undefined}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.input,
          border: `1px solid ${deoSpreman ? C.zelena : idDeo.length > 2 ? C.crvena : C.border}`,
          color: C.tekst,
          outline: "none",
          fontFamily: "inherit",
          fontWeight: 700,
          letterSpacing: 1,
          textAlign: "center",
          ...analitikaInpStil,
        }}
      />
      {datalistDelova}
    </SmenaIdUnosRed>
  );

  const INP = {
    width:"100%", background:C.input, border:`1px solid ${C.border}`,
    borderRadius: linijaMode ? 12 : 10, color:C.tekst,
    fontSize: linijaMode && ekran.linijaUredjaj ? 18 : 16,
    padding: linijaMode ? "16px 14px" : "14px",
    boxSizing:"border-box", outline:"none", fontFamily:"inherit",
  };
  const BIG_BTN = (bg, dis=false) => ({
    background:dis?C.hover:bg, border:"none", borderRadius: linijaMode ? 14 : 12,
    color:dis?C.sivi: C.onAkcent, fontSize: linijaMode ? 18 : 16, fontWeight:700,
    padding: linijaMode ? "20px" : "18px", cursor:dis?"not-allowed":"pointer",
    width:"100%", opacity:dis?0.5:1,
  });
  const LBL = {
    color:C.sivi, fontSize: linijaMode ? 12 : 11,
    letterSpacing:1.3, marginBottom:8, display:"block",
  };

  const progresBar = (trenutni) => (
    <div style={{display:"flex", gap:5}}>
      {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
        <div key={k} style={{flex:1, height: linijaMode ? 5 : 4, borderRadius:2,
          background: k <= trenutni ? C.plava : C.hover}}/>
      ))}
    </div>
  );

  const omot = (children, trenutni, naslov) => (
    <div style={linijaMode ? {
      ...stilOmotLinija(ekran, { skrol: true }),
      background: C.bg,
    } : {
      padding: unosIdKompakt ? "10px 12px 80px" : "16px 16px 100px",
      display: "flex",
      flexDirection: "column",
      gap: unosIdKompakt ? 8 : 16,
      minHeight: "calc(100dvh - 89px)",
      background: C.bg,
      boxSizing: "border-box",
    }}>
      {linijaMode && (
        <LinijaWizardNav
          korak={korakWizardId}
          koraci={wizardKoraci}
          C={C}
          akcent={C.plava}
          kompakt
        />
      )}
      {!linijaMode && progresBar(trenutni)}
      {!linijaMode && (
        <div style={{color:C.sivi, fontSize:11, textAlign:"center", letterSpacing:1}}>
          {naslov}
        </div>
      )}
      {children}
    </div>
  );

  // ─ Korak 1: ID dela ─────────────────────────────────────
  if (korak === 1) return omot(
    <>
      {predloziDelovaUi}
      {unosIdKompakt ? analitikaUnosRed({ autoFocus: true }) : (
        <>
          <IdDeoBarkodRed
            C={C}
            akcent={C.plava}
            onBarkodSken={onBarkodSken}
            lblStyle={LBL}
            idLabel="ID deo"
            kompaktRed
            sirinaBarkod={linijaMode ? 52 : 44}
            unosStil={{ borderRadius: linijaMode ? 12 : 10, padding: "22px 14px", fontSize: 28 }}
          >
            <input
              ref={idRef}
              value={idDeo}
              {...idBarkodPolje}
              onFocus={onFocusTastatura}
              placeholder="npr. 5501-A"
              list={predloziDelova.length ? "atr-dela-linija" : undefined}
              autoFocus
              style={{
                ...INP,
                width: "100%",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 4,
                textAlign: "center",
                padding: "22px 14px",
                borderColor: deoSpreman ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
                background: deoSpreman ? C.ok : idDeo.length > 2 ? C.nok : C.input,
              }}
            />
          </IdDeoBarkodRed>
          {datalistDelova}

          <SmenaAutoPrikaz
            smena={smena}
            C={C}
            lblStyle={LBL}
            inpStyle={{ ...INP, fontSize: linijaMode ? 16 : 14, padding: linijaMode ? "14px" : "12px" }}
          />
        </>
      )}

      <label style={LBL}>Radni nalog
        <input
          value={radniNalog}
          onChange={e => setRadniNalog?.(e.target.value.toUpperCase())}
          onFocus={onFocusTastatura}
          placeholder="RN-2026-NM001-B"
          style={{
            ...INP,
            fontSize: linijaMode ? 16 : 14,
            padding: linijaMode ? "14px" : "12px",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        />
      </label>

      {(nalogInfo?.kupac || nalogInfo?.rok_isporuke) && (
        <div style={{
          color: C.sivi,
          fontSize: unosIdKompakt ? 10 : 11,
          lineHeight: 1.4,
          padding: "4px 2px",
        }}>
          {nalogInfo.kupac && <span>Kupac: <strong style={{ color: C.tekst }}>{nalogInfo.kupac}</strong></span>}
          {nalogInfo.kupac && nalogInfo.rok_isporuke && " · "}
          {nalogInfo.rok_isporuke && (
            <span>Rok isporuke: <strong style={{ color: C.tekst }}>{nalogInfo.rok_isporuke}</strong></span>
          )}
        </div>
      )}

      {dostupniPogoni.length > 1 && (
        <PogonIzborPanel
          C={C}
          akcent={C.plava}
          pogoni={dostupniPogoni}
          omoguceniPogoni={omoguceniPogoni}
          pogonKod={pogonKod}
          onIzaberi={onPogonChange}
          obavezan={trebaIzborPogona}
        />
      )}
      {porukaPogon && (
        <div style={{
          color: C.zuta,
          fontSize: unosIdKompakt ? 11 : 12,
          padding: unosIdKompakt ? "8px 10px" : "10px 12px",
          background: `${C.zuta}18`,
          borderRadius: 8,
          lineHeight: 1.5,
        }}>
          {porukaPogon}
        </div>
      )}

      {deoSpreman ? (
        <div style={{
          background: C.ok,
          border: `1px solid ${C.zelena}30`,
          borderRadius: unosIdKompakt ? 10 : 14,
          padding: unosIdKompakt ? 10 : 16,
        }}>
          <div style={{ color: C.zelena, fontWeight: 700, fontSize: unosIdKompakt ? 14 : 18, marginBottom: unosIdKompakt ? 6 : 12 }}>
            ✓ {deoInfo?.naziv_dela || idDeo}
            {pogonKod && prikaziLokaciju && (
              <span style={{ color: C.plava, marginLeft: 8, fontSize: unosIdKompakt ? 11 : 13 }}>
                {labelPogona(pogonKod)}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: unosIdKompakt ? 6 : 8 }}>
            {[
              ...(prikaziLokaciju ? [["Linija", linijaNaziv], ["Mašina", masinaNaziv]] : []),
              ["Kontrola", voziloMode ? "Završna kontrola" : (deoInfo?.karakteristika || "-")],
              ["Napomena", voziloMode ? "F — Završna kontrola" : (deoInfo?.napomena || "-")],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.panel, borderRadius: 8, padding: unosIdKompakt ? "6px 8px" : "10px 12px" }}>
                <div style={{ color: C.sivi, fontSize: unosIdKompakt ? 9 : 10, marginBottom: 2 }}>{l}</div>
                <div style={{ color: C.tekst, fontSize: unosIdKompakt ? 12 : 14, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: unosIdKompakt ? 8 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              fontSize: unosIdKompakt ? 10 : 11, color: C.sivi, marginBottom: 4 }}>
              <span>Preostalo</span>
              <span style={{ color: preostalo === 0 ? C.zelena : C.zuta, fontWeight: 700 }}>
                {preostalo} / {cilj}
              </span>
            </div>
            <div style={{ background: C.hover, borderRadius: 4, height: unosIdKompakt ? 6 : 8 }}>
              <div style={{
                background: preostalo === 0 ? C.zelena : C.plava,
                width: `${cilj > 0 ? (cilj - preostalo) / cilj * 100 : 0}%`,
                height: unosIdKompakt ? 6 : 8,
                borderRadius: 4,
                transition: "width 0.4s",
              }}/>
            </div>
          </div>
        </div>
      ) : null}

      {deoInfo && prikaziCrtezMob && (
        <AtrCrtezPregled
          slikaNaziv={deoInfo.slika_naziv}
          idDeo={String(idDeo || "").toUpperCase()}
          C={C}
          kompakt
          visina={ekran.tablet
            ? dp(TABLET.crtezVisinaDno, ekran)
            : dp(TELEFON.crtezVisinaDno, ekran)}
        />
      )}

      {upoz && (
        <div style={{ color: C.crvena, fontSize: unosIdKompakt ? 11 : 12, padding: unosIdKompakt ? "8px 10px" : "10px 12px",
          background: C.nok, borderRadius: 8, lineHeight: 1.5 }}>{upoz}</div>
      )}
      <UnosCiljBanner idDeo={idDeo} listaP={listaP} C={C}/>

      {!linijaMode && (
      <UnosAqlPanel
        lotVelicina={lotVelicina}
        lotIzvor={lotIzvor}
        radniNalog={radniNalog}
        idDeo={idDeo}
        onLotVelicinaChange={onLotVelicinaChange}
        onOtvoriAqlTab={onOtvoriAqlTab}
        listaG={listaG}
        listaP={listaP}
        C={C}
        kompakt={unosIdKompakt}
      />
      )}

      <div style={{flex:1}}/>

      <button onClick={()=>setKorak(korakPoka)} disabled={!deoSpreman}
        style={{...BIG_BTN(C.plava,!deoSpreman), fontSize:18}}>
        Poka-yoke →
      </button>
      <button onClick={noviNalog}
        style={{background:"none", border:`1px solid ${C.border}`, borderRadius:10,
          color:C.sivi, fontSize:14, padding:"14px", cursor:"pointer", width:"100%"}}>
        ↺ Novi nalog
      </button>
    </>,
    1,
    `KORAK 1 / ${ukupnoKoraka} — ID DELA`,
  );

  // ─ Korak 2: Poka-yoke ────────────────────────────────────
  if (korak === korakPoka) return omot(
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <UnosPokaYokeKorak
        C={C}
        modul="atributivne"
        akcent={C.plava}
        idDeo={String(idDeo || "").toUpperCase()}
        nazivDela={deoInfo?.naziv_dela}
        radniNalog={radniNalog}
        linija={linijaNaziv}
        masina={masinaNaziv}
        kontrolor={korisnikIme}
        kontrolnaListaOk={kontrolnaListaOk}
        onDalje={() => { setUnosKorakAtr?.("forma"); setKorak(korakUnos); }}
        daljeLabel="Unos OK/NOK →"
      />
    </div>,
    korakPoka,
    "POKA-YOKE",
  );

  // ─ Unos greške ───────────────────────────────────────────
  if (korak === korakUnos) {
    const dodajDis = !status || (status === "NOK" && (
      voziloMode && !voziloZona || !kategorija || !podkat || (koristiDefekte && !defekt)
    ));
    const dodajUGresku = () => {
      const bioOk = status === "OK";
      dodajGresku();
      if (!bioOk) setKorak(korakLista);
    };
    const bojaDodaj = status === "OK" ? C.zelena : status === "NOK" ? C.crvena : C.hover;
    const labelDodaj = status === "OK" ? "✓ Snimi OK" : "+ Dodaj u listu";

    return (
    <>
    <div style={linijaMode ? {
      ...stilOmotLinija(ekran, { skrol: true }),
      gap: 14,
      background: C.bg,
      paddingBottom: 96,
    } : {
      padding: "16px 16px 100px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: "calc(100dvh - 89px)",
      background: C.bg,
      boxSizing: "border-box",
    }}>

      {linijaMode && (
        <LinijaWizardNav korak="unos" koraci={wizardKoraci} C={C} akcent={C.plava} kompakt />
      )}

      {analitikaKompakt && deoInfo && analitikaUnosRed({ bezRef: true })}

      {/* Progres + navigacija */}
      {!linijaMode && (
      <div style={{display:"flex", gap:5}}>
        {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
          <div key={k} style={{flex:1,height:4,borderRadius:2,background:k<=korak?C.plava:C.hover}}/>
        ))}
      </div>
      )}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(korakPoka)} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>
          KORAK {korakUnos} / {ukupnoKoraka}
        </span>
        <span style={{color:C.zelena,fontWeight:700,fontSize:13}}>{idDeo}</span>
      </div>

      {voziloMode && onVoziloZonaChange && (
        <div style={{ marginBottom: 4 }}>
          <VoziloZonaNav
            izabranaZona={voziloZona}
            onZonaChange={onVoziloZonaChange}
            diagramSrc={voziloDijagramSrc}
            diagramLoading={voziloDijagramUcitava}
            velicina="veliki"
            C={C}
          />
        </div>
      )}

      {/* STATUS — ogromna dugmad */}
      <div>
        <label style={LBL}>STATUS</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {["OK","NOK"].map(s => (
            <button key={s} onClick={()=>{setStatus(s); if(s==="OK"){setKategorija("");setPodkat("");setDefekt("");}}}
              style={{
                background: status===s?(s==="OK"?C.zelena:C.crvena):"none",
                border:`2px solid ${status===s?(s==="OK"?C.zelena:C.crvena):C.border}`,
                borderRadius:14, color:status===s? C.onAkcent:C.sivi,
                fontSize:22, fontWeight:700, padding:"22px 0", cursor:"pointer",
                transition:"all 0.2s",
              }}>
              {s==="OK" ? "✓ OK" : "✗ NOK"}
            </button>
          ))}
        </div>
      </div>

      {/* KOLIČINA — +/- stepper */}
      <div>
        <label style={LBL}>KOLIČINA</label>
        <div style={{display:"flex", alignItems:"stretch", border:`1px solid ${C.border}`,
          borderRadius:12, overflow:"hidden", height:60}}>
          <button onClick={()=>setKolicina(k=>Math.max(1,k-1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>−</button>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,fontWeight:700,color:C.tekst,background:C.input}}>{kolicina}</div>
          <button onClick={()=>setKolicina(k=>Math.min(50,k+1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>+</button>
        </div>
      </div>

      {/* KATEGORIJA — lista dugmadi, samo za NOK */}
      {status==="NOK" && (
        <div>
          <label style={LBL}>KATEGORIJA GREŠKE</label>
          {voziloMode && !voziloZona ? (
            <div style={{background:C.hover,border:`1px dashed ${C.border}`,borderRadius:10,
              padding:"14px 16px",color:C.sivi,fontSize:13,textAlign:"center"}}>
              Prvo izaberi zonu na dijagramu vozila
            </div>
          ) : (
          <div style={{display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto"}}>
            {Object.keys(greskeKat).map(k => (
              <button key={k} onClick={()=>{setKategorija(k);setPodkat("");setDefekt("");}}
                style={{
                  background:kategorija===k?`${C.crvena}18`:C.panel,
                  border:`1px solid ${kategorija===k?C.crvena:C.border}`,
                  borderRadius:10, color:kategorija===k?C.crvena:C.tekst,
                  fontSize:15, fontWeight:kategorija===k?700:400,
                  padding:"14px 16px", cursor:"pointer", textAlign:"left",
                  transition:"all 0.15s",
                }}>{k}</button>
            ))}
          </div>
          )}
        </div>
      )}

      {/* PODKATEGORIJA — chip-ovi */}
      {status==="NOK" && kategorija && (
        <div>
          <label style={LBL}>PODKATEGORIJA</label>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {(greskeKat[kategorija]||[]).map(p => (
              <button key={p} onClick={()=>{setPodkat(p);setDefekt("");}}
                style={{
                  background:podkat===p?C.crvena:"none",
                  border:`1px solid ${podkat===p?C.crvena:C.border}`,
                  borderRadius:20, color:podkat===p? C.onAkcent:C.tekst,
                  fontSize:13, padding:"9px 16px", cursor:"pointer",
                  transition:"all 0.15s",
                }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {status==="NOK" && kategorija && podkat && (
        <div style={{opacity:koristiDefekte?1:0.45}}>
          <label style={LBL}>
            DEFEKT
            {!koristiDefekte && (
              <span style={{fontWeight:400, marginLeft:6}}>(samo kontrola celog vozila)</span>
            )}
          </label>
          {koristiDefekte ? (
            <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
              {(((defektiMap[kategorija]||{})[podkat])||[]).map(d => (
                <button key={d} onClick={()=>setDefekt(d)}
                  style={{
                    background:defekt===d?C.crvena:"none",
                    border:`1px solid ${defekt===d?C.crvena:C.border}`,
                    borderRadius:20, color:defekt===d? C.onAkcent:C.tekst,
                    fontSize:13, padding:"9px 16px", cursor:"pointer",
                    transition:"all 0.15s",
                  }}>{d}</button>
              ))}
            </div>
          ) : (
            <div style={{background:C.hover,border:`1px dashed ${C.border}`,borderRadius:10,
              padding:"14px 16px",color:C.sivi,fontSize:13,textAlign:"center"}}>
              Za pojedinačne delove koristi samo kategoriju i podkategoriju
            </div>
          )}
        </div>
      )}

      {!linijaMode && <div style={{ flex: 1 }} />}

      {!linijaMode && (
        <button
          onClick={dodajUGresku}
          disabled={dodajDis}
          style={{ ...BIG_BTN(bojaDodaj, dodajDis), fontSize: 17 }}>
          {labelDodaj}
        </button>
      )}
    </div>
    {linijaMode && (
      <LinijaDonjaTraka ekran={ekran} C={C} rezerva={false}>
        <DugmeTraka C={C} boja={bojaDodaj} onClick={dodajUGresku} disabled={dodajDis}>
          {labelDodaj}
        </DugmeTraka>
      </LinijaDonjaTraka>
    )}
    </>
    );
  }

  // ─ Lista + snimi ─────────────────────────────────────────
  if (korak !== korakLista) {
    return omot(
      <div style={{ padding: 24, textAlign: "center", color: C.sivi }}>
        <p style={{ marginBottom: 16, lineHeight: 1.5 }}>Nepoznat korak — vraćam na unos ID dela.</p>
        <button type="button" onClick={() => setKorak(1)} style={{ ...BIG_BTN(C.plava), width: "auto", padding: "14px 24px" }}>
          Početak
        </button>
      </div>,
      1,
      "UNOS",
    );
  }

  const dugmeZapisiGore = listaP.length > 0 && (
    <div style={{ display: "flex", justifyContent: "flex-end", position: "sticky", top: 0, zIndex: 10, marginBottom: 2 }}>
      <button onClick={zapisi} disabled={saving}
        style={{
          ...BIG_BTN("#7c3aed", saving),
          width: "auto",
          fontSize: 14,
          padding: "12px 18px",
          boxShadow: `0 0 14px #7c3aed45`,
        }}>
        {saving ? "Snimanje..." : `💾 Zapiši (${listaP.length})`}
      </button>
    </div>
  );

  return linijaMode ? omot(
    <>
      {dugmeZapisiGore}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[
          ["OK",    listaG.filter(s=>s.status==="OK").reduce((s,d)=>s+d.kolicina,0),  C.zelena],
          ["NOK",   listaG.filter(s=>s.status==="NOK").reduce((s,d)=>s+d.kolicina,0), C.crvena],
          ["STAVKI",listaG.length,                                                      C.plava],
        ].map(([l,v,b]) => (
          <div key={l} style={{background:C.panel,border:`1px solid ${b}25`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Lista stavki */}
      <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:12,
        overflow:"auto", maxHeight:320}}>
        {!listaG.length ? (
          <div style={{padding:28,textAlign:"center",color:C.border,fontSize:13}}>
            Lista je prazna — idi na Korak 2
          </div>
        ) : listaG.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
            <div style={{flex:1}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                {s.foto && <span style={{fontSize:14}}>📷</span>}
                <span style={{color:s.status==="OK"?C.zelena:C.crvena,
                  fontWeight:700,fontSize:16}}>
                  {s.status} ×{s.kolicina}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:12}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</div>
            </div>
            <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                color:C.crvena,fontSize:20,padding:"8px 14px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>

      {/* Snimi deo */}
      <button onClick={snimiDeo} disabled={!listaG.length}
        style={{...BIG_BTN(C.zelena,!listaG.length), fontSize:17,
          boxShadow:listaG.length?`0 0 20px ${C.zelena}40`:"none"}}>
        ✓ Snimi deo
      </button>

      {listaP.length > 0 && (
        <div style={{background:C.ok,border:`1px solid ${C.zelena}40`,borderRadius:10,
          padding:"10px 14px",fontSize:12,color:C.zelena,textAlign:"center"}}>
          ✓ {listaP.length} stavki spremno za zapis u bazu
        </div>
      )}

      {listaP.length > 0 && preostalo>0 && prekidOdobrenId && (
        <div style={{background:C.ok,border:`1px solid ${C.zelena}`,borderRadius:10,
          padding:"12px",fontSize:13,color:C.zelena,fontWeight:700,textAlign:"center"}}>
          ✓ Prekid odobren — možete zapisati
        </div>
      )}

      {listaP.length > 0 && preostalo>0 && !prekidOdobrenId && !mozeAdmin(korisnik?.uloga) && (
        <button type="button" onClick={onZahtevPrekid}
          style={{...BIG_BTN(C.zuta), fontSize:15, color: C.onZuta}}>
          ⚠ Zahtev za prekid ({preostalo} preostalo)
        </button>
      )}

      {listaP.length > 0 && setKpiSerija && (
        <SkartDoradaOeePanel
          C={C}
          kompakt
          modul="atributivne"
          vrednosti={kpiSerija}
          onChange={setKpiSerija}
          podnaslov="Uz Zapiši u bazu"
        />
      )}

      {/* Offline indikator */}
      {!online && offlineQueueTotal > 0 && (
        <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}40`,
          borderRadius:8,padding:"10px 14px",fontSize:12,color:C.zuta,textAlign:"center"}}>
          📶 Offline — {offlineQueueTotal} paketa u redu
        </div>
      )}

      <button onClick={() => setKorak(korakUnos)}
        style={{background:"none", border:`1px solid ${C.border}`, borderRadius:10,
          color:C.sivi, fontSize:14, padding:"12px", cursor:"pointer", width:"100%"}}>
        ← Dodaj još stavki
      </button>
    </>,
    korakLista,
    `KORAK ${korakLista} / ${ukupnoKoraka}`,
  ) : (
    <div style={{padding:"16px 16px 100px", display:"flex", flexDirection:"column",
      gap:14, minHeight:"calc(100dvh - 89px)", background:C.bg}}>
      <div style={{display:"flex", gap:5}}>
        {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
          <div key={k} style={{flex:1,height:4,borderRadius:2,
            background:k<=korak?C.zelena:C.hover}}/>
        ))}
      </div>
      {analitikaKompakt && deoInfo && analitikaUnosRed({ bezRef: true })}
      {dugmeZapisiGore}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(korakUnos)}
          style={{background:"none",border:"none",color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>
          ← Dodaj još
        </button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>KORAK {korakLista} / {ukupnoKoraka}</span>
        <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700,fontSize:13}}>
          {preostalo} preostalo
        </span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[
          ["OK",    listaG.filter(s=>s.status==="OK").reduce((s,d)=>s+d.kolicina,0),  C.zelena],
          ["NOK",   listaG.filter(s=>s.status==="NOK").reduce((s,d)=>s+d.kolicina,0), C.crvena],
          ["STAVKI",listaG.length,                                                      C.plava],
        ].map(([l,v,b]) => (
          <div key={l} style={{background:C.panel,border:`1px solid ${b}25`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:12,
        overflow:"auto", maxHeight:320}}>
        {!listaG.length ? (
          <div style={{padding:28,textAlign:"center",color:C.border,fontSize:13}}>
            Lista je prazna — idi na Korak 2
          </div>
        ) : listaG.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
            <div style={{flex:1}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                {s.foto && <span style={{fontSize:14}}>📷</span>}
                <span style={{color:s.status==="OK"?C.zelena:C.crvena,
                  fontWeight:700,fontSize:16}}>
                  {s.status} ×{s.kolicina}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:12}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</div>
            </div>
            <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                color:C.crvena,fontSize:20,padding:"8px 14px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={snimiDeo} disabled={!listaG.length}
        style={{...BIG_BTN(C.zelena,!listaG.length), fontSize:17,
          boxShadow:listaG.length?`0 0 20px ${C.zelena}40`:"none"}}>
        ✓ Snimi deo
      </button>
    </div>
  );
}

export default MobilniUnos;
