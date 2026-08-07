# The Mediation Room — Interaction Flow

Draft for partner review (Donkosira / SOAS / Marie Rodet) before build sign-off.
This maps the full user journey end to end and explains the design reasoning
behind each screen. It's meant to be read alongside the Concept Brief, not
instead of it — the content (testimony pack, labels, refusal rules) is
unchanged; this document is about sequence and structure.

## Design principle

The "Living Witness" structure only works if the *interface itself* shows the
layering, not just the copy. So every screen after the landing page keeps a
small persistent indicator of how many layers of mediation stand between the
user and the original lived experience:

`Lived experience → Memory & narration → Research mediation → AI mediation`

with the current layer highlighted. This turns "mediation" from something the
brief *explains* into something the user *sees happening* the whole time
they're in the room.

## Screen 0 — Entry / Disclaimer

Short, not a wall of text. One paragraph, one button, one optional expand.

> **The Mediation Room**
> This is a prototype. All testimony you'll read here is synthetic —
> written for this demo, not a real person's words. It exists to help you
> understand how testimony changes as it becomes public, not to let you
> "talk to a survivor."
>
> [ Enter ]   ( Read the full methodology note ▾ )

The expandable note holds the fuller ethical framing from the brief (synthetic
content disclosure, partner list, what the prototype is/isn't). Keeping it
collapsed by default respects that most users won't read a long disclaimer
before they've seen why it matters — but it's one tap away, and it's the same
text referenced in Screen 3's close.

## Screen 1 — Public Archive Summary

The flat, safe public version, shown exactly as drafted in the content pack,
followed by the existing prompt:

> This summary is accurate but incomplete. What is missing when lived
> experience is reduced to a public record?
>
> [ Enter the Mediation Room ]

This screen is the control condition — it's what "responsible public
history" looks like *without* AI mediation, so the user has something to
compare the chat experience against later. Worth protecting: don't let this
screen get skipped or rushed, since the reflection screen depends on the user
having actually read it.

## Screen 2 — The Mediation Room (chat surface)

- **Header:** the four-layer indicator described above, always visible.
- **Starter questions:** the ten buttons from the content pack, shown before
  the first message. After the first exchange they collapse into a
  "suggested questions" strip above the input, so returning to them doesn't
  require scrolling back up.
- **Free text input:** always available alongside the buttons — this is
  what makes the off-script handling (Task 2) necessary rather than optional.
- **Every answer renders with three things:** the text, a mediation-label
  chip, and a small (i) affordance that surfaces that label's user-facing
  explanation from Step 4 of the brief. Labels are never color-only —
  colorblind users need the label *name* visible, not just a swatch.
- **Refusals get distinct visual treatment** (a muted panel, a small
  lock-style icon) so a refusal reads as *a boundary was reached on purpose*,
  not as *the bot broke*. This is the brief's own point about refusal being
  part of the experience, made visible rather than just written down.
- **Unmatched questions** (Label 5, "Unknown from Available Material") get
  their own distinct, non-apologetic treatment: state plainly that the
  material doesn't support an answer, then surface the two or three closest
  starter questions rather than leaving a dead end.
- **"See the mediation" toggle:** on the handful of answers drawn from the
  synthetic testimony voice, an optional toggle reveals a rougher draft next
  to the polished one (Task 3). This is the answer to your own review
  question about the voice feeling "too polished" — instead of trying to
  perfectly calibrate one static tone, the interface shows editorial
  smoothing happening, which is more honest than either extreme.

No conversation state persists beyond the browser tab (no localStorage, no
server-side log of what a user typed) — partly a technical constraint of a
static demo, partly a genuine ethical plus: nothing a user types about their
own experience while exploring this sticks around anywhere.

## Screen 3 — Reflection close

Reachable either after a handful of exchanges or via a persistent low-key
"I'm ready to reflect" affordance (never forced — some users will want to
keep asking questions).

- Re-shows the Screen 1 archive summary alongside the three reflection
  prompts as open text fields, inviting an explicit before/after comparison:
  *here's what you knew at the start, here's what the room surfaced.*
- Text entered here is local to the session only — it's a thinking prompt,
  not a data-collection form. (If Donkosira/SOAS later want to *use*
  reflection responses for research or reporting, that needs its own
  consent flow — flagging so it doesn't get added silently later.)
- Closing line reiterates the synthetic-content disclosure and links out to
  the full methodology note, so the last thing a user sees restates what the
  first thing told them.

## Footer / always-available

A persistent methodology/about link (not just on entry) containing: the
synthetic-content disclosure, the partner list and roles, a summary of the
refusal rules, and a contact path for concerns or feedback. Living Witness
worked because the archive was something you could keep interrogating — this
should feel available to re-read, not just something you clicked past once.

## Why this is buildable at seed-grant scope

Everything above runs as a static, client-side page — no backend, no LLM API
key, no server logs to secure. That matters for three reasons tied to the
actual grant documents: it's cheap enough to fit a $3,000/7-month budget, it's
safely open-sourceable in full under the Open-Source/IP Boundary note (there's
no private RAG architecture or backend to accidentally expose), and it
satisfies July's "basic web chatbot interface + disclaimer + repo" deliverable
without needing infrastructure decisions that would eat the rest of the
budget.
