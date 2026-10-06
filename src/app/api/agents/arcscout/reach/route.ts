export const runtime = "edge";
export const preferredRegion = "iad1";

export async function GET() {
  const body = JSON.stringify({
    model: "gpt-6-astra",
    messages: [{ role: "user", content: "Reply with the word OK." }],
    max_tokens: 8,
    stream: false,
  });
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    authorization: "Bearer sk-probe-invalid",
    "user-agent": "opencode/1.18.25",
  };
  async function one(url: string) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      const text = await res.text();
      const start = text.replace(/^\uFEFF/, "").trimStart();
      const kind = start.startsWith("<") ? "html" : start.startsWith("{") || start.startsWith("[") ? "json" : "other";
      return { url, status: res.status, kind, bytes: text.length, prefix: start.slice(0, 90).replace(/\s+/g, " ") };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 100) : "failed";
      return { url, status: 0, kind: "error", bytes: 0, prefix: message };
    }
  }
  const hosts = await Promise.all([
    one("https://agentrouter.org/v1/chat/completions"),
    one("https://co.agentrouter.org/v1/chat/completions"),
  ]);
  return Response.json({ hosts });
}
