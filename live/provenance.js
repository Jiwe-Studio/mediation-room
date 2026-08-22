/**
 * provenance.js — independent, code-side verification of Version B's
 * composed answers (see generate-system-prompt-v2.js, test-preset-v2.js).
 *
 * A Version B "composed" match response is a list of segments:
 *   { type: "archive", text, sourceId, source }  — must be verbatim from
 *     the bank, cited down to an entry ("q2") or a specific sentence
 *     ("q2:s2")
 *   { type: "ai", text }  — the model's own connective/interpretive text
 *
 * The model's own claim that a segment is "archive" is never trusted as-is.
 * scoreProvenance() re-derives the archive/AI percentage split by actually
 * looking up each cited sourceId against the real bank text in matcher.js
 * and checking the quote is character-for-character exact. Any segment
 * that doesn't verify is a hallucinationRisk, not a warning to note and
 * move past — Version B's entire safety case rests on this check being
 * real, not on the model self-reporting honestly.
 */
const { QA_BANK, PROCESS_BANK, REFUSAL_BANK, splitSentences } = require("./matcher.js");

function findEntry(entryId) {
  return (
    QA_BANK.find((e) => e.id === entryId) ||
    PROCESS_BANK.find((e) => e.id === entryId) ||
    REFUSAL_BANK.find((e) => e.id === entryId)
  );
}

// sourceId is either a bare entry id ("q2") or an entry id plus a 1-based
// sentence index ("q2:s2"). Returns the bank text that segment is citing,
// or null if the sourceId doesn't resolve to anything real — a null here
// is itself a hallucination signal, not just "no data".
//
// For a whole-entry citation ("q2"), this is the entry's FULL answer — but
// note that a valid quote only needs to be an exact SUBSTRING of this text
// (see verifyQuote below), since a composed answer is allowed to quote part
// of an entry, not necessarily all of it. Only a sentence-level citation
// ("q2:s2") requires the segment to match that exact sentence in full —
// that's the whole point of citing down to a specific sentence.
function resolveSourceText(sourceId) {
  if (!sourceId || typeof sourceId !== "string") return null;
  const [entryId, sentPart] = sourceId.split(":");
  const entry = findEntry(entryId);
  if (!entry) return null;

  if (!sentPart) return entry.answer;

  const m = sentPart.match(/^s(\d+)$/);
  if (!m) return null;
  const idx = parseInt(m[1], 10) - 1;
  const sentences = splitSentences(entry.answer);
  return idx >= 0 && idx < sentences.length ? sentences[idx] : null;
}

// Whole-entry citations only need to be an exact substring of the entry's
// full answer; sentence-level citations must match that sentence exactly.
function verifyQuote(segText, sourceId, referenceText) {
  const isSentenceLevel = /:s\d+$/.test(sourceId || "");
  const text = segText.trim();
  const ref = referenceText.trim();
  return isSentenceLevel ? text === ref : ref.includes(text);
}

/**
 * Verifies every "archive" segment against the real bank text and computes
 * the archive/AI percentage split from character counts of the segments
 * that actually verify. Returns:
 *   {
 *     archivePercent, aiPercent,        // of VERIFIED content only
 *     archiveChars, aiChars,
 *     hallucinationRisk: boolean,       // true if ANY archive segment fails
 *     issues: [{ index, message }],
 *   }
 */
function scoreProvenance(segments) {
  const issues = [];
  let archiveChars = 0;
  let aiChars = 0;
  let hallucinationRisk = false;

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      archivePercent: 0,
      aiPercent: 0,
      archiveChars: 0,
      aiChars: 0,
      hallucinationRisk: true,
      issues: [{ index: -1, message: "no segments provided" }],
    };
  }

  segments.forEach((seg, i) => {
    if (!seg || typeof seg.text !== "string" || !seg.text.trim()) {
      hallucinationRisk = true;
      issues.push({ index: i, message: "segment missing non-empty text" });
      return;
    }

    if (seg.type === "archive") {
      const truth = resolveSourceText(seg.sourceId);
      if (truth === null) {
        hallucinationRisk = true;
        issues.push({ index: i, message: `sourceId "${seg.sourceId}" does not resolve to any bank entry/sentence` });
        return;
      }
      if (!verifyQuote(seg.text, seg.sourceId, truth)) {
        hallucinationRisk = true;
        issues.push({ index: i, message: `text for "${seg.sourceId}" is not a verbatim quote from the bank` });
        return;
      }
      archiveChars += seg.text.length;
    } else if (seg.type === "ai") {
      aiChars += seg.text.length;
    } else {
      hallucinationRisk = true;
      issues.push({ index: i, message: `unknown segment type "${seg.type}"` });
    }
  });

  const total = archiveChars + aiChars;
  const archivePercent = total > 0 ? Math.round((archiveChars / total) * 100) : 0;
  const aiPercent = total > 0 ? 100 - archivePercent : 0;

  return { archivePercent, aiPercent, archiveChars, aiChars, hallucinationRisk, issues };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scoreProvenance, resolveSourceText };
}
