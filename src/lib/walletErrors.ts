/** True if the error looks like a raw RPC / transport failure. */
function isTechnicalRpcError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("rpc") ||
    lower.includes("http request failed") ||
    lower.includes("internal error") ||
    lower.includes("json-rpc") ||
    lower.includes("status: 5") ||
    lower.includes("status code") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("could not coalesce") ||
    lower.includes("missing response") ||
    lower.includes("details: {") ||
    lower.includes("request body") ||
    /0x[a-f0-9]{40}/i.test(text) && lower.includes("error")
  );
}

/**
 * Human-readable wallet / chain errors for UI.
 * Never surfaces raw RPC dumps.
 */
export function formatWalletError(
  error: unknown,
  fallback = "Something went wrong. Please try again in a moment."
): string {
  if (!error) return fallback;

  const err = error as {
    shortMessage?: string;
    message?: string;
    name?: string;
    details?: string;
    cause?: {
      shortMessage?: string;
      message?: string;
      name?: string;
      details?: string;
    };
  };

  const raw = [
    err.shortMessage,
    err.message,
    err.details,
    err.cause?.shortMessage,
    err.cause?.message,
    err.cause?.details,
    err.name,
    err.cause?.name,
  ]
    .filter(Boolean)
    .join(" ");

  const lower = raw.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("denied transaction") ||
    err.name === "UserRejectedRequestError" ||
    err.cause?.name === "UserRejectedRequestError"
  ) {
    return "You rejected the transaction in your wallet.";
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance")
  ) {
    return "Insufficient funds on Arc Testnet to complete this transaction.";
  }

  if (lower.includes("own agent") || lower.includes("agent owner")) {
    return "You cannot leave feedback on your own agent.";
  }

  if (
    (lower.includes("wrong network") || lower.includes("chain mismatch")) &&
    !isTechnicalRpcError(raw)
  ) {
    return "Wrong network. Switch to Arc Testnet and try again.";
  }

  // Hide technical RPC / HTTP dumps
  if (isTechnicalRpcError(raw) || raw.length > 160) {
    return fallback;
  }

  if (err.shortMessage && !isTechnicalRpcError(err.shortMessage)) {
    return err.shortMessage.length > 120
      ? `${err.shortMessage.slice(0, 120)}…`
      : err.shortMessage;
  }

  return fallback;
}
