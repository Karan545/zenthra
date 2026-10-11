import type { Address, PublicClient } from "viem";

/**
 * Stop a wallet request when the target has no bytecode.
 * An ERC-20 approval to an empty address is what wallets label as a
 * request that can take the approved tokens.
 */
export async function requireContractCode(
  publicClient: Pick<PublicClient, "getCode">,
  address: Address,
  label: string
): Promise<void> {
  const code = await publicClient.getCode({ address });
  if (code && code !== "0x") return;
  const message = `${label} is not deployed on Arc mainnet. The USDC approval was stopped.`;
  const error = new Error(message) as Error & { shortMessage: string };
  error.shortMessage = message;
  throw error;
}
