import { useState, useCallback, useEffect, useRef } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { useStellarContext } from '../context';
import { getHorizonServer } from '../utils/memoizedServers';

export interface FriendlyOperation {
  id: string;
  type: string;
  typeI: number;
  sourceAccount: string;
  createdAt: string;
  transactionHash: string;
  pagingToken: string;
  isSuccessful: boolean;
  description: string;
  details: Record<string, any>;
  raw: Horizon.ServerApi.OperationRecord;
}

export function decodeOperationRecord(
  op: Horizon.ServerApi.OperationRecord
): FriendlyOperation {
  const friendly: FriendlyOperation = {
    id: op.id,
    type: op.type,
    typeI: op.type_i,
    sourceAccount: op.source_account,
    createdAt: op.created_at,
    transactionHash: op.transaction_hash,
    pagingToken: op.paging_token,
    isSuccessful: op.transaction_successful,
    description: "",
    details: {},
    raw: op,
  };

  switch (op.type) {
    case "create_account": {
      const record = op as Horizon.ServerApi.CreateAccountOperationRecord;
      friendly.description = `Create account ${record.account} with starting balance ${record.starting_balance} XLM`;
      friendly.details = {
        destination: record.account,
        startingBalance: record.starting_balance,
      };
      break;
    }
    case "payment": {
      const record = op as Horizon.ServerApi.PaymentOperationRecord;
      const asset = record.asset_code || "XLM";
      friendly.description = `Send ${record.amount} ${asset} to ${record.to}`;
      friendly.details = {
        amount: record.amount,
        assetCode: asset,
        assetIssuer: record.asset_issuer,
        destination: record.to,
      };
      break;
    }
    case "path_payment_strict_receive":
    case "path_payment_strict_send": {
      const record = op as any;
      const destAsset = record.asset_code || "XLM";
      const srcAsset = record.source_asset_code || "XLM";
      const amount = record.amount || record.dest_amount;
      const sourceAmount = record.source_amount || record.source_max;
      friendly.description = `Path payment: send ${sourceAmount} ${srcAsset} to receive ${amount} ${destAsset} for ${record.to}`;
      friendly.details = {
        amount,
        assetCode: destAsset,
        assetIssuer: record.asset_issuer,
        destination: record.to,
        sourceAmount,
        sourceAssetCode: srcAsset,
        sourceAssetIssuer: record.source_asset_issuer,
      };
      break;
    }
    case "manage_sell_offer":
    case "manage_buy_offer":
    case "create_passive_sell_offer": {
      const record = op as any;
      const selling = record.selling_asset_code || "XLM";
      const buying = record.buying_asset_code || "XLM";
      friendly.description = `Offer: sell ${record.amount} ${selling} for ${buying} at price ${record.price}`;
      friendly.details = {
        amount: record.amount,
        price: record.price,
        sellingAssetCode: selling,
        buyingAssetCode: buying,
      };
      break;
    }
    case "set_options": {
      const record = op as Horizon.ServerApi.SetOptionsOperationRecord;
      friendly.description = `Configure account options`;
      friendly.details = {
        signerKey: record.signer_key,
        signerWeight: record.signer_weight,
        clearFlags: record.clear_flags_s,
        setFlags: record.set_flags_s,
        inflationDest: record.inflation_dest,
        masterKeyWeight: record.master_key_weight,
        lowThreshold: record.low_threshold,
        medThreshold: record.med_threshold,
        highThreshold: record.high_threshold,
        homeDomain: record.home_domain,
      };
      break;
    }
    case "change_trust": {
      const record = op as Horizon.ServerApi.ChangeTrustOperationRecord;
      const asset = record.asset_code || "XLM";
      friendly.description = `Set trustline limit to ${record.limit} for ${asset}`;
      friendly.details = {
        limit: record.limit,
        assetCode: asset,
        assetIssuer: record.asset_issuer,
      };
      break;
    }
    case "allow_trust": {
      const record = op as any;
      friendly.description = `Allow trust for ${record.trustee} holding asset ${record.asset_code}`;
      friendly.details = {
        trustee: record.trustee,
        trustor: record.trustor,
        assetCode: record.asset_code,
        authorize: record.authorize,
      };
      break;
    }
    case "account_merge": {
      const record = op as Horizon.ServerApi.AccountMergeOperationRecord;
      friendly.description = `Merge account into ${record.into}`;
      friendly.details = {
        destination: record.into,
      };
      break;
    }
    case "manage_data": {
      const record = op as Horizon.ServerApi.ManageDataOperationRecord;
      friendly.description = `Set account data key: ${record.name}`;
      friendly.details = {
        name: record.name,
        value: record.value,
      };
      break;
    }
    case "bump_sequence": {
      const record = op as Horizon.ServerApi.BumpSequenceOperationRecord;
      friendly.description = `Bump sequence to ${record.bump_to}`;
      friendly.details = {
        bumpTo: record.bump_to,
      };
      break;
    }
    case "create_claimable_balance": {
      const record = op as any;
      friendly.description = `Create claimable balance for ${record.asset} of amount ${record.amount}`;
      friendly.details = {
        amount: record.amount,
        asset: record.asset,
        claimants: record.claimants,
      };
      break;
    }
    case "claim_claimable_balance": {
      const record = op as any;
      friendly.description = `Claim claimable balance ID ${record.balance_id}`;
      friendly.details = {
        balanceId: record.balance_id,
      };
      break;
    }
    default: {
      friendly.description = `Stellar operation: ${op.type}`;
      friendly.details = {};
      break;
    }
  }

  return friendly;
}

export interface UsePaginatedOperationsOptions {
  accountId?: string | null;
  transactionHash?: string | null;
  limit?: number;
  order?: "asc" | "desc";
  includeFailed?: boolean;
  enabled?: boolean;
}

export interface UsePaginatedOperationsReturn {
  operations: FriendlyOperation[];
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_ORDER = 'desc';

/**
 * Hook to fetch operations for an account or transaction, with cursor-based
 * pagination and operations decoded into a FriendlyOperation shape for UI use.
 * 
 * At least one of `accountId` or `transactionHash` must be provided.
 */
export function usePaginatedOperations(
  options: UsePaginatedOperationsOptions = {}
): UsePaginatedOperationsReturn {
  const { config } = useStellarContext();
  
  const {
    accountId,
    transactionHash,
    limit = DEFAULT_LIMIT,
    order = DEFAULT_ORDER,
    includeFailed = false,
    enabled = true,
  } = options;

  const [operations, setOperations] = useState<FriendlyOperation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);

  const fetchIdRef = useRef(0);

  const fetchOperations = useCallback(
    async (cursor?: string, direction: 'next' | 'prev' = 'next') => {
      if (!accountId && !transactionHash) {
        return;
      }

      const id = ++fetchIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const server = getHorizonServer(config.horizonUrl);
        let builder = server
          .operations()
          .limit(limit)
          .includeFailed(includeFailed);

        if (accountId) {
          builder = builder.forAccount(accountId);
        }
        if (transactionHash) {
          builder = builder.forTransaction(transactionHash);
        }

        if (direction === 'prev') {
          const oppositeOrder = order === 'desc' ? 'asc' : 'desc';
          builder = builder.order(oppositeOrder);
        } else {
          builder = builder.order(order);
        }

        if (cursor) {
          builder = builder.cursor(cursor);
        }

        const response = await builder.call();

        if (id !== fetchIdRef.current) return;

        const friendlyRecords = response.records.map(decodeOperationRecord);

        if (direction === 'next') {
          if (cursor) {
            setOperations(prev => [...prev, ...friendlyRecords]);
          } else {
            setOperations(friendlyRecords);
          }

          if (response.records.length > 0) {
            setNextCursor(response.records[response.records.length - 1]!.paging_token);
            setPrevCursor(response.records[0]!.paging_token);
          }
          setHasNext(response.records.length >= limit);
          setHasPrevious(cursor !== undefined);
        } else {
          const reversedRecords = [...friendlyRecords].reverse();

          setOperations(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newRecords = reversedRecords.filter(r => !existingIds.has(r.id));
            return [...newRecords, ...prev];
          });

          if (reversedRecords.length > 0) {
            setPrevCursor(reversedRecords[0]!.pagingToken);
          }
          setHasNext(true);
          setHasPrevious(response.records.length >= limit);
        }
      } catch (e) {
        if (id === fetchIdRef.current) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (id === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [accountId, transactionHash, config.horizonUrl, limit, order, includeFailed]
  );

  useEffect(() => {
    if (!enabled || (!accountId && !transactionHash)) return;

    setOperations([]);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setHasNext(true);
    setHasPrevious(false);
    fetchOperations();
    return () => {
      fetchIdRef.current += 1;
    };
  }, [enabled, fetchOperations]);

  const fetchNextPage = useCallback(() => {
    if (!isLoading && hasNext && nextCursor) {
      fetchOperations(nextCursor, 'next');
    }
  }, [isLoading, hasNext, nextCursor, fetchOperations]);

  const fetchPreviousPage = useCallback(() => {
    if (!isLoading && hasPrevious && prevCursor) {
      fetchOperations(prevCursor, 'prev');
    }
  }, [isLoading, hasPrevious, prevCursor, fetchOperations]);

  return {
    operations,
    fetchNextPage,
    fetchPreviousPage,
    hasNext,
    hasPrevious,
    isLoading,
    error,
  };
}
