import { useEffect, useState, useCallback } from "react";

import { supabase } from "../lib/supabaseClient.js";

import { ucitajShopFloorStatus } from "../lib/shopFloorStatus.js";

import { formatErpUvozVreme } from "../lib/erpUvozLog.js";

import { getAktivnaSesija } from "../lib/spcSesija.js";
import { NCR_CAPA_TOOLTIP } from "../lib/analitikaOpisi.js";



function StatusChip({ C, boja, label, title, testId, onClick }) {

  const Tag = onClick ? "button" : "span";

  return (

    <Tag

      type={onClick ? "button" : undefined}

      data-testid={testId}

      onClick={onClick}

      title={title || label}

      style={{

        display: "inline-flex",

        alignItems: "center",

        gap: 5,

        padding: "2px 8px",

        borderRadius: 5,

        border: `1px solid ${boja}55`,

        background: `${boja}14`,

        color: boja,

        fontSize: 9,

        fontWeight: 700,

        whiteSpace: "nowrap",

        cursor: onClick ? "pointer" : "default",

        fontFamily: "inherit",

      }}

    >

      <span style={{ width: 6, height: 6, borderRadius: "50%", background: boja, flexShrink: 0 }} />

      {label}

    </Tag>

  );

}



/**

 * Jedinstvena traka na liniji — mreža, merilo, ključ, SPC alarmi, moment %, NCR, ERP sync.

 */

export default function ShopFloorStatusBar({

  C,

  online = true,

  offlineTotal = 0,

  onSync,

  onNavigacija,

  digitalniUnos = false,

  meriloPovezano = false,

  meriloSimulacija = false,

  kljucPovezan = false,

  idDeo = "",

  smena = null,

  linija = "",

  modul = "merljive",

  kompakt = false,

}) {

  const [status, setStatus] = useState(null);



  const osvezi = useCallback(async () => {

    const r = await ucitajShopFloorStatus(supabase, { idDeo, smena, linija, modul });

    setStatus(r);

  }, [idDeo, smena, linija, modul]);



  useEffect(() => {

    osvezi();

    const t = setInterval(osvezi, 45000);

    return () => clearInterval(t);

  }, [osvezi]);



  useEffect(() => {

    const ch = supabase.channel(`shop_floor_${modul}_${idDeo || "all"}`)

      .on("postgres_changes", { event: "*", schema: "public", table: "spc_alarmi" }, () => osvezi())

      .on("postgres_changes", { event: "*", schema: "public", table: "ncr_capa" }, () => osvezi())

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "moment_protokol" }, () => osvezi())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, () => osvezi())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, () => osvezi())
      .subscribe();

    return () => { supabase.removeChannel(ch); };

  }, [modul, idDeo, osvezi]);



  const sesija = getAktivnaSesija(modul)?.sesija_id;

  const alarmi = status?.spcAlarmiOtvoreni ?? 0;

  const ncr = status?.ncrOtvoreni ?? 0;

  const erp = status?.poslednjiErpUvoz;

  const nokStreak = status?.nokUzastopna ?? 0;
  const pragPauze = status?.pragPauze ?? 3;
  const nokPoz = status?.nokPozicija;
  const nokPauza = idDeo && nokStreak >= pragPauze;
  const nokUpozorenje = idDeo && nokStreak >= 2 && nokStreak < pragPauze;
  const nokTooltip = nokPauza
    ? `${nokStreak} NOK uzastopna${nokPoz ? ` (poz. ${nokPoz})` : ""}: PAUZIRAJ SERIJU i zatraži odobrenje QA pre nastavka. Auto-eskalacija i NCR draft su pokrenuti.`
    : nokUpozorenje
      ? `${nokStreak} NOK uzastopna — proveri alat${nokPoz ? ` / poz. ${nokPoz}` : ""}. Pri ${pragPauze}× NOK serija se pauzira.`
      : "";



  return (

    <div

      data-testid="shop-floor-bar"

      style={{

        background: C.panel,

        borderBottom: `1px solid ${C.border}`,

        padding: kompakt ? "4px 10px" : "6px 20px",

        display: "flex",

        alignItems: "center",

        gap: 8,

        fontSize: 10,

        flexWrap: "wrap",

      }}

    >

      <StatusChip

        C={C}

        boja={online ? C.zelena : C.crvena}

        label={online ? "Online" : `Offline (${offlineTotal})`}

        title={online ? "Konekcija aktivna" : `${offlineTotal} paketa u redu`}

        testId="shop-floor-online"

      />



      {digitalniUnos && (

        <StatusChip

          C={C}

          boja={meriloPovezano ? (meriloSimulacija ? C.zuta : C.zelena) : C.sivi}

          label={meriloPovezano

            ? (meriloSimulacija ? "Merilo · sim" : "Merilo · OK")

            : "Merilo · —"}

          testId="shop-floor-merilo"

        />

      )}



      {digitalniUnos && (

        <StatusChip

          C={C}

          boja={kljucPovezan ? C.ljubicasta || "#a78bfa" : C.sivi}

          label={kljucPovezan ? "Ključ · OK" : "Ključ · —"}

          testId="shop-floor-kljuc"

        />

      )}



      {!digitalniUnos && (

        <span style={{ color: C.sivi, fontSize: 9 }}>Ručni unos</span>

      )}



      {nokPauza && (

        <StatusChip

          C={C}

          boja={C.crvena}

          label={`⛔ ${nokStreak}× NOK — PAUZA`}

          title={nokTooltip}

          testId="shop-floor-nok-pauza"

          onClick={onNavigacija ? () => onNavigacija({ tab: "odobrenja" }) : undefined}

        />

      )}



      {nokUpozorenje && (

        <StatusChip

          C={C}

          boja={C.narandzasta || C.zuta}

          label={`⚠ ${nokStreak}× NOK`}

          title={nokTooltip}

          testId="shop-floor-nok-upozorenje"

        />

      )}



      {(status?.kalIstekle ?? 0) > 0 && (

        <StatusChip

          C={C}

          boja={C.crvena}

          label={`Kal ${status.kalIstekle}`}

          title={`${status.kalIstekle} merila sa isteklom kalibracijom — proveri pre merenja`}

          testId="shop-floor-kal"

          onClick={onNavigacija ? () => onNavigacija({ tab: "kalibracija" }) : undefined}

        />

      )}



      {(status?.msaKasni ?? 0) > 0 && (

        <StatusChip

          C={C}

          boja={C.narandzasta || C.zuta}

          label={`MSA ${status.msaKasni}`}

          title={`${status.msaKasni} MSA studija kasni — zakazati studiju`}

          testId="shop-floor-msa"

        />

      )}



      {alarmi > 0 && (

        <StatusChip

          C={C}

          boja={C.crvena}

          label={`SPC ${alarmi}`}

          title={(status?.spcAlarmi || []).map((a) => a.pravilo).join(", ")}

          testId="shop-floor-spc"

          onClick={onNavigacija ? () => onNavigacija({ tab: "odobrenja" }) : undefined}

        />

      )}



      {ncr > 0 && (

        <StatusChip

          C={C}

          boja={C.narandzasta || C.zuta}

          label={`NCR ${ncr}`}

          title={[NCR_CAPA_TOOLTIP, (status?.ncrLista || []).map((n) => n.broj_ncr).join(", ")].filter(Boolean).join(" · ")}

          testId="shop-floor-ncr"

          onClick={onNavigacija ? () => onNavigacija({ tab: "ncr" }) : undefined}

        />

      )}



      {status?.momentPctOk != null && (

        <StatusChip

          C={C}

          boja={status.momentPctOk >= 95 ? C.zelena : C.narandzasta || C.zuta}

          label={`Moment ${status.momentPctOk}%`}

          title={`OK ${status.momentOk} · NOK ${status.momentNok}`}

          testId="shop-floor-moment"

        />

      )}



      {erp && (

        <span

          title={erp.detalj || ""}

          style={{

            fontSize: 8,

            color: erp.uspeh ? C.sivi : C.crvena,

            whiteSpace: "nowrap",

          }}

        >

          ERP {formatErpUvozVreme(erp.created_at)}{erp.uspeh ? "" : " ⚠"}

        </span>

      )}



      {sesija && (

        <span style={{ color: C.border, fontSize: 8 }} title="Sesija serije">

          {sesija.slice(0, 16)}…

        </span>

      )}



      {!online && offlineTotal > 0 && onSync && (

        <button

          type="button"

          onClick={onSync}

          data-testid="shop-floor-sync"

          style={{

            background: C.zuta,

            border: "none",

            borderRadius: 5,

            color: C.onZuta,

            fontSize: 9,

            padding: "3px 8px",

            cursor: "pointer",

            fontWeight: 700,

            marginLeft: "auto",

          }}

        >

          ↻ Sync

        </button>

      )}

    </div>

  );

}


