# The Mediation Room — Seed Prototype

A static, client-side web chatbot prototype exploring how AI can support
ethical public presentation of testimony without exposing the people behind
it. Built for the Donkosira × Jiwe Games for Thought × SOAS × Code for Africa
AI Sandbox seed grant.

**All testimony in this prototype is synthetic**, written for demonstration
purposes only. See `docs/methodology-note.md`.

## Running it

No build step, no server, no API keys. Open `index.html` directly in a
browser, or serve the folder with any static file server:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
index.html   — screens/markup (disclaimer, archive summary, chat, reflection)
styles.css   — visual design
matcher.js   — content bank + retrieval/refusal matching logic (no DOM deps)
app.js       — DOM wiring: screens, chat rendering, mediation labels
test-matcher.js   — Node test suite for the matching logic (run: node test-matcher.js)
browser-check.js  — Playwright smoke test of the full click-through flow
docs/
  interaction-flow.md   — the screen-by-screen design spec and rationale
  methodology-note.md   — the public-facing disclosure text
```

## How this maps to the grant deliverables

Per the Revised Workplan and Milestone Roadmap:

- **July ("Prototype Structure and Interface")** — this repo *is* that
  deliverable: a basic web chatbot interface, a disclaimer/limitations
  screen, and a project folder structure with documentation.
- **August ("Demo Content and Safety Rules")** — also substantially covered
  already: the synthetic demo knowledge base (`matcher.js`'s `QA_BANK` /
  `PROCESS_BANK` / `VOICE_INTRO`), the safety/refusal rules (`REFUSAL_BANK`),
  and the sample Q&A test set (`test-matcher.js`) all exist. What's left for
  August proper is partner review and any content changes that come out of
  it, not a rebuild.

## Why no LLM API / backend

The matching logic in `matcher.js` is a small TF-IDF + cosine-similarity
retriever running entirely in the browser over the fixed, approved answer
bank — it does not call an external model. This was a deliberate choice for
this stage, not a limitation to hide:

1. **Safety.** The answer bank is fixed and reviewed. A free-generating LLM
   could invent testimony-like detail (explicitly against Refusal Rule 6) or
   answer confidently on a topic it should refuse. Retrieval-over-a-fixed-bank
   can't do that — every possible answer was written and reviewed in advance.
2. **Open-source boundary.** Per `Open-Source, Data, and Background IP
   Boundary.docx`, this project should open-source a "generic RAG setup
   note or simplified reference implementation," not private RAG
   architecture. A fully client-side matcher *is* that generic reference
   implementation — there's no backend or private infrastructure to
   accidentally expose.
3. **Budget.** No API costs, no server to run or secure, fits a
   $3,000/7-month seed budget.

If a future phase needs broader free-text understanding, the natural next
step is swapping `matcher.js`'s retrieval function for an embeddings-based
lookup (still over the fixed, reviewed answer bank — never free generation
against raw testimony), which is a contained change; nothing else in the
app needs to know the difference.

## Open questions for partner review

Carried over from the concept brief's own review list, plus a few the build
surfaced:

1. Does the "see the mediation" rough-draft toggle (on the opening voice
   passage and two Q&A answers) resolve the concern that the synthetic
   testimony reads as too polished/literary — or does showing an "earlier
   draft" raise its own new questions about what's being demonstrated?
2. Is the confidence threshold for free-text matching (in `matcher.js`,
   `CONFIDENCE_THRESHOLD` and the shared-token guard) tuned correctly? It
   currently favours **false "unknown"** over **false confident match** —
   reviewers should try to break it with real off-script questions.
3. Reflection-screen answers are not persisted anywhere by design. If
   Donkosira/SOAS later want to *collect* reflection responses for research
   or reporting, that needs an explicit consent flow — not a silent
   addition.
4. The MOU (Article 1.1.2.4) commits to *monthly* Creative-Commons blog
   posts; the roadmap currently schedules public-facing writing only at
   Nov/Dec closeout. Worth reconciling explicitly with Sarah Gowon.
