# Zenthra Live Build Audit — October 2026

Audited commit: `4e27fe9` (live on zenthra.xyz)

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Critical | 0 | — |
| High | 2 | Fix required |
| Medium | 3 | Fix recommended |
| Low / Warning | 4 | Minor |

---

## High Findings

### H1 — useCuratorListings uses V1 ABI against V2 contract

**File:** `src/hooks/useCuratorListings.ts` lines 6, 54, 93  
**File:** `src/config/abis/index.ts` line 4

`useCuratorListings` imports `zenthraCuratorAbi` (V1 ABI) and uses it to read from the deployed `zenthraCuratorAddress` — which is actually `ZenthraCuratorV2`. The V2 `AgentListing` struct has different fields:

| V1 field (wrong) | V2 field (correct) |
|---|---|
| `isFeatured` | `isFeaturedByOwner` + `featuredUntil` |
| `stakeAmount` | `bondAmount` |

**Effect:** `row.isFeatured` is always `undefined` in V2 responses (the struct field is named `isFeaturedByOwner`). Featured agents will never show as featured. The `stakeAmount` field read on line 179 will be `undefined` — no crash but wrong data.

**Fix:** Use `zenthraCuratorV2Abi` (already exported from `abis/index.ts`) and update field references to `isFeaturedByOwner` / `bondAmount`.

---

### H2 — isFeatured display logic broken for paid featured agents

**File:** `src/hooks/useCuratorListings.ts` line 177

```ts
isFeatured: Boolean(row.isFeatured),  // always false in V2
```

V2 has two featured modes: `isFeaturedByOwner` (owner toggle, free) and `featuredUntil` (paid, time-based). Neither is checked. An agent who paid for featured placement via `payForFeatured` will not appear featured in the directory.

**Fix:** `isFeatured: Boolean(row.isFeaturedByOwner) || (Number(row.featuredUntil) * 1000 > Date.now())`

---

## Medium Findings

### M1 — useJobActions missing `client` dependency in useCallback

**File:** `src/hooks/useJobActions.ts` lines 78, 92

Both `useCallback` hooks reference `client` (a `usePublicClient` value) but don't include it in the dependency array. If the public client changes (e.g. wallet reconnects), the stale closure will use the old client reference.

**Fix:** Add `client` to both dependency arrays, or move the client instantiation inside the callback.

---

### M2 — AgentProfile jobsTick state is unused

**File:** `src/components/agent/AgentProfile.tsx` line 111

`setJobsTick` is assigned but never called. This is a dead polling interval that was wired up but never completed. Minor memory/readability issue.

**Fix:** Remove the unused `setJobsTick` assignment.

---

### M3 — RequestWorkPanel imports unused `Address` type

**File:** `src/components/agent/RequestWorkPanel.tsx` line 5

`Address` is imported from viem but never used in the file.

**Fix:** Remove the import.

---

## Low / Warning Findings

### L1 — arcTestnet alias used throughout hooks (cosmetic, not a bug)

`arcTestnet` is re-exported as an alias for `arcMainnet` in `chains.ts`. All hooks import `arcTestnet` but they resolve to chain 5042 (mainnet). Functionally correct — cosmetically confusing for future developers.

### L2 — zenthraCuratorAbi (V1) still exported from abis/index.ts

V1 ABI is still exported for backward compatibility. It should be clearly marked as deprecated in a comment so nobody accidentally uses it for new hooks.

### L3 — useJobBoardWrite is a legacy stub

`useJobBoardWrite.ts` is an empty stub that exports nothing. Any file that imports from it will silently get `undefined`. Should be deleted.

### L4 — RegisterWizard has unnecessary eslint-disable directives

Lines 105/122 in `RegisterWizard.tsx` have `eslint-disable-next-line no-new` comments where no such violation exists anymore.

---

## What's Working Correctly

- All 9 pages return 200 (/, /directory, /jobs, /register, /categories, /my-agents, /docs, /category/*, /agent/*)
- TypeScript: 0 errors
- Lint: 0 errors, 6 warnings (all minor)
- Chain config: Arc Mainnet (5042) only — no testnet confusion
- ZenthraCuratorV2 and ZenthraJobBoard deployed and addressable
- ArcScout removed cleanly — no dead references
- Curated agent directory (ChainScout) wired in

---

## Fix Priority

Fix H1 and H2 first — they affect the live directory display for every listed agent.
