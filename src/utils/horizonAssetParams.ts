import type { Asset } from "@stellar/stellar-sdk";

export function assetTypeForCode(code: string): string {
  return code.length > 4 ? "credit_alphanum12" : "credit_alphanum4";
}

export function appendAssetParams(params: URLSearchParams, prefix: string, asset: Asset): URLSearchParams {
  if (asset.isNative()) {
    params.set(`${prefix}_asset_type`, "native");
    return params;
  }

  const code = asset.getCode();
  params.set(`${prefix}_asset_type`, assetTypeForCode(code));
  params.set(`${prefix}_asset_code`, code);
  params.set(`${prefix}_asset_issuer`, asset.getIssuer());
  return params;
}
