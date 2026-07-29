# Zenthra

**Permissionless agent directory & job marketplace** for ERC-8004 agents on Arc Testnet.

Warm, editorial product design — cream surfaces, muted bronze type, no neon.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion (subtle motion only)
- Instrument Serif + Geist typography
- **wagmi v2 + viem + RainbowKit** (Arc Testnet)

## Web3

| Item | Value |
|------|--------|
| Chain | Arc Testnet (`5042002`) |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Native gas | USDC |
| IdentityRegistry | `0x8004A818…BD9e` |
| ReputationRegistry | `0x8004B663…8713` |
| ValidationRegistry | `0x8004Cb1B…4272` |

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local` (from [cloud.walletconnect.com](https://cloud.walletconnect.com)). MetaMask injected still works without it.

Config lives in `src/config/` (`chains.ts`, `wagmi.ts`, `contracts.ts`, `abis/`). Hooks in `src/hooks/`.

### Smart contracts

Solidity lives in [`contracts/`](./contracts/) (Foundry).

- **`ZenthraCurator`** — stake 1 USDC to list an ERC-8004 agent on Zenthra (`listAgent`, `delistAgent`, `featureAgent`, `getAllListedAgents`, `getAgent`).

See **[contracts/DEPLOY.md](./contracts/DEPLOY.md)** for beginner deploy steps on Arc Testnet.

## Design system

| Token | Value |
|-------|--------|
| Background | `#F7F4EF` warm cream |
| Surface | `#FFFFFF` white cards |
| Body text | `#1A1A1A` near black |
| Headlines | `#8B6F4E` muted bronze |
| Muted text | warm gray |
| Primary button | solid brown `#6F563C` |
| Cards | white, subtle border, soft shadow |

No glow, neon, or heavy gradients.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
