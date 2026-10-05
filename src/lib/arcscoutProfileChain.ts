import { unstable_cache } from "next/cache";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  decodeFunctionData,
  http,
  parseEventLogs,
  zeroAddress,
  type Address,
  type Hash,
  type Hex,
  type Log,
} from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { arcMainnet } from "@/config/chains";
import { identityRegistryAddress } from "@/config/contracts";
import { x402PayTo } from "@/config/x402";
import {
  DEFAULT_ARCSCOUT_PROFILE,
  parseArcScoutUri,
  type ArcScoutProfile,
} from "@/lib/arcscoutProfile";

const arcClient = createPublicClient({
  chain: arcMainnet,
  transport: http(arcMainnet.rpcUrls.default.http[0]),
});

/** First block where this owner-controlled profile can exist. Arc rejects log queries wider than about 9,000 blocks. */
const FROM_BLOCK = BigInt(24_379_000);
const CHUNK = BigInt(8_000);
const LOOKBACK = BigInt(5_000);

const transferEvent = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
  ],
} as const;

const writeAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  transferEvent,
] as const;

const ownerOfAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const balanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type LoadedArcScoutProfile = {
  profile: ArcScoutProfile;
  tokenId: string | null;
  owner: Address;
};

type Cache = {
  at: number;
  tokenId: bigint | null;
  profile: ArcScoutProfile;
};

let cache: Cache | null = null;
let pendingTokenId: string | null = null;

const rememberedTokenId = unstable_cache(
  async () => {
    if (!pendingTokenId) throw new Error("not registered");
    return pendingTokenId;
  },
  ["arcscout-token-id-v1"],
  { revalidate: false }
);

export async function loadArcScoutProfile(options?: {
  fresh?: boolean;
}): Promise<LoadedArcScoutProfile> {
  if (!options?.fresh && cache && Date.now() - cache.at < 15_000) {
    return present(cache);
  }

  try {
    const tokenId = await findTokenId();
    if (tokenId === null) {
      cache = { at: Date.now(), tokenId: null, profile: DEFAULT_ARCSCOUT_PROFILE };
    } else {
      const profile =
        (await readOwnedProfile(tokenId)) ??
        (cache?.tokenId === tokenId ? cache.profile : null) ??
        DEFAULT_ARCSCOUT_PROFILE;
      cache = { at: Date.now(), tokenId, profile };
    }
  } catch (error) {
    console.error(
      "ArcScout profile read failed:",
      error instanceof Error ? error.message : "unknown"
    );
    if (!cache) {
      cache = { at: Date.now(), tokenId: null, profile: DEFAULT_ARCSCOUT_PROFILE };
    }
  }

  return present(cache);
}

/** Trust a profile only after the fee wallet's own registry transaction is confirmed. */
export async function learnArcScoutFromTx(txHash: Hash): Promise<LoadedArcScoutProfile | null> {
  try {
    const tx = await arcClient.getTransaction({ hash: txHash });
    if (tx.from.toLowerCase() !== x402PayTo.toLowerCase()) return null;
    if (tx.to?.toLowerCase() !== identityRegistryAddress.toLowerCase()) return null;

    const receipt = await arcClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return null;

    const tokenId = tokenIdFromCall(tx.input, receipt.logs);
    if (tokenId === null) return null;
    const profile = await readOwnedProfile(tokenId);
    if (!profile) return null;

    const saved = await rememberToken(tokenId, profile);
    return saved ? present(saved) : null;
  } catch (error) {
    console.error(
      "ArcScout profile save could not be read:",
      error instanceof Error ? error.message : "unknown"
    );
    return null;
  }
}

function present(entry: Cache): LoadedArcScoutProfile {
  return {
    profile: entry.profile,
    tokenId: entry.tokenId === null ? null : entry.tokenId.toString(),
    owner: x402PayTo,
  };
}

async function findTokenId(): Promise<bigint | null> {
  const configured = (process.env.ARCSCOUT_TOKEN_ID ?? "").trim();
  if (/^\d+$/.test(configured)) return BigInt(configured);
  if (cache?.tokenId) return cache.tokenId;

  const remembered = await readRememberedId();
  if (remembered) {
    const stillOwns = await ownsToken(remembered);
    if (stillOwns !== false) return remembered;
  }

  const balance = await ownerBalance();
  if (balance === BigInt(0)) return null;

  const scanned = await scanForTokenId(balance === null ? 2 : 8);
  if (scanned) {
    await rememberToken(scanned);
    return scanned;
  }
  if (balance === null) return null;

  const walked = await walkForTokenId();
  if (walked) {
    await rememberToken(walked);
    return walked;
  }
  return null;
}

async function readRememberedId(): Promise<bigint | null> {
  try {
    const value = await rememberedTokenId();
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const tokenId = BigInt(value);
    return tokenId > BigInt(0) ? tokenId : null;
  } catch {
    return null;
  }
}

async function rememberToken(
  tokenId: bigint,
  profile?: ArcScoutProfile
): Promise<Cache | null> {
  const resolved = profile ?? (await readOwnedProfile(tokenId));
  if (!resolved) return null;
  pendingTokenId = tokenId.toString();
  cache = { at: Date.now(), tokenId, profile: resolved };
  try {
    await rememberedTokenId();
  } catch {
    // This instance still has the id in memory.
  }
  return cache;
}

async function ownerBalance(): Promise<bigint | null> {
  try {
    return await arcClient.readContract({
      address: identityRegistryAddress,
      abi: balanceOfAbi,
      functionName: "balanceOf",
      args: [x402PayTo],
    });
  } catch {
    return null;
  }
}

async function ownsToken(tokenId: bigint): Promise<boolean | null> {
  try {
    const owner = await arcClient.readContract({
      address: identityRegistryAddress,
      abi: ownerOfAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
    return owner.toLowerCase() === x402PayTo.toLowerCase();
  } catch (error) {
    if (isMissingToken(error)) return false;
    return null;
  }
}

async function scanForTokenId(maxChunks: number): Promise<bigint | null> {
  const latest = await arcClient.getBlockNumber();
  const ranges: { start: bigint; end: bigint }[] = [];
  let end = latest;
  for (let chunk = 0; chunk < maxChunks && end >= FROM_BLOCK; chunk++) {
    const start = end - CHUNK + BigInt(1) < FROM_BLOCK ? FROM_BLOCK : end - CHUNK + BigInt(1);
    ranges.push({ start, end });
    if (start === FROM_BLOCK) break;
    end = start - BigInt(1);
  }

  for (let index = 0; index < ranges.length; index += 4) {
    const batch = ranges.slice(index, index + 4);
    const found = await Promise.all(batch.map((range) => tokenInRange(range.start, range.end)));
    const hit = found.find((tokenId) => tokenId !== null);
    if (hit) return hit;
  }
  return null;
}

async function tokenInRange(start: bigint, end: bigint): Promise<bigint | null> {
  try {
    const transfers = await arcClient.getLogs({
      address: identityRegistryAddress,
      event: transferEvent,
      args: { to: x402PayTo },
      fromBlock: start,
      toBlock: end,
    });
    const candidates: { blockNumber: bigint; index: number; tokenId: bigint }[] = [];
    for (const log of transfers) {
      if (log.args.tokenId === undefined) continue;
      candidates.push({
        blockNumber: log.blockNumber,
        index: log.logIndex ?? 0,
        tokenId: log.args.tokenId,
      });
    }
    candidates.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
      return b.index - a.index;
    });

    const seen = new Set<string>();
    for (const candidate of candidates) {
      const key = candidate.tokenId.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const profile = await readOwnedProfile(candidate.tokenId);
      if (profile) return candidate.tokenId;
    }
    return null;
  } catch (error) {
    console.error(
      "ArcScout log scan skipped:",
      error instanceof Error ? error.message : "unknown"
    );
    return null;
  }
}

async function walkForTokenId(): Promise<bigint | null> {
  const highest = await highestTokenId();
  if (highest === BigInt(0)) return null;
  const floor = highest > LOOKBACK ? highest - LOOKBACK + BigInt(1) : BigInt(1);
  let cursor = highest;

  while (cursor >= floor) {
    const ids: bigint[] = [];
    for (let count = 0; count < 150 && cursor >= floor; count++) {
      ids.push(cursor);
      cursor -= BigInt(1);
    }
    const results = await arcClient.multicall({
      contracts: ids.map((tokenId) => ({
        address: identityRegistryAddress,
        abi: ownerOfAbi,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      })),
      allowFailure: true,
    });
    for (let index = 0; index < ids.length; index++) {
      const row = results[index];
      if (row.status !== "success") continue;
      if (row.result.toLowerCase() !== x402PayTo.toLowerCase()) continue;
      const profile = await readOwnedProfile(ids[index]);
      if (profile) return ids[index];
    }
  }
  return null;
}

async function highestTokenId(): Promise<bigint> {
  let low = BigInt(0);
  let high = BigInt(1);
  while (high < BigInt(200_000) && (await tokenExists(high))) {
    low = high;
    high *= BigInt(2);
  }
  if (low === BigInt(0) && !(await tokenExists(BigInt(1)))) return BigInt(0);
  while (low + BigInt(1) < high) {
    const mid = (low + high) / BigInt(2);
    if (await tokenExists(mid)) low = mid;
    else high = mid;
  }
  return low;
}

async function tokenExists(tokenId: bigint): Promise<boolean> {
  try {
    await arcClient.readContract({
      address: identityRegistryAddress,
      abi: ownerOfAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
    return true;
  } catch (error) {
    if (isMissingToken(error)) return false;
    throw error;
  }
}

function tokenIdFromCall(input: Hex, logs: Log[]): bigint | null {
  const decoded = decodeFunctionData({ abi: writeAbi, data: input });
  if (decoded.functionName === "setAgentURI") return decoded.args[0];
  if (decoded.functionName !== "register") return null;

  const transfers = parseEventLogs({
    abi: writeAbi,
    eventName: "Transfer",
    logs: logs.filter(
      (log) => log.address.toLowerCase() === identityRegistryAddress.toLowerCase()
    ),
  });
  for (const log of transfers) {
    if (log.args.from.toLowerCase() !== zeroAddress.toLowerCase()) continue;
    if (log.args.to.toLowerCase() !== x402PayTo.toLowerCase()) continue;
    if (log.args.tokenId === undefined) continue;
    return log.args.tokenId;
  }
  return null;
}

async function readOwnedProfile(tokenId: bigint): Promise<ArcScoutProfile | null> {
  try {
    const owner = await arcClient.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
    if (owner.toLowerCase() !== x402PayTo.toLowerCase()) return null;
    const uri = await arcClient.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "tokenURI",
      args: [tokenId],
    });
    return parseArcScoutUri(uri);
  } catch {
    return null;
  }
}

function isMissingToken(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ContractFunctionRevertedError) instanceof
      ContractFunctionRevertedError
  );
}
