import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

/**
 * Generic hook za Supabase SELECT upite sa auto-refresh i error handling.
 *
 * @param {string} table - Naziv tabele
 * @param {object} [options]
 * @param {string} [options.select] - Kolone (default "*")
 * @param {object} [options.filters] - { kolona: vrednost } ili { kolona: [op, vrednost] }
 * @param {string} [options.order] - Kolona za sortiranje
 * @param {boolean} [options.ascending] - Redosled (default true)
 * @param {number} [options.limit] - Max redova
 * @param {boolean} [options.enabled] - Da li se upit izvršava (default true)
 * @param {string} [options.realtimeEvent] - Supabase realtime event filter (npr. "INSERT")
 * @param {number} [options.staleTime] - Koliko ms pre ponovnog fetcha (default 0 = uvek)
 * @returns {{ data, loading, error, refetch, count }}
 */
export default function useSupabaseQuery(table, options = {}) {
  const {
    select = "*",
    filters = {},
    order,
    ascending = true,
    limit,
    enabled = true,
    realtimeEvent,
    staleTime = 0,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(null);
  const lastFetch = useRef(0);
  const mountedRef = useRef(true);

  const filterKey = JSON.stringify(filters);

  const fetch = useCallback(async (force = false) => {
    if (!enabled || !table) {
      setLoading(false);
      return;
    }
    if (!force && staleTime > 0 && Date.now() - lastFetch.current < staleTime) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select, { count: "exact" });

      for (const [key, val] of Object.entries(filters)) {
        if (val === undefined || val === null) continue;
        if (Array.isArray(val) && val.length === 2) {
          const [op, v] = val;
          if (op === "eq") query = query.eq(key, v);
          else if (op === "neq") query = query.neq(key, v);
          else if (op === "gt") query = query.gt(key, v);
          else if (op === "gte") query = query.gte(key, v);
          else if (op === "lt") query = query.lt(key, v);
          else if (op === "lte") query = query.lte(key, v);
          else if (op === "like") query = query.like(key, v);
          else if (op === "ilike") query = query.ilike(key, v);
          else if (op === "in") query = query.in(key, v);
          else if (op === "is") query = query.is(key, v);
          else query = query.eq(key, v);
        } else {
          query = query.eq(key, val);
        }
      }

      if (order) query = query.order(order, { ascending });
      if (limit) query = query.limit(limit);

      const { data: rows, error: err, count: c } = await query;

      if (!mountedRef.current) return;
      if (err) {
        setError(err);
        setData(null);
      } else {
        setData(rows);
        setCount(c);
        lastFetch.current = Date.now();
      }
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [table, select, filterKey, order, ascending, limit, enabled, staleTime]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  useEffect(() => {
    if (!realtimeEvent || !enabled || !table) return;
    const channel = supabase
      .channel(`useSupabaseQuery_${table}_${filterKey}`)
      .on("postgres_changes", { event: realtimeEvent, schema: "public", table }, () => {
        fetch(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [realtimeEvent, table, filterKey, enabled, fetch]);

  return { data, loading, error, refetch: () => fetch(true), count };
}
