import { describe, it, expect } from "vitest";
import { spremanZaPokusaj, zaglavljeniPoslovi, ZAGLAVLJEN_PRAG, flushOfflineQueue, _resetFlushStateZaTest, clearQueue, enqueueKontrolniLog, loadQueue } from "../src/lib/offlineQueue.js";
import { nacrtImaSadrzaj } from "../src/lib/radnaListaNacrt.js";

describe("offline backoff", () => {
  it("posao bez greške ide odmah", () => {
    expect(spremanZaPokusaj({ id: "a" })).toBe(true);
  });

  it("posao koji je upravo pao čeka", () => {
    const job = { failCount: 2, lastFailAt: new Date().toISOString() };
    expect(spremanZaPokusaj(job)).toBe(false);
  });

  it("posle isteka backoff-a se ponovo pokušava", () => {
    const pre = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(spremanZaPokusaj({ failCount: 2, lastFailAt: pre })).toBe(true);
  });

  it("backoff raste sa brojem neuspeha", () => {
    const pre = new Date(Date.now() - 30_000).toISOString();
    expect(spremanZaPokusaj({ failCount: 1, lastFailAt: pre })).toBe(true);
    expect(spremanZaPokusaj({ failCount: 3, lastFailAt: pre })).toBe(false);
  });

  it("neispravan lastFailAt ne blokira red", () => {
    expect(spremanZaPokusaj({ failCount: 4, lastFailAt: "ne-datum" })).toBe(true);
  });
});

describe("zaglavljeni poslovi", () => {
  it("prijavljuje posao koji je pao prag puta", () => {
    const q = [
      { id: "a", failCount: 1 },
      { id: "b", failCount: ZAGLAVLJEN_PRAG },
      { id: "c", trajnaGreska: true, failCount: 1 },
    ];
    expect(zaglavljeniPoslovi(q).map((j) => j.id)).toEqual(["b", "c"]);
  });

  it("prazan red nema zaglavljenih", () => {
    expect(zaglavljeniPoslovi([])).toEqual([]);
  });
});

describe("offline flush mutex", () => {
  it("paralelni flush deli isti promise", async () => {
    _resetFlushStateZaTest();
    clearQueue();
    const a = flushOfflineQueue({});
    const b = flushOfflineQueue({});
    expect(a).toBe(b);
    await a;
    _resetFlushStateZaTest();
  });

  it("enqueue tokom flush-a ostaje u redu", async () => {
    _resetFlushStateZaTest();
    clearQueue();
    enqueueKontrolniLog([{ id_deo: "X1", client_id: "c1" }], null);
    expect(loadQueue().length).toBe(1);
    enqueueKontrolniLog([{ id_deo: "X2", client_id: "c2" }], null);
    expect(loadQueue().length).toBe(2);
    clearQueue();
    _resetFlushStateZaTest();
  });
});

describe("nacrt radne liste", () => {
  it("prazan buffer se ne nudi za vraćanje", () => {
    expect(nacrtImaSadrzaj(null)).toBe(false);
    expect(nacrtImaSadrzaj([])).toBe(false);
    expect(nacrtImaSadrzaj({ listaP: [], listaG: [] })).toBe(false);
  });

  it("buffer sa stavkama se nudi", () => {
    expect(nacrtImaSadrzaj([{ idDeo: "5501" }])).toBe(true);
    expect(nacrtImaSadrzaj({ listaP: [{ x: 1 }], listaG: [] })).toBe(true);
  });
});
