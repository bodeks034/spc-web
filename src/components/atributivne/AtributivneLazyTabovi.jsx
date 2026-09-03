import { lazy } from "react";

/**
 * Analitički i QMS tabovi Modula 1/2. Bez ovoga je ceo atributivni modul
 * (PFMEA, NCR, 8D, trasabilitet, admin, Excel…) dolazio u jednom chunku
 * čim operater otvori unos — po uzoru na VarijabilneLazyTabovi.jsx.
 */
export const PfmeaCpModul = lazy(() => import("../PfmeaCpModul.jsx"));
export const NcrCapaPanel = lazy(() => import("../kvalitet/NcrCapaPanel.jsx"));
export const OsmDIzvestaj = lazy(() => import("../kvalitet/OsmDIzvestaj.jsx"));
export const EskalacijePanel = lazy(() => import("../kvalitet/EskalacijePanel.jsx"));
export const TrasabilitetPanel = lazy(() => import("../TrasabilitetPanel.jsx"));
export const AdminPanel = lazy(() => import("../admin/AdminPanel.jsx"));
export const InzenjerExcelPanel = lazy(() => import("../../InzenjerExcelPanel.jsx"));
export const MerilaMsaHub = lazy(() => import("../MerilaMsaHub.jsx"));
export const KontrolniPlanPanel = lazy(() => import("../KontrolniPlanPanel.jsx"));
export const RadniNaloziPanel = lazy(() => import("../RadniNaloziPanel.jsx"));
export const IzvestajDobavljacPanel = lazy(() => import("../IzvestajDobavljacPanel.jsx"));
export const SkartDoradaOeePanel = lazy(() => import("../SkartDoradaOeePanel.jsx"));
export const InteligencijaDeoPanel = lazy(() => import("../InteligencijaDeoPanel.jsx"));
export const AnalitikaPregledPanel = lazy(() => import("../analitika/AnalitikaPregledPanel.jsx"));
export const OdobrenjaQAPanel = lazy(() => import("../analitika/OdobrenjaQAPanel.jsx"));
export const SpcDashboardAtributivne = lazy(() => import("../spc/SpcDashboardAtributivne.jsx"));
export const PrijemnaKontrolaPanel = lazy(() => import("./PrijemnaKontrolaPanel.jsx"));

export function TabUcitavanje({ C, label = "Učitavam…" }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C?.sivi,
      fontFamily: "inherit",
      fontSize: 13,
      padding: 24,
    }}>
      {label}
    </div>
  );
}
