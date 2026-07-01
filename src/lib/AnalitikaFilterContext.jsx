import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {

  snimiAnalitikaFilterSesija,

  ucitajAnalitikaFilterSesija,

} from "./analitikaSesija.js";



const AnalitikaFilterContext = createContext(null);



const DEFAULT = { period: "7", smena: "", idDeo: "", linija: "", pozicija: "" };



export function AnalitikaFilterProvider({ children }) {

  const [period, setPeriod] = useState(() => ucitajAnalitikaFilterSesija()?.period ?? DEFAULT.period);

  const [smena, setSmena] = useState(() => ucitajAnalitikaFilterSesija()?.smena ?? DEFAULT.smena);

  const [idDeo, setIdDeo] = useState(() => ucitajAnalitikaFilterSesija()?.idDeo ?? DEFAULT.idDeo);

  const [linija, setLinija] = useState(() => ucitajAnalitikaFilterSesija()?.linija ?? DEFAULT.linija);

  const [pozicija, setPozicija] = useState(() => ucitajAnalitikaFilterSesija()?.pozicija ?? DEFAULT.pozicija);



  useEffect(() => {

    snimiAnalitikaFilterSesija({ period, smena, idDeo, linija, pozicija });

  }, [period, smena, idDeo, linija, pozicija]);



  const value = useMemo(

    () => ({

      period, setPeriod,

      smena, setSmena,

      idDeo, setIdDeo,

      linija, setLinija,

      pozicija, setPozicija,

      reset: () => {

        setPeriod(DEFAULT.period);

        setSmena(DEFAULT.smena);

        setIdDeo(DEFAULT.idDeo);

        setLinija(DEFAULT.linija);

        setPozicija(DEFAULT.pozicija);

      },

    }),

    [period, smena, idDeo, linija, pozicija],

  );



  return (

    <AnalitikaFilterContext.Provider value={value}>

      {children}

    </AnalitikaFilterContext.Provider>

  );

}



export function useAnalitikaFilter() {

  return useContext(AnalitikaFilterContext);

}

