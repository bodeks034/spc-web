import { lazy, Suspense } from "react";

export const MerljiveSpcKarte = lazy(() => import("../../MerljiveSpcKarte.jsx"));
export const MerljiveAnalitikaDashboard = lazy(() => import("../spc/MerljiveAnalitikaDashboard.jsx"));
export const InzenjerExcelPanel = lazy(() => import("../../InzenjerExcelPanel.jsx"));
export const MerilaMsaHub = lazy(() => import("../MerilaMsaHub.jsx"));
export const KontrolniPlanPanel = lazy(() => import("../KontrolniPlanPanel.jsx"));
export const FaiOdobrenjePanel = lazy(() => import("../FaiOdobrenjePanel.jsx"));
export const RadniNaloziPanel = lazy(() => import("../RadniNaloziPanel.jsx"));
export const PfmeaCpModul = lazy(() => import("../PfmeaCpModul.jsx"));
export const EskalacijePanel = lazy(() => import("../kvalitet/EskalacijePanel.jsx"));
export const OsmDIzvestaj = lazy(() => import("../kvalitet/OsmDIzvestaj.jsx"));
export const NcrCapaPanel = lazy(() => import("../kvalitet/NcrCapaPanel.jsx"));
export const Iso3951Kalkulator = lazy(() => import("../kvalitet/Iso3951Kalkulator.jsx"));
export const MomentLinijaPanel = lazy(() => import("../MomentLinijaPanel.jsx"));
export const TrasabilitetPanel = lazy(() => import("../TrasabilitetPanel.jsx"));
export const MerljiveHeatmapPregled = lazy(() => import("./MerljiveHeatmapPregled.jsx"));
export const MerljiveAdminTab = lazy(() => import("./MerljiveAdminTab.jsx"));
export const MerljiveLogPregled = lazy(() => import("./MerljiveLogPregled.jsx"));
export const InteligencijaDeoPanel = lazy(() => import("../InteligencijaDeoPanel.jsx"));
export const AnalitikaPregledPanel = lazy(() => import("../analitika/AnalitikaPregledPanel.jsx"));
export const OdobrenjaQAPanel = lazy(() => import("../analitika/OdobrenjaQAPanel.jsx"));
export const SkartDoradaOeePanel = lazy(() => import("../SkartDoradaOeePanel.jsx"));
export const OeeKpiTab = lazy(() => import("../SkartDoradaOeePanel.jsx").then((m) => ({ default: m.OeeKpiTab })));
export const IzvestajSmeneMerljive = lazy(() => import("../MerljiveOplTabovi.jsx").then((m) => ({ default: m.IzvestajSmeneMerljive })));
export const CiljeviMerljive = lazy(() => import("../MerljiveOplTabovi.jsx").then((m) => ({ default: m.CiljeviMerljive })));
export const KupacMerljive = lazy(() => import("../MerljiveOplTabovi.jsx").then((m) => ({ default: m.KupacMerljive })));
export const StabilnostMerljive = lazy(() => import("../MerljiveOplTabovi.jsx").then((m) => ({ default: m.StabilnostMerljive })));
export const OCKrivaPanel = lazy(() => import("./analitika/OCKrivaIso3951.jsx"));

export function TabUcitavanje({ C, label = "Učitavam…" }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.sivi,
      fontFamily: "inherit",
      fontSize: 13,
      padding: 24,
    }}>
      {label}
    </div>
  );
}

export function LazyTab({ C, label, children }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <Suspense fallback={<TabUcitavanje C={C} label={label} />}>
        {children}
      </Suspense>
    </div>
  );
}
