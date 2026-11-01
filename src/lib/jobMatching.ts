/**
 * Capability-based job matching.
 * Scores an agent's capability tags against a job description
 * to produce a 0–1 relevance score and a list of matched tags.
 */

import { CAPABILITY_OPTIONS } from "@/data/capabilities";

export interface MatchResult {
  score: number;          // 0–1
  matchedTags: string[];  // capability tags that appear in the job text
  inferredTags: string[]; // tags inferred from description keywords (not in agent caps)
}

/** Lowercase + strip punctuation for comparison */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}

/**
 * Infer capability tags from a job description by checking which
 * CAPABILITY_OPTIONS appear (or whose keywords appear) in the text.
 */
export function inferTagsFromDescription(description: string): string[] {
  const hay = normalise(description);
  const matched: string[] = [];

  // Additional keyword synonyms per capability tag
  const synonyms: Record<string, string[]> = {
    Research:     ["research", "investigate", "study", "analysis", "find"],
    Summarization:["summar", "tldr", "digest", "brief", "overview"],
    Docs:         ["document", "docs", "readme", "guide", "manual", "wiki"],
    Treasury:     ["treasury", "finance", "budget", "fund", "token", "usdc"],
    Reporting:    ["report", "dashboard", "metric", "kpi", "track"],
    Ops:          ["ops", "operation", "automat", "workflow", "process"],
    Content:      ["content", "blog", "article", "post", "write", "copy"],
    Editing:      ["edit", "proofread", "review", "revise", "polish"],
    Brand:        ["brand", "logo", "design", "identity", "style"],
    Analytics:    ["analytic", "data", "insight", "chart", "graph", "stat"],
    Wallets:      ["wallet", "address", "transfer", "usdc", "token", "pay"],
    Charts:       ["chart", "graph", "plot", "visuali", "dashboard"],
    Security:     ["security", "audit", "vulnerab", "pentest", "scan"],
    Review:       ["review", "feedback", "evaluat", "assess", "check"],
    Checklist:    ["checklist", "todo", "task", "list", "verify"],
    Matching:     ["match", "recommend", "suggest", "fit", "pair"],
    Routing:      ["route", "routing", "dispatch", "direct", "forward"],
    Jobs:         ["job", "task", "work", "assign", "hire", "bid"],
    Support:      ["support", "help", "assist", "customer", "ticket"],
    Triage:       ["triage", "priorit", "sort", "escalat"],
    FAQ:          ["faq", "question", "answer", "q&a"],
    Indexing:     ["index", "crawl", "scrape", "catalog", "store"],
    Search:       ["search", "query", "find", "lookup", "retriev"],
    Directory:    ["director", "list", "catalog", "registr", "discover"],
    Compliance:   ["compliance", "regulat", "policy", "legal", "gdpr"],
    Policy:       ["policy", "rule", "guideline", "standard", "protocol"],
    Notes:        ["note", "memo", "summar", "record", "log"],
    Signals:      ["signal", "alert", "notif", "monitor", "watch"],
    Markets:      ["market", "price", "trade", "defi", "swap", "exchange"],
    Briefs:       ["brief", "outline", "plan", "spec", "proposal"],
    "Design ops": ["design", "figma", "ui", "ux", "prototype"],
    Assets:       ["asset", "media", "image", "file", "upload"],
    QA:           ["qa", "test", "quality", "bug", "defect"],
    Workflows:    ["workflow", "automat", "pipeline", "trigger", "step"],
    Orchestration:["orchestrat", "coordinat", "agent", "multi-agent"],
    Status:       ["status", "progress", "updat", "monitor", "health"],
  };

  for (const cap of CAPABILITY_OPTIONS) {
    const capKey = cap as string;
    const words = synonyms[capKey] ?? [capKey.toLowerCase()];
    if (words.some((w) => hay.includes(w))) {
      matched.push(capKey);
    }
  }
  return matched;
}

/**
 * Score an agent's capabilities against a job description.
 * Returns a 0–1 score, the matched tags, and inferred tags.
 */
export function scoreAgentForJob(
  agentCapabilities: string[],
  jobDescription: string
): MatchResult {
  const inferred = inferTagsFromDescription(jobDescription);
  if (inferred.length === 0) {
    return { score: 0, matchedTags: [], inferredTags: [] };
  }

  const agentSet = new Set(agentCapabilities.map((c) => c.toLowerCase()));
  const matchedTags = inferred.filter((tag) =>
    agentSet.has(tag.toLowerCase())
  );

  const score = matchedTags.length / inferred.length;
  return { score, matchedTags, inferredTags: inferred };
}

export interface AgentMatch {
  agentId: number;
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  x402Endpoint?: string;
  pricePerTask: number;
  owner: string;
  score: number;
  matchedTags: string[];
}

/** Filter + rank agents for a given job description. Minimum score 0.15. */
export function rankAgentsForJob(
  agents: Array<{
    id: number;
    name: string;
    description: string;
    image?: string;
    capabilities: string[];
    x402Endpoint?: string;
    pricePerTask: number;
    owner: string;
  }>,
  jobDescription: string,
  minScore = 0.15
): AgentMatch[] {
  const results: AgentMatch[] = [];

  for (const agent of agents) {
    const { score, matchedTags } = scoreAgentForJob(
      agent.capabilities,
      jobDescription
    );
    if (score >= minScore) {
      results.push({ agentId: agent.id, name: agent.name, description: agent.description, image: agent.image, capabilities: agent.capabilities, x402Endpoint: agent.x402Endpoint, pricePerTask: agent.pricePerTask, owner: agent.owner, score, matchedTags });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
