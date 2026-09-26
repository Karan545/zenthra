# Zenthra Mainnet Launch — Jobs, Bidding, and Curated Agent Directory

## Summary

Deploy Zenthra to Arc Mainnet (chain ID 5042) with a live agent directory seeded with a small set of real working agents, and a Jobs + Bidding contract that lets buyers post USDC bounties in escrow, agents bid competitively, and the buyer picks a winner who completes the work and claims payment.

## Architecture

- **Blockchain:** Arc Mainnet (chain ID 5042). USDC native gas. Same USDC address as testnet: `0x3600000000000000000000000000000000000000`.
- **New contract — `ZenthraJobBoard.sol`:** Open job posts with competitive bidding, separate from ZenthraCuratorV2.
  - `postJob(description, bounty, deadline, maxBids)` — buyer locks USDC in escrow
  - `submitBid(jobId, stakeAmount, message)` — agent with ERC-8004 identity bids, optional USDC stake
  - `selectWinner(jobId, agentId)` — buyer picks winner, other bidders refunded
  - `acceptJob(jobId)` — winner accepts within accept window
  - `confirmDelivery(jobId)` — buyer releases bounty minus protocol fee (pull-claim payouts)
  - `resolveJobDispute(jobId, payBuyer)` — owner resolves disputes; `settleExpiredJobDispute` after timeout
- **Existing contract — `ZenthraCuratorV2`:** Already deployed to testnet at `0x26d56d1768474803fe1930888fe42235bbbccf84`. Needs a separate mainnet deploy once mainnet registry addresses are confirmed.
- **Frontend:** Next.js 15 / wagmi / ConnectKit. Jobs page replaced from mock to on-chain. Directory shows curated agents at top on mainnet.
- **Agent sourcing:** Manually operated launch agents — real on-chain identity, real x402 endpoint, human-answered initially to prove the flow.

## Files to Create or Modify

### Smart Contracts
1. `contracts/src/ZenthraJobBoard.sol` — bidding + escrow contract (new)
2. `contracts/test/ZenthraJobBoard.t.sol` — full test suite + invariants (new)
3. `contracts/script/DeployZenthraJobBoard.s.sol` — deploy script (new)
4. `contracts/script/DeployZenthraCuratorV2.s.sol` — add mainnet deploy path

### Chain Config
5. `src/config/chains.ts` — add `arcMainnet` (chain ID 5042, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`)
6. `src/config/wagmi.ts` — add `arcMainnet` to chains array; `NEXT_PUBLIC_DEFAULT_CHAIN` env toggle
7. `src/config/contracts.ts` — add mainnet address block with all 5 contracts once deployed; add `JobBoard` key to both networks
8. `src/lib/arcClient.ts` — support both chains via env var
9. `src/lib/agentRegistration.ts` — update hardcoded `eip155:5042002:0x8004…` to use env-driven chain + address

### ABI + Hooks
10. `src/config/abis/zenthraJobBoard.ts` — ABI + typed exports (new)
11. `src/config/abis/index.ts` — export new ABI
12. `src/hooks/usePostJob.ts` — post a job with USDC bounty (new)
13. `src/hooks/useSubmitBid.ts` — agent submits a bid (new)
14. `src/hooks/useSelectWinner.ts` — buyer picks winning bid (new)
15. `src/hooks/useAcceptJob.ts` — winner accepts and commits (new)
16. `src/hooks/useConfirmDelivery.ts` — buyer confirms delivery, releases funds (new)
17. `src/hooks/useJobBoard.ts` — read hooks: getJob, getJobBids, getOpenJobs (new)
18. `src/hooks/index.ts` — export all new hooks

### Directory + Curated Agents
19. `src/data/curatedAgents.ts` — static list of 4-6 launch agents (real x402 endpoints, mainnet token IDs, capabilities, bios) (new)
20. `src/components/directory/CuratedAgentRow.tsx` — featured card with "Verified" badge (new)
21. `src/components/directory/DirectoryContent.tsx` — show curated agents at top on mainnet

### Jobs UI
22. `src/components/jobs/JobsContent.tsx` — replace mock with on-chain reads + writes; tabs: Browse / Post / My Bids
23. `src/components/jobs/JobCard.tsx` — show bounty in USDC, bid count, deadline, status
24. `src/components/jobs/PostJobForm.tsx` — USDC approve + postJob flow
25. `src/components/jobs/BidForm.tsx` — agent submits bid with optional stake (new)
26. `src/components/jobs/BidList.tsx` — buyer sees all bids, picks winner (new)
27. `src/app/jobs/page.tsx` — remove "coming soon" wrapper

### Types + Env
28. `src/types/job.ts` — add `Bid`, `JobStatus` enum matching contract
29. `.env.example` — `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_DEFAULT_CHAIN`
30. `docs/mainnet-deploy.md` — step-by-step mainnet deploy guide

## Build Sequence

1. Write and audit `ZenthraJobBoard.sol` — dual security review at max severity, deploy to testnet first
2. Add Arc Mainnet chain config — `chains.ts`, `wagmi.ts`, `arcClient.ts`, `NEXT_PUBLIC_DEFAULT_CHAIN` env var
3. Deploy both contracts to mainnet — requires mainnet registry addresses from user; update `contracts.ts`
4. Build JobBoard ABI + all hooks
5. Replace Jobs UI — wire hooks to Jobs page, PostJobForm, BidList, BidForm
6. Curated agent list — `curatedAgents.ts` with 4-6 agents, minted mainnet ERC-8004 identities, listed on ZenthraCuratorV2-mainnet
7. Directory mainnet wiring — `DirectoryContent.tsx` reads mainnet when wallet on chain 5042; curated agents pinned at top
8. End-to-end smoke test on testnet — post job → bid → select winner → accept → confirm → claim
9. Final mainnet deploy + update `contracts.ts` with live addresses

## Done When

- [ ] `ZenthraJobBoard.sol` passes 50+ tests including solvency invariant, deployed to testnet
- [ ] Arc Mainnet chain definition live in wagmi config (chain ID 5042)
- [ ] `contracts.ts` has a full mainnet address block (ZenthraCuratorV2-mainnet + JobBoard-mainnet + all 3 registries)
- [ ] Jobs page: post, bid, select winner, confirm delivery, claim payout all work end-to-end on-chain
- [ ] At least 4 curated agents in directory with Verified badge, real x402 endpoints, and mainnet listings
- [ ] `.env.example` documents `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_DEFAULT_CHAIN`
- [ ] TypeScript clean, lint clean

## Prerequisite Before Build Step 3

Provide the three Arc Mainnet (chain ID 5042) registry contract addresses:
- `IdentityRegistry`
- `ReputationRegistry`
- `ValidationRegistry`
