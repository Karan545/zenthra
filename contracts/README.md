# Zenthra Contracts

Foundry project for **ZenthraCurator** on Arc Testnet.

## Quick links

| Doc | Purpose |
|-----|---------|
| **[DEPLOY.md](./DEPLOY.md)** | **Start here** — beginner deploy guide |
| `src/ZenthraCurator.sol` | Listing + USDC stake contract |
| `script/DeployZenthraCurator.s.sol` | Deploy script (Arc defaults) |
| `scripts/check-setup.ps1` | Verify tools + tests |
| `scripts/deploy-arc-testnet.ps1` | One-command deploy helper |

## Arc Testnet defaults

| Param | Address / value |
|-------|-----------------|
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| USDC (6 decimals) | `0x3600000000000000000000000000000000000000` |
| Stake | `1_000_000` = **1 USDC** |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |

## Local commands

```powershell
cd contracts
$env:Path = "$env:USERPROFILE\.foundry\bin;C:\Program Files\Git\cmd;" + $env:Path

forge test -vv
forge build
.\scripts\check-setup.ps1
```

## Install deps (already done if `lib/` exists)

```powershell
forge install OpenZeppelin/openzeppelin-contracts@v5.2.0
forge install foundry-rs/forge-std
```

## Deploy

Follow **[DEPLOY.md](./DEPLOY.md)**. Do not put private keys in git or chat.

## Contract API (summary)

- `listAgent` — stake USDC + list (must own ERC-8004 NFT)
- `delistAgent` — unlist + return stake
- `featureAgent` — owner-only curation
- `getAgent` / `getAllListedAgents` — reads

OpenZeppelin: Ownable, ReentrancyGuard, SafeERC20.
