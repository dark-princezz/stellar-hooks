import { describe, it, expect } from "vitest";
import { buildSep7PayUri, parseSep7PayUri, validateSep7Pay } from "./sep7";

const DEST = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("sep7", () => {
  it("round-trips a payment", () => {
    const uri = buildSep7PayUri({
      destination: DEST,
      amount: "12.5",
      assetCode: "USDC",
      assetIssuer: ISSUER,
      memo: "order 1",
    });
    expect(uri.startsWith("web+stellar:pay?")).toBe(true);
    expect(parseSep7PayUri(uri)).toMatchObject({
      destination: DEST,
      amount: "12.5",
      assetCode: "USDC",
      memo: "order 1",
    });
  });
  it("rejects invalid input", () => {
    expect(validateSep7Pay({ destination: "nope" })).not.toEqual([]);
    expect(() => buildSep7PayUri({ destination: DEST, amount: "-1" })).toThrow();
    expect(parseSep7PayUri("https://example.com")).toBeNull();
    expect(parseSep7PayUri("web+stellar:pay?destination=bad")).toBeNull();
  });
});
