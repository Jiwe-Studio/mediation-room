/**
 * api/mediate.js — Vercel serverless function. Holds OPENROUTER_API_KEY
 * server-side and proxies to the @preset/mediation-room-voice preset, per
 * HANDOFF-preset-wiring.md's call format. Never expose this key to the
 * browser directly (app.js only ever talks to this endpoint).
 */

// Some models (e.g. gpt-oss-120b, this preset's primary) can leak raw chat-
// template tokens ahead of the JSON body — e.g.
// "<|start|>assistant<|channel|>final{...}" — that markdown-fence stripping
// alone doesn't catch. The output contract guarantees a single JSON object,
// so extracting the outermost {...} span is more robust than trying to
// enumerate every possible prefix format.
function extractJsonObject(raw) {
  const trimmed = (raw || "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  try {
    return JSON.parse(trimmed.slice(first, last + 1));
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "missing question" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "server misconfigured: OPENROUTER_API_KEY not set" });
    return;
  }

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "@preset/mediation-room-voice",
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(502).json({ error: `upstream ${upstream.status}`, detail: text.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw);

    if (!parsed || typeof parsed.type !== "string") {
      res.status(502).json({ error: "unparseable model output", raw: raw.slice(0, 300) });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
