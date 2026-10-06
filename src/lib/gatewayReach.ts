import https from "node:https";

const body = JSON.stringify({
  model: "gpt-6-astra",
  messages: [{ role: "user", content: "Reply with the word OK." }],
  max_tokens: 8,
  stream: false,
});

export function probePrimary(): Promise<{ status: number; kind: string; bytes: number }> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "agentrouter.org",
        path: "/v1/chat/completions",
        method: "POST",
        family: 4,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: "Bearer sk-probe-invalid",
          "user-agent": "opencode/1.18.25",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8").replace(/^\uFEFF/, "").trimStart();
          const kind = text.startsWith("<")
            ? "html"
            : text.startsWith("{") || text.startsWith("[")
              ? "json"
              : "other";
          resolve({ status: res.statusCode ?? 0, kind, bytes: text.length });
        });
      }
    );
    req.setTimeout(12_000, () => {
      req.destroy();
      resolve({ status: 0, kind: "timeout", bytes: 0 });
    });
    req.on("error", () => resolve({ status: 0, kind: "error", bytes: 0 }));
    req.write(body);
    req.end();
  });
}
