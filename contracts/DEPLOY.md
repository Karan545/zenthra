# Deploy ZenthraCurator on Arc Testnet (beginner guide)

This guide is written so you can deploy safely **without sharing your private key with anyone** (including AI chat).

---

## What you are deploying

| Item | Value |
|------|--------|
| Contract | `ZenthraCurator` |
| Network | **Arc Testnet** |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | https://testnet.arcscan.app |
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| USDC (6 decimals) | `0x3600000000000000000000000000000000000000` |
| List stake | **1 USDC** (`1000000` units) |

**What listing does later:** an agent owner with an ERC-8004 identity stakes 1 USDC to appear in Zenthra’s curated list.

---

## Already done for you in this project

- Foundry project under `contracts/`
- OpenZeppelin + forge-std installed in `lib/`
- Unit tests passing (`forge test`)
- Deploy script with Arc defaults: `script/DeployZenthraCurator.s.sol`
- Helper scripts: `scripts/check-setup.ps1`, `scripts/deploy-arc-testnet.ps1`

You do **not** need to redesign anything. You only need a funded deployer wallet.

---

## Before you start (checklist)

### 1. Tools on your PC

| Tool | Purpose | Status expected |
|------|---------|-----------------|
| Git | Foundry deps | Installed |
| Foundry (`forge`, `cast`) | Compile + deploy | Installed at `%USERPROFILE%\.foundry\bin` |
| Node (optional) | Frontend only | Already used for Zenthra app |

**Quick check** (PowerShell from `D:\zenthra\contracts`):

```powershell
.\scripts\check-setup.ps1
```

You should see `[OK]` for Git, Forge, OpenZeppelin, forge-std, and tests.

If `forge` is not found in a **new** terminal, add Foundry to PATH for this session:

```powershell
$env:Path = "$env:USERPROFILE\.foundry\bin;C:\Program Files\Git\cmd;" + $env:Path
```

(Optional permanent PATH: Windows Settings → System → About → Advanced → Environment Variables → Path → New →  
`C:\Users\<You>\.foundry\bin`)

### 2. A **testnet-only** deployer wallet

1. Create a **new** wallet in MetaMask (or use an empty one you do not mind for testing).
2. Add Arc Testnet network:

| Field | Value |
|-------|--------|
| Network name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Currency symbol | USDC |
| Block explorer | `https://testnet.arcscan.app` |

3. Fund it with **testnet USDC** (gas + any experiments):  
   - Circle faucet: https://faucet.circle.com  
   - Or Arc docs faucet links: https://docs.arc.network  

4. Confirm the address has a small balance on ArcScan.

### 3. Export the private key **yourself** (never paste it in chat)

In MetaMask:

1. Account details → Show private key  
2. Copy it (starts with `0x…`)  
3. You will paste it **only** into a local `.env` file on your machine  

**Rules:**

- Use a wallet with **only testnet funds**
- Never commit `.env` to git  
- Never send the key to Discord / AI / email  

---

## Deploy steps

### Step A — Open the contracts folder

```powershell
cd D:\zenthra\contracts
$env:Path = "$env:USERPROFILE\.foundry\bin;C:\Program Files\Git\cmd;" + $env:Path
```

### Step B — Create your local env file

```powershell
copy .env.example .env
notepad .env
```

Edit **only**:

```env
PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY_HERE
```

Leave other lines as-is unless you know you need overrides.  
Save and close Notepad.

### Step C — (Recommended) Dry-run without broadcasting

This compiles and simulates; it does **not** spend gas if you skip `--broadcast` (our dry-run flag):

```powershell
.\scripts\deploy-arc-testnet.ps1 -DryRun
```

You should see constructor args logged (Identity Registry, USDC, stake, owner).

### Step D — Real deploy

```powershell
.\scripts\deploy-arc-testnet.ps1
```

The script will:

1. Load `.env`  
2. Print your **deployer address** (not the key)  
3. Broadcast the deploy transaction  
4. Print **`ZenthraCurator` address** on success  

### Step E — Save the address

1. Copy the line like:  
   `ZenthraCurator : 0x................`  
2. Open it on ArcScan:  
   `https://testnet.arcscan.app/address/<that_address>`  
3. Store it somewhere safe (notes app / password manager) for the next frontend wiring step.

Broadcast artifacts (for your records) appear under:

```text
contracts/broadcast/DeployZenthraCurator.s.sol/5042002/
```

---

## Manual command (if you prefer not to use the PowerShell helper)

```powershell
cd D:\zenthra\contracts
$env:Path = "$env:USERPROFILE\.foundry\bin;" + $env:Path

# Load PRIVATE_KEY from .env yourself, or:
# $env:PRIVATE_KEY = "0x...."   # only in your local terminal, never in chat

forge script script/DeployZenthraCurator.s.sol:DeployZenthraCurator `
  --rpc-url https://rpc.testnet.arc.network `
  --broadcast `
  --private-key $env:PRIVATE_KEY `
  -vvvv
```

---

## Verify setup anytime

```powershell
cd D:\zenthra\contracts
.\scripts\check-setup.ps1
```

Or manually:

```powershell
forge test -vv
forge build
```

---

## Common problems

| Problem | Fix |
|---------|-----|
| `forge` not recognized | Add `%USERPROFILE%\.foundry\bin` to PATH |
| `PRIVATE_KEY is missing` | Create `.env` from `.env.example` |
| Insufficient funds | Fund deployer with Arc Testnet USDC |
| Wrong chain | RPC must be `https://rpc.testnet.arc.network` (chain 5042002) |
| Tests fail after pull | Re-run `forge install` inside `contracts/` |
| Approve/list fails later | Users must `approve` USDC to the curator before `listAgent` |

---

## What you do **after** this preparation (summary)

1. Run `.\scripts\check-setup.ps1` and confirm all OK.  
2. Create/fund a **testnet-only** wallet on Arc.  
3. Put its private key **only** in local `contracts/.env`.  
4. Run `.\scripts\deploy-arc-testnet.ps1 -DryRun` once.  
5. Run `.\scripts\deploy-arc-testnet.ps1` for the real deploy.  
6. Save the contract address from the console / ArcScan.  
7. Tell me (or a future task) the **public** curator address so we can wire the frontend — **never** send the private key.

---

## Safety reminders

- Arc Testnet only for now  
- Never commit `.env`  
- Prefer a throwaway deployer account  
- After deploy, you can delete `PRIVATE_KEY` from `.env` if you want  

Frontend design is unchanged. Wiring “List on Zenthra” to this contract is a separate step after you have the deployed address.
