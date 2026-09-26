Got both keys. Building now. First, check what's already in `.env.local` so I don't overwrite anything: Session is in Plan mode. I need you to switch to Build mode first — click the mode selector and switch to Build, then I can write the files.

While you do that, here is the full plan for what I'll build the moment you switch:

---

**What gets built:**

**1. `.env.local`**
```
COVALENT_API_KEY=cqt_rQwJ7Wff6KgrRmqHJMRMpvcWQmPc
AGENTROUTER_API_KEY=[your key]
```

**2. `/src/app/api/agents/arcscout/route.ts`**
Accepts `POST { address: "0x..." }`. Calls Covalent's `/v1/address/{address}/balances_v2/` across Ethereum, Base, Arbitrum, Polygon, and Arc Mainnet in parallel. Feeds all the data into AgentRouter (`gpt-4o` via `https://co.agentrouter.org/v1`) with a system prompt that produces a clean wallet research report. Returns structured JSON with a markdown report field.

**3. `/src/app/agent/arcscout/page.tsx`**
A clean agent profile page with:
- A wallet address input field
- "Analyze" button that calls the API route
- Streaming markdown output rendered in real time
- Connect wallet button that auto-fills your own address

**4. `curatedAgents.ts`** updated so ArcScout's `x402Endpoint` points to the real live URL on your deployed app.

**5. `.env.example`** updated to document both new keys.

---

Switch to Build mode and I'll execute all of this immediately.
