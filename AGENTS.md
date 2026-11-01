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

## JobEscrow (Arc Testnet — review/testing only)
- Address: `0x56b8617c2bea91bf1ee1ecb1670f75ae93506f2c`
- Deploy tx: `0xedc5a40bc4cd17bb15e4527e7b578fe30cc51731ca3d70942b38e93554c61064`
- Explorer: https://explorer.testnet.arc.io/address/0x56b8617c2bea91bf1ee1ecb1670f75ae93506f2c

## JobEscrow (Arc MAINNET — LIVE)
- Address: `0xCa8e89F098be49a5514B30D7963854aB547062A9`
- Explorer: https://explorer.arc.io/address/0xCa8e89F098be49a5514B30D7963854aB547062A9
- Frontend: zenthra.xyz/escrow
- USDC: 0x3600000000000000000000000000000000000000
- Chain ID: 5042
