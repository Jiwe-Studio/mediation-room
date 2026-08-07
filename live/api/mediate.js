/**
 * api/mediate.js — Vercel serverless function. Holds OPENROUTER_API_KEY
 * server-side and proxies to the @preset/mediation-room-voice preset, per
 * HANDOFF-preset-wiring.md's call format. Never expose this key to the
 * browser directly (app.js only ever talks to this endpoint).
 */
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
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parsed = null;
    }

    if (!parsed || typeof parsed.type !== "string") {
      res.status(502).json({ error: "unparseable model output", raw: raw.slice(0, 300) });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
