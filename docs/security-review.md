# ZenthraCurator — Security Review

**Contract:** `contracts/src/ZenthraCurator.sol`  
**Deployed:** `0xd5cE405803E02987292986caaB9dAE78fD510DFa` (Arc Testnet)  
**Review date:** 2026-09-18  
**Severity scale:** Critical > High > Medium > Low > Info  

---

## Summary

Two real bugs were found and fixed. No other exploitable issues were identified in the
listing/delisting accounting, the swap-and-pop enumerable set, reentrancy guards,
or ownership controls.

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | `rescueTokens` can drain active listing stakes | **Critical** | Fixed |
| 2 | Stale listing owner after NFT transfer | **High** | Fixed |

---

## Finding 1 — `rescueTokens` Can Drain Active Listing Stakes

**Severity:** Critical  
**Location:** `ZenthraCurator.rescueTokens` (original line 318)

### Root Cause

`rescueTokens(token, amount, to)` is guarded only by `onlyOwner`. It has no check
preventing the owner from withdrawing USDC that belongs to active listing stakes.
Because every active listing has `listing.stakeAmount` of USDC promised back on
`delistAgent`, sweeping those funds leaves the contract insolvent: future
`delistAgent` calls revert on the `safeTransfer` and users permanently lose their
staked funds.

This is a direct principal-agent violation: the owner role exists to manage curation,
not to hold custody over user capital.

### Fix Applied

Added a `totalActiveStake` state variable that is incremented in `listAgent` and
decremented in `delistAgent`. `rescueTokens` now enforces:

```solidity
if (token == address(usdc)) {
    uint256 surplus = balance > totalActiveStake
        ? balance - totalActiveStake : 0;
    if (amount > surplus) revert RescueWouldBreakSolvency();
}
```

Surplus USDC (accidentally sent tokens not backing any listing) can still be rescued.
Non-USDC tokens are fully rescuable as before.

### Tests Added

- `test_rescueTokens_cannotDrainActiveStake` — owner rescue of the full USDC balance
  reverts with `RescueWouldBreakSolvency` while a listing is active.
- `test_rescueTokens_allowsSurplusUSDC` — owner can rescue accidentally sent surplus
  USDC without touching the staked amount.
- `test_totalActiveStake_trackedCorrectly` — `totalActiveStake` increments on list and
  decrements on delist correctly.

---

## Finding 2 — Stale Listing Owner After NFT Transfer

**Severity:** High  
**Location:** `ZenthraCurator.listAgent`, `delistAgent`, `updateListing`

### Root Cause

`listing.owner` is fixed to `msg.sender` at list time. After an NFT transfer:

- The **new** NFT owner cannot call `updateListing` (fails `NotListingOwner`).
- The **new** NFT owner cannot call `delistAgent` (fails `NotListingOwner`).
- The **new** NFT owner cannot re-list (fails `AlreadyListed` — the old listing is
  still `isActive`).
- The **old** lister retains full unilateral control, including the ability to delist
  and collect the stake, even though they no longer own the identity.

This allows the old owner to hold the listing hostage indefinitely or to delist and
pocket the stake at a time of their choosing, while the new owner has no recourse.

### Fix Applied

Added `syncListingOwner(uint256 agentId)`:

```solidity
function syncListingOwner(uint256 agentId) external {
    AgentListing storage listing = _listings[agentId];
    if (!listing.isActive) revert NotListed();

    address currentNftOwner = identityRegistry.ownerOf(agentId);
    if (currentNftOwner == listing.owner) return; // no-op

    address oldOwner = listing.owner;
    listing.owner = currentNftOwner;

    emit ListingOwnerSynced(agentId, oldOwner, currentNftOwner);
}
```

Anyone can call this (no access restriction needed — it only updates ownership to
match the canonical on-chain NFT state). Once called, the new NFT owner becomes
`listing.owner` and can update or delist normally.

Note on stake direction: after `syncListingOwner`, `delistAgent` sends the stake to
the new `listing.owner` (the current NFT holder), which is the correct economic
outcome — the NFT sale price should factor in the locked stake.

### Tests Added

- `test_syncListingOwner_allowsNewOwnerToUpdate` — bob cannot update before sync;
  after sync he can.
- `test_syncListingOwner_allowsNewOwnerToDelist` — after sync, bob delists and
  receives the stake.
- `test_syncListingOwner_noopWhenInSync` — sync is a no-op when NFT ownership
  matches `listing.owner`.

---

## Items Reviewed and Found Clean

| Area | Result |
|------|--------|
| Reentrancy on `listAgent` / `delistAgent` | `nonReentrant` applied correctly; state updated before external call |
| Swap-and-pop set (`_addToListed`, `_removeFromListed`) | Correct in single-element, multi-element, and re-list-after-delist cases |
| `AlreadyListed` check prevents double-listing | Correct |
| `featureAgent` access control | `onlyOwner`, correctly enforced |
| `setListStakeAmount` affects future listings only | Correct — snapshot taken in `listAgent` via `uint256 stake = listStakeAmount` |
| `getAgents` batch view returns inactive listings | Intentional (returns empty-ish structs); not a security issue |
| `MAX_CAPABILITIES = 32` gas/abuse bound | Adequate |
| SafeERC20 on all USDC transfers | Yes |
| Zero-address constructor guards | Yes |

---

## Files Changed

| File | Change |
|------|--------|
| `contracts/src/ZenthraCurator.sol` | Added `totalActiveStake`, `RescueWouldBreakSolvency` error, `ListingOwnerSynced` event, `syncListingOwner()`, hardened `rescueTokens`, maintained `totalActiveStake` in `listAgent`/`delistAgent` |
| `contracts/test/ZenthraCurator.t.sol` | Added 6 new test cases covering both fixes |

**Test results after fix:** 10/10 passed, 0 failed.
