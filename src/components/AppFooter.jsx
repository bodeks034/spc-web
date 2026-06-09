import { getBrending } from "../lib/brending.js";

/** Sitan footer — verzija i © (login, početni ekran). */
export default function AppFooter({ C, kompakt = false }) {
  const b = getBrending();
  const sivi = C?.sivi || "#94a3b8";
  const delovi = [`v${b.verzija}`];
  if (b.razvojNaziv) delovi.push(`© ${new Date().getFullYear()} ${b.razvojNaziv}`);

  return (
    <div style={{
      color: sivi,
      fontSize: kompakt ? 9 : 10,
      lineHeight: 1.5,
      textAlign: "center",
      marginTop: kompakt ? 12 : 20,
      letterSpacing: 0.3,
    }}>
      {delovi.join(" · ")}
    </div>
  );
}
