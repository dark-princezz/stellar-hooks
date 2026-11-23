import { Account, Asset, Networks, Operation, TransactionBuilder, type Memo } from '@stellar/stellar-sdk';

export interface BuildUnsignedPaymentTxInput {
  source: string;
  destination: string;
  amount: string;
  asset?: Asset;
  sequence: string;
  fee?: string;
  networkPassphrase?: string;
  memo?: Memo;
  timeboundsSeconds?: number;
}

export function buildUnsignedPaymentTransaction(input: BuildUnsignedPaymentTxInput): string {
  const account = new Account(input.source, input.sequence);
  const tx = new TransactionBuilder(account, {
    fee: input.fee ?? '100',
    networkPassphrase: input.networkPassphrase ?? Networks.TESTNET,
  })
    .addOperation(Operation.payment({ destination: input.destination, asset: input.asset ?? Asset.native(), amount: input.amount }))
    .setTimeout(input.timeboundsSeconds ?? 300);
  if (input.memo) tx.addMemo(input.memo);
  return tx.build().toXDR();
}
