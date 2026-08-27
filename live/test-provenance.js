const { scoreProvenance, resolveSourceText } = require("./provenance.js");
const { QA_BANK, PROCESS_BANK, REFUSAL_BANK, splitSentences } = require("./matcher.js");

let pass = 0;
let fail = 0;

function check(desc, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`OK   ${desc}`);
  } else {
    fail++;
    console.log(`FAIL ${desc}  (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

const q2 = QA_BANK.find((e) => e.id === "q2");
const q2Sentences = splitSentences(q2.answer);
const p1 = PROCESS_BANK.find((e) => e.id === "p1");

// --- resolveSourceText ---
check("resolves whole-entry sourceId", resolveSourceText("q2"), q2.answer);
check("resolves sentence-level sourceId", resolveSourceText("q2:s2"), q2Sentences[1]);
check("unknown entry id -> null", resolveSourceText("zzz"), null);
check("out-of-range sentence index -> null", resolveSourceText("q2:s99"), null);
check("malformed sentence suffix -> null", resolveSourceText("q2:x2"), null);
check("empty sourceId -> null", resolveSourceText(""), null);
check("non-string sourceId -> null", resolveSourceText(undefined), null);

// --- scoreProvenance: clean composed answer, all verbatim ---
{
  const segments = [
    { type: "ai", text: "This touches two connected things." },
    { type: "archive", text: q2.answer, sourceId: "q2", source: "qa" },
  ];
  const r = scoreProvenance(segments);
  check("clean composed answer -> no hallucination risk", r.hallucinationRisk, false);
  check("clean composed answer -> no issues", r.issues.length, 0);
  check("archivePercent + aiPercent == 100", r.archivePercent + r.aiPercent, 100);
  check("archiveChars matches q2 length", r.archiveChars, q2.answer.length);
}

// --- scoreProvenance: sentence-level citation ---
{
  const segments = [{ type: "archive", text: q2Sentences[1], sourceId: "q2:s2", source: "qa" }];
  const r = scoreProvenance(segments);
  check("sentence-level citation verifies", r.hallucinationRisk, false);
  check("sentence-level citation -> 100% archive", r.archivePercent, 100);
}

// --- scoreProvenance: fabricated/paraphrased archive segment ---
{
  const segments = [
    { type: "archive", text: "This is not actually in the bank at all.", sourceId: "q2", source: "qa" },
  ];
  const r = scoreProvenance(segments);
  check("non-verbatim archive segment -> hallucination risk", r.hallucinationRisk, true);
  check("non-verbatim archive segment -> flagged in issues", r.issues.length > 0, true);
}

// --- scoreProvenance: citation to a nonexistent entry ---
{
  const segments = [{ type: "archive", text: "whatever", sourceId: "q999", source: "qa" }];
  const r = scoreProvenance(segments);
  check("citation to nonexistent entry -> hallucination risk", r.hallucinationRisk, true);
}

// --- scoreProvenance: unknown segment type ---
{
  const segments = [{ type: "mystery", text: "???" }];
  const r = scoreProvenance(segments);
  check("unknown segment type -> hallucination risk", r.hallucinationRisk, true);
}

// --- scoreProvenance: segment with empty/missing text ---
{
  const segments = [{ type: "ai", text: "" }];
  const r = scoreProvenance(segments);
  check("empty-text segment -> hallucination risk", r.hallucinationRisk, true);
}

// --- scoreProvenance: no segments at all ---
{
  const r = scoreProvenance([]);
  check("empty segments array -> hallucination risk", r.hallucinationRisk, true);
}
{
  const r = scoreProvenance(null);
  check("null segments -> hallucination risk", r.hallucinationRisk, true);
}

// --- scoreProvenance: mixed clean multi-segment (the worked example from
// generate-system-prompt-v2.js) ---
{
  const q3 = QA_BANK.find((e) => e.id === "q3");
  const q9 = QA_BANK.find((e) => e.id === "q9");
  const q9Sentences = splitSentences(q9.answer);
  const segments = [
    { type: "ai", text: "This touches two connected questions in the material: why speaking out was hard, and what silence actually protected." },
    { type: "archive", text: "Speaking openly could expose a person, a family, or a community. It could reopen stigma or create new harm.", sourceId: "q3", source: "qa" },
    { type: "ai", text: "But that protection had a cost of its own." },
    { type: "archive", text: q9Sentences[1], sourceId: "q9:s2", source: "qa" },
  ];
  const r = scoreProvenance(segments);
  check("worked-example composed answer -> no hallucination risk", r.hallucinationRisk, false);
  check("worked-example -> has both archive and AI chars", r.archiveChars > 0 && r.aiChars > 0, true);
}

// --- refusal content must never be citable as archive material, even if
// the quoted text is byte-for-byte real refusal text (a composed answer
// citing a refusal as if it were approved archive content is itself a
// fabrication, not a valid quote — refusals are never composed in the
// first place) ---
{
  const r1 = REFUSAL_BANK.find((r) => r.id === "r1");
  const segments = [{ type: "archive", text: r1.answer, sourceId: "r1", source: "refusal" }];
  const r = scoreProvenance(segments);
  check("citing a refusal entry as archive -> hallucination risk", r.hallucinationRisk, true);
}
// Same bug, different entry point: claiming source "refusal" for an id
// that also happens to collide with nothing in QA/PROCESS should still
// fail closed rather than silently resolving against the wrong bank.
{
  const segments = [{ type: "archive", text: "irrelevant", sourceId: "q2", source: "refusal" }];
  const r = scoreProvenance(segments);
  check("declared source \"refusal\" is rejected even for a real qa id", r.hallucinationRisk, true);
}

// --- one bad citation among otherwise-good ones still flags the whole answer ---
{
  const segments = [
    { type: "archive", text: q2.answer, sourceId: "q2", source: "qa" },
    { type: "archive", text: "fabricated sentence not from any entry", sourceId: "q7", source: "qa" },
  ];
  const r = scoreProvenance(segments);
  check("one bad citation among good ones -> still hallucination risk", r.hallucinationRisk, true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
