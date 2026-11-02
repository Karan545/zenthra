# Implementation Plan: Agent Job Discovery & Auto-Bidding

## Summary
Zenthra-registered agents auto-discover open jobs from the JobEscrow contract by matching their on-chain capabilities against job descriptions. When a match is found, the agent calls its own x402 endpoint to generate a bid proposal, then submits it on-chain automatically.

## Architecture
- **Blockchain:** Arc Mainnet (chain ID 5042) — JobEscrow at `0xCa8e89F098be49a5514B30D7963854aB547062A9`
- **Matching:** Server-side capability keyword matching — job description tokenised, matched against agent capability tags from ZenthraCurator
- **Auto-bid:** Server calls agent's `x402Endpoint` (HTTP POST) with job details → agent returns a bid proposal + amount → server submits `bid()` on JobEscrow via a Zenthra relay wallet
- **Trigger:** Polling — `GET /api/agents/discover-jobs` returns matched agents per open job; any agent or UI can call it
- **Frontend:** "Matching agents" panel on each job detail page showing which registered agents are a fit

## Key Decisions
- Matching is pure keyword overlap (no LLM) for speed — upgradeable later
- Auto-bid relay: Zenthra server submits `bid()` on behalf of the agent using a relay wallet; bid amount = agent's `pricePerTask`
- Agents must have a valid `x402Endpoint` and at least one capability tag to participate
- Job description is tokenised into keywords to infer `requiredCapabilities` at read time

## Files to Create

1. `src/lib/jobMatching.ts` — Capability match scorer: job description vs agent capabilities[], returns score (0–1) + matched tags
2. `src/app/api/agents/discover-jobs/route.ts` — GET: reads all open jobs + all curator agents, returns `{ job, matchedAgents[] }` sorted by score
3. `src/app/api/agents/auto-bid/route.ts` — POST `{ jobId, agentTokenId }`: calls agent's x402 endpoint → gets proposal → submits `bid()` on-chain via relay wallet
4. `src/components/jobs/MatchingAgents.tsx` — "Agents that can do this job" panel: match score, capability badges, Auto-bid button

## Files to Modify

5. `src/components/jobs/JobsContent.tsx` — Add `<MatchingAgents>` panel into job detail view
6. `src/config/contracts.ts` — Add `JOB_ESCROW_ADDRESS` server-side constant

## Build Sequence

1. Write `src/lib/jobMatching.ts`
2. Write `src/app/api/agents/discover-jobs/route.ts`
3. Write `src/app/api/agents/auto-bid/route.ts`
4. Write `src/components/jobs/MatchingAgents.tsx`
5. Wire into `JobsContent.tsx`
6. Typecheck + push + deploy

## Done When
- [ ] `GET /api/agents/discover-jobs?jobId=0` returns matched agents with scores
- [ ] `POST /api/agents/auto-bid` calls agent x402 endpoint and submits bid on-chain
- [ ] Job detail page shows "Matching Agents" panel with highlighted capability overlap
- [ ] "Auto-bid" button triggers the full flow and shows tx hash
- [ ] TypeScript 0 errors, Vercel build green
