import { describe, it, expect, vi } from "vitest";
import { snimiPinRadnika, proveriPinRadnika, listaRadnikaSaPin } from "../src/lib/tabletPin.js";
import { GO_LIVE_RPC_PORUKA } from "../src/lib/schemaCheck.js";

function supabaseBezRpc() {
  return {
    rpc: vi.fn(async () => ({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    })),
    from: vi.fn(() => ({
      update: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          not: () => ({ order: async () => ({ data: [], error: null }) }),
        }),
      }),
    })),
  };
}

describe("tabletPin hard-fail bez migracije 92", () => {
  it("snimiPinRadnika ne radi klijentski fallback", async () => {
    await expect(snimiPinRadnika(supabaseBezRpc(), 1, "1234"))
      .rejects.toThrow(/go-live RPC|92_bezbednost/i);
  });

  it("proveriPinRadnika ne čita pin_hash u browseru", async () => {
    await expect(proveriPinRadnika(supabaseBezRpc(), 1, "1234"))
      .rejects.toThrow(GO_LIVE_RPC_PORUKA);
  });

  it("listaRadnikaSaPin zahteva RPC", async () => {
    await expect(listaRadnikaSaPin(supabaseBezRpc()))
      .rejects.toThrow(/go-live RPC|92/i);
  });
});
