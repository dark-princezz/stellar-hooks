import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { TransactionPreview } from "../TransactionPreview";

const source = Keypair.random().publicKey();
const dest = Keypair.random().publicKey();

const xdr = new TransactionBuilder(new Account(source, "1"), { fee: "200", networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.payment({ destination: dest, asset: Asset.native(), amount: "3" }))
  .addOperation(Operation.accountMerge({ destination: dest }))
  .setTimeout(60)
  .build()
  .toXDR();

describe("<TransactionPreview />", () => {
  it("lists operations and labels risky ones", () => {
    render(<TransactionPreview xdr={xdr} networkPassphrase={Networks.TESTNET} />);
    expect(screen.getByLabelText("Operations").querySelectorAll(":scope > li")).toHaveLength(2);
    expect(screen.getByText("payment")).toBeTruthy();
    expect(screen.getByText(/High risk/)).toBeTruthy();
    expect(screen.getByText(/Fee: 400 stroops/)).toBeTruthy();
  });

  it("shows an alert for undecodable XDR", () => {
    render(<TransactionPreview xdr="garbage" networkPassphrase={Networks.TESTNET} />);
    expect(screen.getByRole("alert").textContent).toMatch(/Unable to preview/);
  });
});
