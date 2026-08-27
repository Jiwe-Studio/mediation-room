/**
 * api/mediate-v2.js — Vercel serverless function for VERSION B (composed
 * answers with code-verified provenance). Separate route and separate
 * preset from api/mediate.js (Version A) — see VERSIONING.md. Holds
 * OPENROUTER_API_KEY server-side, calls @preset/mediation-room-voice-v2,
 * and — critically — never trusts the model's own "segments" as-is: every
 * composed answer is re-verified here with provenance.js's scoreProvenance()
 * before it's sent to the browser, so a citation that doesn't check out is
 * caught server-side, not displayed as if it were confirmed.
 */
const { scoreProvenance } = require("../provenance.js");

// Some models can leak raw chat-template tokens ahead of the JSON body —
// e.g. "<|start|>assistant<|channel|>final{...}" — that markdown-fence
// stripping alone doesn't catch. Extracting the outermost {...} span is
// more robust than enumerating every possible prefix format.
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

  const presetName = process.env.PRESET_V2_NAME || "@preset/mediation-room-voice-v2";

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: presetName,
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

    // Refusals and unknowns pass through unchanged — only "composed" match
    // responses get provenance-checked. A refusal that somehow came back
    // with a "segments" field is itself a policy violation the client
    // should know about, not something to silently accept.
    if (parsed.type === "refusal" && parsed.segments) {
      res.status(502).json({ error: "refusal must never be composed, but response included segments" });
      return;
    }

    if (parsed.type === "match" && parsed.mode === "composed") {
      if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
        res.status(502).json({ error: "composed match with no usable segments array" });
        return;
      }
      const provenance = scoreProvenance(parsed.segments);
      if (provenance.hallucinationRisk) {
        // Never forward an answer whose citations don't check out — this is
        // the hard gate Version B's whole safety case rests on.
        res.status(502).json({
          error: "composed answer failed citation verification",
          issues: provenance.issues,
        });
        return;
      }
      parsed.provenance = provenance;
    }

    // Which underlying model actually served this — surfaced to the client
    // only for the dev badge (test mode); not part of the output contract.
    parsed.debugModel = data.model || null;

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
