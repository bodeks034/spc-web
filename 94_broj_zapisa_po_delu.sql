-- 94_broj_zapisa_po_delu.sql
-- Grupno brojanje operativnih zapisa po delu.
--
-- Klijent je do sada povlačio do 50.000 redova iz merenja_varijabilna i
-- kontrolni_log samo da bi ih prebrojao u JS-u. Ovo vraća agregat sa servera,
-- pa je i tačno (bez odsecanja na limitu) i višestruko jeftinije.

create or replace function public.broj_merenja_po_delu(p_ids text[])
returns table (id_deo text, broj bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select upper(trim(m.id_deo)) as id_deo, count(*) as broj
  from public.merenja_varijabilna m
  where upper(trim(m.id_deo)) = any (
    select upper(trim(x)) from unnest(coalesce(p_ids, '{}'::text[])) as x
  )
  group by 1
$$;

create or replace function public.broj_kontrolni_log_po_delu(p_ids text[])
returns table (id_deo text, broj bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select upper(trim(k.id_deo)) as id_deo, count(*) as broj
  from public.kontrolni_log k
  where upper(trim(k.id_deo)) = any (
    select upper(trim(x)) from unnest(coalesce(p_ids, '{}'::text[])) as x
  )
  group by 1
$$;

-- security invoker: brojanje poštuje RLS pozivaoca, isto kao raniji direktan select.
grant execute on function public.broj_merenja_po_delu(text[]) to authenticated;
grant execute on function public.broj_kontrolni_log_po_delu(text[]) to authenticated;
