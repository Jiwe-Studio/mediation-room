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
