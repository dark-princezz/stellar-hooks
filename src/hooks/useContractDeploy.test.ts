/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { Address, StrKey, xdr } from "@stellar/stellar-sdk";
import { deriveContractId } from "./useContractDeploy";
import { validateContractId } from "../utils";

// ─── Small, independent reference implementation of the Soroban contract-ID
// ─── derivation used to cross-check `deriveContractId` byte-for-byte.
function referenceContractId(
  sourceAddress: string,
  salt: Buffer,
  networkPassphrase: string,
): string {
  const networkId = createHash("sha256").update(networkPassphrase).digest();
  const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: new Address(sourceAddress).toScAddress(),
      salt,
    }),
  );
  const digest = createHash("sha256")
    .update(Buffer.concat([Buffer.from(preimage.toXDR()), Buffer.from(networkId)]))
    .digest();
  return StrKey.encodeContract(digest);
}

describe("deriveContractId", () => {
  const source = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));
  const salt = () => Buffer.alloc(32, 0x42);
  const passphrase = "Test SDF Network ; September 2015";

  it("returns a valid contract address", () => {
    const id = deriveContractId(source, salt(), passphrase);
    expect(() => validateContractId(id)).not.toThrow();
    expect(id.startsWith("C")).toBe(true);
    expect(id.length).toBe(56);
  });

  it("matches an independent byte-level derivation", () => {
    expect(deriveContractId(source, salt(), passphrase)).toBe(
      referenceContractId(source, salt(), passphrase),
    );
  });

  it("is deterministic for identical inputs", () => {
    expect(deriveContractId(source, salt(), passphrase)).toBe(
      deriveContractId(source, salt(), passphrase),
    );
  });

  it("varies when the salt changes", () => {
    const changed = Buffer.alloc(32, 0x24);
    expect(deriveContractId(source, changed, passphrase)).not.toBe(
      deriveContractId(source, salt(), passphrase),
    );
  });

  it("varies when the network passphrase changes", () => {
    expect(deriveContractId(source, salt(), "Public Global Stellar Network ; September 2015")).not.toBe(
      deriveContractId(source, salt(), passphrase),
    );
  });
});