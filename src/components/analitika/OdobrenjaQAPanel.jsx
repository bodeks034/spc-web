import AdminSpcAlarmiPanel from "../AdminSpcAlarmiPanel.jsx";
import AdminPrekidiPanel from "../AdminPrekidiPanel.jsx";
import AdminKalibracijaPanel from "../AdminKalibracijaPanel.jsx";

export default function OdobrenjaQAPanel({ korisnik, C, addToast }) {
  return (
    <div style={{
      padding: 20,
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      maxWidth: 920,
      margin: "0 auto",
    }}>
      <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
        ODOBRENJA QA
      </div>
      <p style={{ color: C.sivi, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
        SPC alarmi linije, zahtevi za prekid serije i kalibracija istekla — bez otvaranja Admin panela.
      </p>
      <AdminSpcAlarmiPanel korisnik={korisnik} C={C} addToast={addToast} />
      <AdminPrekidiPanel korisnik={korisnik} C={C} addToast={addToast} />
      <AdminKalibracijaPanel korisnik={korisnik} C={C} addToast={addToast} />
    </div>
  );
}
