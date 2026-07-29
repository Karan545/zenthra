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

/** ArcScan URL helpers */
export function explorerAddressUrl(address: string): string {
  return `https://testnet.arcscan.app/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `https://testnet.arcscan.app/tx/${hash}`;
}

export function explorerTokenUrl(
  contract: string,
  tokenId: string | number | bigint
): string {
  return `https://testnet.arcscan.app/token/${contract}?a=${tokenId.toString()}`;
}
