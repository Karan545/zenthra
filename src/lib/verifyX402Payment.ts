import {
  createPublicClient,
  decodeEventLog,
  http,
  isAddress,
  type Address,
  type Hash,
} from "viem";
import { erc20Abi } from "@/config/abis/erc20";
import { arcMainnet } from "@/config/chains";
import { x402Amount, x402Asset, x402PayTo } from "@/config/x402";

const PAYMENT_WINDOW_SECONDS = 20 * 60;
/** 1 USDC in Arc's 18-decimal native units. The ERC-20 view of the same dollar is 1_000_000. */
const NATIVE_ONE_USDC = BigInt(10) ** BigInt(18);
/** EIP-7708 emitter. Arc also logs native USDC movement from this address at 18 decimals. */
const NATIVE_TRANSFER_EMITTER = "0xfffffffffffffffffffffffffffffffffffffffe";
const usedPayments = new Set<string>();

const arcClient = createPublicClient({
  chain: arcMainnet,
  transport: http(arcMainnet.rpcUrls.default.http[0]),
});

export function x402Requirements() {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042",
        asset: x402Asset,
        amount: x402Amount.toString(),
        payTo: x402PayTo,
        maxTimeoutSeconds: PAYMENT_WINDOW_SECONDS,
        extra: { name: "USDC", decimals: 6 },
      },
    ],
  };
}

/** Returns an error message when the transfer does not pay the ArcScout fee. */
export async function verifyX402Payment(
  paymentTx: string,
  payer: string
): Promise<string | null> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(paymentTx)) {
    return "Confirm a 1 USDC transfer in your wallet before the report can run.";
  }
  if (!isAddress(payer)) {
    return "Payment wallet is missing.";
  }

  const hash = paymentTx.toLowerCase() as Hash;
  if (usedPayments.has(hash)) {
    return "This payment was already used.";
  }

  let receipt;
  try {
    receipt = await arcClient.getTransactionReceipt({ hash });
  } catch {
    return "That USDC transfer is not confirmed on Arc yet. Approve it in your wallet, then try again.";
  }
  if (receipt.status !== "success") {
    return "The payment transaction reverted.";
  }
  if (receipt.from.toLowerCase() !== payer.toLowerCase()) {
    return "The payment was sent from a different wallet.";
  }
  if (receipt.to?.toLowerCase() !== x402Asset.toLowerCase()) {
    return "The payment was not a USDC transfer.";
  }

  const block = await arcClient.getBlock({ blockNumber: receipt.blockNumber });
  const age = Math.floor(Date.now() / 1000) - Number(block.timestamp);
  if (age > PAYMENT_WINDOW_SECONDS) {
    return "That payment is too old. Confirm a new 1 USDC transfer.";
  }

  const paid = receipt.logs.some((log) => {
    const emitter = log.address.toLowerCase();
    const erc20Log = emitter === x402Asset.toLowerCase();
    const nativeLog = emitter === NATIVE_TRANSFER_EMITTER;
    if (!erc20Log && !nativeLog) return false;
    try {
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") return false;
      const { from, to, value } = decoded.args as {
        from: Address;
        to: Address;
        value: bigint;
      };
      const enough = erc20Log ? value >= x402Amount : value >= NATIVE_ONE_USDC;
      return (
        from.toLowerCase() === payer.toLowerCase() &&
        to.toLowerCase() === x402PayTo.toLowerCase() &&
        enough
      );
    } catch {
      return false;
    }
  });

  if (!paid) {
    return "The transaction did not transfer 1 USDC to the ArcScout fee address.";
  }

  usedPayments.add(hash);
  return null;
}

/** Lets the same transfer retry when report generation fails after it was verified. */
export function releaseX402Payment(paymentTx: string) {
  if (/^0x[0-9a-fA-F]{64}$/.test(paymentTx)) {
    usedPayments.delete(paymentTx.toLowerCase());
  }
}
