# Brief: testing "Held Fragments" as a step, not a launch

Goal: find out whether an animated, faceless presence actually helps testers understand what they're talking to — or whether it's a distraction, feels performative given the subject matter, or just doesn't read the way the design intends. This is a research step, not a decision to ship it. Keep it reversible and cheap to remove.

## Where it goes — two options, pick one to run first

**Option A — standalone moment (recommended to run first).** A new interstitial screen between the current screen 1 (archive summary) and screen 2 (chat room): "Before you enter — who you're about to talk to." The avatar plays through idle → listening → speaking → refusing in a short fixed sequence (a few seconds each, captioned), then a "Continue to the room" button appears. This isolates the avatar as its own thing testers react to, with nothing else competing for attention, and it's a self-contained screen — it doesn't touch `app.js`'s chat-rendering code at all, so it's genuinely low-risk to add and pull back out.

**Option B — ambient presence in the chat itself.** A small persistent avatar next to "The Mediation Room" in the chat header, live-animating in whichever state matches what's actually happening (idle between exchanges, listening while a question is in flight, speaking as a response renders, refusing on a refusal). This is the real integration test — does it hold up embedded in actual use, not just as a demo reel — but it's a bigger change (touches `addBotResponse()`/`askQuestion()` state transitions) and harder to isolate if testers react badly to something else on the page at the same time.

Recommendation: run A first, with a small group, before touching B. If A lands well, B is the natural next step and this brief's state-mapping section below is already written for it.

## Gating — reuse the existing test-mode pattern, don't touch the default experience

Same mechanism already in place for the preset/version toggle and dev badge (`?preset` test mode): the avatar step should only appear when that flag is present, never for a normal visitor. Concretely — add a companion flag (e.g. `?avatar=1`, combinable with `?preset=`) rather than folding it into `?preset` itself, since testers should be able to test the avatar against the local matcher alone, without also needing to be on an LLM-backed preset.

## For Option A: the fixed sequence and caption copy

Suggested pacing (each state holds ~4-5s, matching the avatar's own slow easing):
1. **Idle** — caption: "This is who you're about to talk to."
2. **Listening** — caption: "It listens for a question."
3. **Speaking** — caption: "And answers only from a small, fixed set of reviewed material."
4. **Refusing** — caption: "Some questions, it declines — on purpose."

Then: "Continue to the room →"

This sequence is doing real work, not just showing off the animation — it's a compressed version of the same disclosure the screen 0 text already makes ("not a witness," "drawn from a small, fixed set of pre-written answers"), just shown instead of told. Worth testers' reactions specifically to whether the *showing* adds understanding beyond the existing *telling*, or is redundant with it.

## For Option B: state → real event mapping

| Avatar state | Fires on |
|---|---|
| idle | default, between exchanges |
| listening | `askQuestion()` called, before `respondTo()`/the API call resolves |
| speaking | result type is `match` |
| refusing | result type is `refusal` |

One real caveat worth flagging before building this: the local matcher resolves instantly, so "listening" would flash for a few milliseconds and barely register — this mapping only becomes meaningful once it's sitting in front of the OpenRouter-backed preset, where there's real latency to fill. Testing Option B against the local matcher alone will undersell it.

## What to ask testers

Keep it to a handful of specific reactions, not a general "thoughts?" — vague prompts get vague answers:

1. Before you knew anything else — what did you think this was? (a mascot, a real person, something else)
2. Did it change how you expected to be talked to, compared to the text-only disclaimer you'd have otherwise?
3. Did the "refusing" moment feel like withdrawal, or did it feel like something else — cold, evasive, dramatic?
4. Would you rather this weren't here at all?

Question 4 matters — this is a genuine test of whether the avatar helps, not a pitch for it. A clean "no, remove it" from several testers is a real, useful result.

## Capturing feedback — respecting the app's own no-silent-telemetry stance

The project has already deliberately chosen not to instrument or persist anything — the reflection screen says outright "these reflections stay in your browser only." Bolting a feedback-collection form onto this test step would quietly break that same commitment for the sake of the AI's own visual design, which the app can't do consistently. Two options that don't require that:

- **Facilitated/moderated testing** — a tester goes through Option A with someone present (video call or in person) who notes reactions to the four questions above. No app changes needed at all beyond building the step itself.
- **Out-of-band written feedback** — after testing, testers fill in the four questions in a shared doc or form the team already controls (outside this app), the same way any other qualitative feedback for this project would be collected. Simple, and doesn't compromise the app's own stated design.

Don't add analytics, session recording, or a submit-to-server feedback box inside the app for this — that's exactly the kind of thing "General-public launch readiness — analytics/SEO" already flagged as deferred, and this test step doesn't need it to work.

## What decides whether this graduates

Not a vote — a few concrete signals worth watching for across testers:
- Does "unfaced/fragments" reliably read as *deliberate* (a design choice) rather than *unfinished* (a placeholder that should have a face)?
- Does the refusing state actually land as dignified restraint, or does more than one tester independently describe it as cold/creepy/off-putting? That's the one state most likely to misfire, since it's the one doing the most emotional work.
- Any tester who says the avatar made the "who am I talking to" framing *clearer* is a genuine win — that's the actual thing being tested, not the animation quality on its own.

## Implementation note

Building either option is a real-repo change (`live/` on Vercel), same handoff boundary as everything else in this project — this session can build the interstitial screen's markup/CSS/JS as a ready-to-drop-in piece if wanted, but wiring it into the actual site and the `?avatar=` flag needs to happen where the real repo lives.
