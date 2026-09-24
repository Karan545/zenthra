import type { Address } from "viem";

/** Shorten 0x addresses for UI: 0x1234…abcd */
export function shortenAddress(
  address: Address | string | undefined,
  chars = 4
): string {
  if (!address) return "";
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

const EXPLORER = "https://explorer.arc.io";

/** Arc explorer URL helpers (mainnet). */
export function explorerAddressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerTokenUrl(
  contract: string,
  tokenId: string | number | bigint
): string {
  return `${EXPLORER}/token/${contract}?a=${tokenId.toString()}`;
}
