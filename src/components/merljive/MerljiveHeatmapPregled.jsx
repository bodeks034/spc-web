import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { HeatmapTabMerljive } from "../MerljiveOplTabovi.jsx";

export default function MerljiveHeatmapPregled({ C, addToast }) {
  const [merenja, setMerenja] = useState([]);

  useEffect(() => {
    let ok = true;
    const od = new Date();
    od.setDate(od.getDate() - 30);
    (async () => {
      const { data, error } = await supabase.from("merenja_varijabilna")
        .select("datum,smena,status,id_deo")
        .gte("datum", od.toISOString().split("T")[0])
        .order("datum", { ascending: true });
      if (!ok) return;
      if (error) addToast(error.message, "greska");
      else setMerenja(data || []);
    })();
    return () => { ok = false; };
  }, [addToast]);

  return <HeatmapTabMerljive merenja={merenja} C={C} />;
}
