# Zenthra Contract Deployments

## Arc Testnet (chain ID 5042002)

| Contract | Address | Status |
|---|---|---|
| ZenthraCuratorV2 | `0x26d56d1768474803fe1930888fe42235bbbccf84` | Active — use this |
| ZenthraCurator (V1) | `0xd5cE405803E02987292986caaB9dAE78fD510DFa` | Deprecated |

## ZenthraCuratorV2 Configuration (at deploy)
- Protocol fee: 2% (200 bps)
- Featured price: 5 USDC/day
- Optional stake: 0 (free listing)
- Min task amount: 1 USDC
- Max concurrent tasks per buyer: 10
- Task accept timeout: 48 hours (172800 s)
- Dispute timeout: 7 days (604800 s)
- Owner / feeRecipient: `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (Circle SCP deployer)

## Identity / Reputation Registry Addresses (Arc Testnet)
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- ValidationRegistry: `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`
- USDC: `0x3600000000000000000000000000000000000000`

## Explorer
- V2: https://explorer.testnet.arc.io/address/0x26d56d1768474803fe1930888fe42235bbbccf84
