import OfflineSyncPanel from "../OfflineSyncPanel.jsx";
import SchemaStatusPanel from "../SchemaStatusPanel.jsx";
import SpcBaselinePanel from "../SpcBaselinePanel.jsx";
import KarakteristikeGraniceEditor from "../KarakteristikeGraniceEditor.jsx";
import MeriloBarkodUputstvo from "../MeriloBarkodUputstvo.jsx";
import NotifikacijePodesavanja from "../NotifikacijePodesavanja.jsx";
import MerljiveExcelPanel from "../../MerljiveExcelPanel.jsx";
import AdminKalibracijaPanel from "../AdminKalibracijaPanel.jsx";

export default function MerljiveAdminTab({
  supabase, C, korisnik, addToast, online, onFlushed,
}) {
  return (
    <div style={{
      flex: 1,
      overflow: "auto",
      padding: 20,
      maxWidth: 800,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}
    >
      <OfflineSyncPanel supabase={supabase} C={C} addToast={addToast} online={online} onSync={onFlushed} />
      <SchemaStatusPanel C={C} />
      <SpcBaselinePanel C={C} korisnik={korisnik} modul="merljive" addToast={addToast} />
      <KarakteristikeGraniceEditor C={C} korisnik={korisnik} addToast={addToast} />
      <MeriloBarkodUputstvo C={C} />
      <NotifikacijePodesavanja C={C} addToast={addToast} />
      <MerljiveExcelPanel C={C} addToast={addToast} />
      <AdminKalibracijaPanel korisnik={korisnik} C={C} addToast={addToast} />
    </div>
  );
}
