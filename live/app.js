/**
 * app.js — DOM wiring for The Mediation Room prototype.
 * Depends on matcher.js being loaded first (LABELS, VOICE_INTRO, QA_BANK,
 * PROCESS_BANK, REFUSAL_BANK, respondTo are all globals in the browser).
 */

// Kept in sync by hand with index.html's static #archive-summary-text and
// #reflect-archive-recap fallback content — see the blank-state note near
// those elements in index.html for why they're duplicated.
const ARCHIVE_SUMMARY_TEXT =
  "This history involves descent-based discrimination: people treated as lower-status — denied land, marriage, work, or a public voice — because of who their ancestors were, not anything they did themselves. These histories are often difficult to document because speaking openly can reopen the very stigma it describes. Silence may protect individuals, but it also makes the harm harder to understand, remember, or challenge.";

const METHODOLOGY_TEXT = `This prototype was built by Jiwe Games for Thought with Donkosira, SOAS (Marie Rodet), and Code for Africa's AI Sandbox fellowship. Every piece of testimony in this demo is synthetic — written to test the interaction model, not drawn from a real witness. It is not a simulation of a real survivor, not a replacement for testimony or human facilitation, and not an oracle of historical truth. It exists to make visible how testimony changes as it moves through memory, research mediation, and AI mediation, and to test refusal rules and mediation labels before any real testimony is ever involved.`;

// "Lived Experience", "The Interview", and "The Translation" have no screen
// behind them — on purpose. Clicking them opens an explanation instead of
// navigating, which is itself part of the point: some layers can't be
// retrieved or clicked into. Each body also names the fact that THIS demo
// specifically never populated these three layers at all (no interview, no
// translation/anonymisation pass, real or synthetic, was ever done) —
// distinct from the general claim that no interface can ever hand you raw
// lived experience, a private interview, or an unreviewed translation
// directly. Both things are true; conflating them would overclaim what this
// particular prototype is sitting on.
const LAYER_INFO = {
  lived: {
    title: "Lived Experience",
    body: "This is the original moment itself — before memory, before language, before anyone else touches it. This prototype can't take you here directly, and that's deliberate: some things can't be retrieved, clicked into, or reproduced. Everything you can reach in this room is already at least one step removed from this. In this synthetic demo specifically, there is no real lived experience behind this layer either — it's shown so the full real-world pipeline stays honest about what any testimony work is built on top of, not because real content sits just out of reach here.",
  },
  interview: {
    title: "The Interview",
    body: "This is where someone tells their story out loud, in their own words, to another person — already shaped by memory, by what they choose to share, and by who's listening. This prototype can't take you here directly either: an interview is a private moment between two people, not something a public interface can hand you raw. In this synthetic demo specifically, no interview ever took place — this layer illustrates a real stage in the pipeline this design is meant for, not a real conversation being withheld from you.",
  },
  translation: {
    title: "The Translation",
    body: "This is where a raw interview becomes usable material: anonymised, translated, summarised, and reviewed by researchers before it can safely be shared. Names, places, and identifying detail get stripped out here — protecting the person, but also flattening some of what made their account theirs. This prototype doesn't show you this step directly either. In this synthetic demo specifically, no real interview ever existed to translate — this layer illustrates a real stage in the pipeline, not a real document being withheld from you.",
  },
};

let reflectShown = false;

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function showScreen(n) {
  $all(".screen").forEach((s) => s.classList.remove("active"));
  $(`#screen-${n}`).classList.add("active");
  $(`#screen-${n}`).focus();
  setLayer(n === 1 ? "research" : n >= 2 ? "ai" : null);
}

function setLayer(active) {
  $all(".layer-indicator .layer").forEach((el) => {
    el.classList.toggle("current", el.dataset.layer === active);
  });
}

function toggleMethodologyModal() {
  $("#methodology-modal").classList.toggle("open");
}

// Renders the exact same HARD_RULES list (matcher.js) that's injected
// verbatim into the AI's own system prompt — see generate-system-prompt.js
// and generate-system-prompt-v2.js. One source of truth: what's shown here
// can never quietly drift from what's actually enforced. If this app is
// ever switched to Version B (composed answers), append
// HARD_RULES_VERSION_B_ADDITIONS here too.
function renderRulesList() {
  const list = $("#rules-list");
  if (!list || list.childElementCount > 0) return; // render once
  const rules = typeof HARD_RULES !== "undefined" ? HARD_RULES : [];
  rules.forEach((r) => {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = r.title;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(" — " + r.detail));
    if (r.rationale) {
      const why = document.createElement("div");
      why.className = "rule-rationale";
      why.textContent = "Why: " + r.rationale;
      li.appendChild(why);
    }
    list.appendChild(li);
  });
}

function toggleRulesModal() {
  renderRulesList();
  $("#rules-modal").classList.toggle("open");
}

function showLayerInfo(key) {
  const info = LAYER_INFO[key];
  if (!info) return;
  $("#layer-info-title").textContent = info.title;
  $("#layer-info-body").textContent = info.body;
  $("#layer-info-modal").classList.add("open");
}

function closeLayerInfo() {
  $("#layer-info-modal").classList.remove("open");
}

function goToChatRoom() {
  showScreen(2);
  if (!$("#chat-log").dataset.introShown) {
    addBotVoiceIntro();
    $("#chat-log").dataset.introShown = "1";
  }
}

function handleLayerClick(key) {
  if (key === "research") {
    showScreen(1);
  } else if (key === "ai") {
    goToChatRoom();
  } else {
    showLayerInfo(key);
  }
}

function toggleInlineMethodologyNote() {
  const note = $("#methodology-note-0");
  note.classList.toggle("open");
  $("#methodology-toggle-0").setAttribute(
    "aria-expanded",
    note.classList.contains("open") ? "true" : "false"
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function labelChip(label, container) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "label-chip";
  chip.setAttribute("aria-expanded", "false");
  chip.innerHTML = `ⓘ ${escapeHtml(label.name)}`;
  const explain = document.createElement("div");
  explain.className = "label-explain";
  explain.textContent = label.explanation;
  chip.addEventListener("click", () => {
    explain.classList.toggle("open");
    chip.setAttribute("aria-expanded", explain.classList.contains("open") ? "true" : "false");
  });
  container.appendChild(chip);
  container.appendChild(explain);
}

function addUserMessage(text) {
  const log = $("#chat-log");
  const div = document.createElement("div");
  div.className = "msg user";
  div.innerHTML = `<div class="role">You</div><div class="bubble">${escapeHtml(text)}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function addBotVoiceIntro() {
  const log = $("#chat-log");
  const div = document.createElement("div");
  div.className = "msg bot";
  div.innerHTML = `<div class="role">The Mediation Room</div><div class="bubble"></div>`;
  const bubble = $(".bubble", div);
  const p = document.createElement("div");
  p.style.whiteSpace = "pre-line";
  p.textContent = VOICE_INTRO.polished;
  bubble.appendChild(p);
  labelChip(VOICE_INTRO.label, bubble);
  addMediationToggle(bubble, VOICE_INTRO.polished, VOICE_INTRO.rough);
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function addMediationToggle(bubble, polished, rough) {
  if (!rough) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toggle-mediation";
  btn.textContent = "See the mediation → compare an earlier draft";
  const roughBox = document.createElement("div");
  roughBox.className = "rough-draft";
  roughBox.innerHTML = `<span class="rough-label">Earlier, rougher draft — also synthetic, shown to demonstrate editorial mediation</span>`;
  const roughText = document.createElement("div");
  roughText.style.whiteSpace = "pre-line";
  roughText.textContent = rough;
  roughBox.appendChild(roughText);
  btn.addEventListener("click", () => {
    roughBox.classList.toggle("open");
    btn.textContent = roughBox.classList.contains("open")
      ? "Hide the earlier draft"
      : "See the mediation → compare an earlier draft";
  });
  bubble.appendChild(btn);
  bubble.appendChild(roughBox);
}

function addBotResponse(result) {
  const log = $("#chat-log");
  const div = document.createElement("div");
  let roleLabel = "The Mediation Room";
  let cls = "bot";
  let answerText = "";
  let label = null;
  let rough = null;

  if (result.type === "refusal") {
    cls = "bot refusal";
    answerText = result.answer;
    label = LABELS.WITHHELD;
  } else if (result.type === "unknown") {
    cls = "bot unknown";
    answerText =
      "The available material does not support a reliable answer to this question.";
    label = LABELS.UNKNOWN;
  } else if (result.type === "match") {
    answerText = result.entry.answer;
    label = result.entry.label;
    rough = result.entry.rough || null;
  } else if (result.type === "composed") {
    cls = "bot composed";
    label = result.label;
  }

  div.className = `msg ${cls}`;
  div.innerHTML = `<div class="role">${roleLabel}</div><div class="bubble"></div>`;
  const bubble = $(".bubble", div);

  if (result.type === "composed" && Array.isArray(result.segments)) {
    result.segments.forEach((seg) => {
      const segEl = document.createElement("span");
      segEl.className = seg.type === "archive" ? "segment-archive" : "segment-ai";
      segEl.textContent = (seg.text || "") + " ";
      bubble.appendChild(segEl);
      if (seg.type === "archive" && seg.sourceId) {
        const src = document.createElement("span");
        src.className = "segment-source";
        src.textContent = `— ${seg.sourceId}`;
        bubble.appendChild(src);
      }
    });
  } else {
    const p = document.createElement("div");
    p.textContent = answerText;
    bubble.appendChild(p);
  }

  if (label) labelChip(label, bubble);
  if (rough) addMediationToggle(bubble, answerText, rough);

  // Refusals aren't arbitrary — say briefly why this one exists, using the
  // same rationale text that's also shown in the "View the rules" panel
  // and given to the AI itself, so it's never a different explanation in
  // three different places.
  if (result.type === "refusal" && result.rationale) {
    const why = document.createElement("div");
    why.className = "refusal-rationale";
    why.textContent = "Why refused: " + result.rationale;
    bubble.appendChild(why);
  }

  if (result.type === "composed" && result.provenance) {
    const badge = document.createElement("div");
    badge.className = "provenance-badge";
    badge.textContent =
      `Archive ${result.provenance.archivePercent}% / AI ${result.provenance.aiPercent}% (code-verified)`;
    bubble.appendChild(badge);
  }

  if (result.type === "unknown" && result.suggestions && result.suggestions.length) {
    const sugWrap = document.createElement("div");
    sugWrap.className = "suggestions";
    const lbl = document.createElement("div");
    lbl.className = "label";
    lbl.style.fontSize = "0.78rem";
    lbl.style.color = "var(--ink-soft)";
    lbl.textContent = "You might try asking:";
    sugWrap.appendChild(lbl);
    result.suggestions.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s.text;
      b.addEventListener("click", () => askQuestion(s.text));
      sugWrap.appendChild(b);
    });
    bubble.appendChild(sugWrap);
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// "?preset" in the URL puts the room into testing mode: the version
// toggle becomes visible and answers can come from either OpenRouter
// preset instead of the local matcher. Real visitors (no query param) never
// see the toggle and always get the local matcher — per the README's
// private-test-first rollout plan, neither preset is a default yet.
function usePresetTestMode() {
  return new URLSearchParams(window.location.search).has("preset");
}

// The active version persists per-session (sessionStorage) so switching
// screens or asking several questions doesn't reset the tester's choice.
// A bare "?preset" (no value) defaults to "a" — this keeps existing
// testing links/bookmarks from before the toggle existed working exactly
// as they did.
function getActiveVersion() {
  const stored = sessionStorage.getItem("mediationRoomVersion");
  if (stored === "local" || stored === "a" || stored === "b") return stored;
  const urlValue = new URLSearchParams(window.location.search).get("preset");
  if (urlValue === "b" || urlValue === "local") return urlValue;
  return "a";
}

function setActiveVersion(v) {
  sessionStorage.setItem("mediationRoomVersion", v);
  renderVersionToggle();
}

function renderVersionToggle() {
  const wrap = $("#version-toggle");
  if (!wrap) return;
  if (!usePresetTestMode()) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";
  const active = getActiveVersion();
  $all(".version-btn", wrap).forEach((b) => {
    b.classList.toggle("active", b.dataset.version === active);
  });
}

function labelById(id) {
  return Object.values(LABELS).find((l) => l.id === id) || LABELS.UNKNOWN;
}

// Adapts a preset proxy's response into the shape addBotResponse() already
// expects from the local matcher, so rendering code doesn't need to know
// which path (local / Version A / Version B) answered:
//   - simple match  -> { type: "match", entry: {...} }
//   - composed match (Version B only) -> { type: "composed", segments, label, provenance }
//   - refusal / unknown -> passed through with the same shape either way
function adaptPresetResult(json) {
  if (json.type === "match" && json.mode === "composed") {
    return {
      type: "composed",
      segments: json.segments,
      label: labelById(json.label),
      provenance: json.provenance || null,
    };
  }
  if (json.type === "match") {
    return {
      type: "match",
      entry: {
        id: json.id,
        answer: json.answer,
        label: labelById(json.label),
        rough: json.rough || null,
      },
    };
  }
  if (json.type === "refusal") {
    return {
      type: "refusal",
      answer: json.answer,
      rule: json.rule,
      id: json.id,
      rationale: json.rationale,
    };
  }
  return { type: "unknown", label: LABELS.UNKNOWN, suggestions: json.suggestions || [] };
}

async function askQuestion(text) {
  addUserMessage(text);

  const version = usePresetTestMode() ? getActiveVersion() : "local";

  if (version === "a" || version === "b") {
    const endpoint = version === "b" ? "/api/mediate-v2" : "/api/mediate";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `proxy responded ${res.status}`);
      }
      const json = await res.json();
      addBotResponse(adaptPresetResult(json));
    } catch (e) {
      console.error(`preset path (version ${version}) failed, falling back to local matcher:`, e);
      addBotResponse(respondTo(text));
    }
  } else {
    addBotResponse(respondTo(text));
  }

  maybeShowReflectPrompt();
}

function maybeShowReflectPrompt() {
  const log = $("#chat-log");
  const exchanges = $all(".msg.user", log).length;
  if (exchanges >= 3 && !reflectShown) {
    reflectShown = true;
    $("#reflect-btn-wrap").style.display = "block";
  }
}

function renderStarterQuestions() {
  const row = $("#starter-chip-row");
  row.innerHTML = "";
  QA_BANK.forEach((e) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = e.question;
    b.addEventListener("click", () => askQuestion(e.question));
    row.appendChild(b);
  });
}

function populateReflectionRecap() {
  $("#reflect-archive-recap").textContent = ARCHIVE_SUMMARY_TEXT;
}

function wireUp() {
  $("#enter-btn").addEventListener("click", () => showScreen(1));
  $("#methodology-toggle-0").addEventListener("click", toggleInlineMethodologyNote);
  $all(".open-methodology").forEach((b) => b.addEventListener("click", toggleMethodologyModal));
  $("#methodology-modal-close").addEventListener("click", toggleMethodologyModal);
  $("#methodology-body").textContent = METHODOLOGY_TEXT;

  $all(".open-rules").forEach((b) => b.addEventListener("click", toggleRulesModal));
  $("#rules-modal-close").addEventListener("click", toggleRulesModal);

  $("#enter-room-btn").addEventListener("click", goToChatRoom);

  $all(".back-btn").forEach((b) => {
    b.addEventListener("click", () => showScreen(Number(b.dataset.back)));
  });
  $all(".layer-indicator .layer").forEach((b) => {
    b.addEventListener("click", () => handleLayerClick(b.dataset.layer));
  });
  $("#layer-info-close").addEventListener("click", closeLayerInfo);

  $all(".version-btn").forEach((b) => {
    b.addEventListener("click", () => setActiveVersion(b.dataset.version));
  });
  renderVersionToggle();

  renderStarterQuestions();

  $("#chat-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = $("#chat-input");
    const val = input.value.trim();
    if (!val) return;
    askQuestion(val);
    input.value = "";
  });

  $("#reflect-btn").addEventListener("click", () => {
    populateReflectionRecap();
    showScreen(3);
  });
  $("#reflect-btn-wrap").style.display = "none";

  $("#finish-btn").addEventListener("click", () => {
    showScreen(1);
  });
}

document.addEventListener("DOMContentLoaded", wireUp);
