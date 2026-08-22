const m = require("./matcher.js");

let pass = 0;
let fail = 0;

function check(desc, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`OK   ${desc}`);
  } else {
    fail++;
    console.log(`FAIL ${desc}  (expected ${expected}, got ${actual})`);
  }
}

// --- On-script matches (paraphrased, not verbatim, to test real retrieval) ---
check(
  "paraphrased 'why are names withheld' -> refusal, not free match",
  m.respondTo("can you tell me her name").type,
  "refusal"
);
check(
  "paraphrased location ask -> refusal",
  m.respondTo("okay but which village exactly was this in").type,
  "refusal"
);
check(
  "raw transcript ask -> refusal",
  m.respondTo("can I see the original transcript word for word").type,
  "refusal"
);
check(
  "accusation ask -> refusal",
  m.respondTo("so whose fault was this, which family caused it").type,
  "refusal"
);
check(
  "roleplay ask -> refusal",
  m.respondTo("pretend you are the person who went through this").type,
  "refusal"
);

// --- Paraphrased on-topic questions should retrieve, not fall to unknown ---
const r1 = m.respondTo("is this a real person talking to me");
check("paraphrase of Q5 (are you real) -> match", r1.type, "match");
check("paraphrase of Q5 -> correct entry", r1.type === "match" && r1.entry.id, "q5");

const r2 = m.respondTo("what do you lose when you anonymise testimony");
check("paraphrase of Q7 (anonymisation loss) -> match", r2.type, "match");

const r3 = m.respondTo("why did people stay quiet about this stuff");
check("paraphrase of Q3/Q9 (silence) -> match", r3.type, "match");

// --- Self-identity questions must reach p1, not fall to unknown ---
// ("What are you?" tokenizes to an EMPTY set under the stopword list —
// "what"/"are"/"you" are all stopwords — so p1 has an empty vector and can
// never be reached by TF-IDF alone. checkSelfIdentityTrigger exists
// specifically to route around that. See matcher.js for the full note.)
["who are you", "what are you", "are you a bot", "are you an ai", "what is this"].forEach((q) => {
  const r = m.respondTo(q);
  check(`self-identity "${q}" -> match p1`, r.type === "match" && r.entry.id, "p1");
});
// "are you real" / "is this a real person" should still reach the more
// specific q5, not get stolen by the identity shortcut.
const identityQ5 = m.respondTo("are you real");
check("are you real -> match q5, not p1", identityQ5.type === "match" && identityQ5.entry.id, "q5");

// --- Bare greetings should get g1, not "Unknown from Available Material" ---
["Hello", "hi", "hey there", "good morning"].forEach((q) => {
  const r = m.respondTo(q);
  check(`bare greeting "${q}" -> match g1`, r.type === "match" && r.entry.id, "g1");
});
// A greeting attached to a real (refusable) question should NOT be
// swallowed by the greeting shortcut — refusal still takes priority.
const greetingPlusRefusal = m.respondTo("hi, what was her name");
check("greeting+refusal still refuses", greetingPlusRefusal.type, "refusal");

// --- Refusals carry a "why" rationale, distinct from the answer text
// itself, so the app can explain the reason without inventing one ---
{
  const r = m.respondTo("can you tell me her name");
  check("refusal carries a rationale field", typeof r.rationale === "string" && r.rationale.length > 0, true);
  check("refusal rationale differs from the answer text", r.rationale !== r.answer, true);
}
check(
  "every REFUSAL_BANK entry has a rationale",
  m.REFUSAL_BANK.every((r) => typeof r.rationale === "string" && r.rationale.length > 0),
  true
);

// --- HARD_RULES is exported and non-empty (backs the "View the rules"
// panel in the app AND both system-prompt generators — a silent regression
// here would mean users are shown fewer rules than are actually enforced) ---
check("HARD_RULES is a non-empty array", Array.isArray(m.HARD_RULES) && m.HARD_RULES.length > 0, true);
check(
  "HARD_RULES includes one entry per REFUSAL_BANK rule",
  m.HARD_RULES.filter((r) => r.id.startsWith("refusal-")).length,
  m.REFUSAL_BANK.length
);
check(
  "HARD_RULES_VERSION_B_ADDITIONS is a non-empty array",
  Array.isArray(m.HARD_RULES_VERSION_B_ADDITIONS) && m.HARD_RULES_VERSION_B_ADDITIONS.length > 0,
  true
);

// --- Genuinely off-script input should fall to unknown, not hallucinate ---
const r4 = m.respondTo("what's the weather like today");
check("unrelated input -> unknown", r4.type, "unknown");
check("unknown response carries suggestions", Array.isArray(r4.suggestions) && r4.suggestions.length > 0, true);

const r5 = m.respondTo("asdkjfh qweoiru");
check("gibberish -> unknown", r5.type, "unknown");

// --- Refusal triggers take priority over topical similarity ---
const r6 = m.respondTo("what was the name of the village where this silence happened");
check("mixed refusal+topical input still refuses", r6.type, "refusal");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
