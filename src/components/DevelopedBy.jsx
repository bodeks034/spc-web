import { getBrending } from "../lib/brending.js";

/** Diskretan kredit — firma (gore) ili autor (dole). */
export default function DevelopedBy({
  C,
  kompakt = false,
  centar = true,
  prikaz = "firma",
}) {
  const b = getBrending();
  const naziv = (prikaz === "autor" ? b.razvojAutor : b.razvojNaziv)?.trim();
  if (!naziv) return null;

  return (
    <div style={{
      color: C?.sivi || "#94a3b8",
      fontSize: kompakt ? 9 : 10,
      letterSpacing: 0.2,
      textAlign: centar ? "center" : "left",
      lineHeight: 1.4,
      opacity: 0.85,
    }}>
      Developed by {naziv}
    </div>
  );
}
