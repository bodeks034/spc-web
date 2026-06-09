import { useEffect, useState, useCallback } from "react";
import { proveriLicencuKomplet, PROVERA_INTERVAL_MS } from "../lib/licenca.js";

export default function useLicencaGate() {
  const [stanje, setStanje] = useState({ ucitava: true, ok: true });

  const proveri = useCallback(async () => {
    const r = await proveriLicencuKomplet();
    setStanje({
      ucitava: false,
      ok: r.ok,
      poruka: r.poruka,
      kod: r.kod,
      vazi_do: r.vazi_do,
      napomena: r.napomena,
      tenant_id: r.tenant_id,
      deployment: r.deployment,
      moduli: r.moduli,
      max_korisnika: r.max_korisnika,
      offlineGrace: r.offlineGrace,
      devBypass: r.devBypass,
      slojevi: r.slojevi,
    });
  }, []);

  useEffect(() => {
    proveri();
    const t = setInterval(proveri, PROVERA_INTERVAL_MS);
    return () => clearInterval(t);
  }, [proveri]);

  return stanje;
}
