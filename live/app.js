/**
 * app.js — DOM wiring for The Mediation Room prototype.
 * Depends on matcher.js being loaded first (LABELS, VOICE_INTRO, QA_BANK,
 * PROCESS_BANK, REFUSAL_BANK, respondTo are all globals in the browser).
 */

const ARCHIVE_SUMMARY_TEXT =
  "In some communities, inherited social status has shaped people's access to land, work, marriage, social participation, and public recognition. These histories are often difficult to document because many people avoid speaking openly about them. Silence may protect individuals from stigma, but it can also make the harm harder to understand, remember, or challenge.";

const METHODOLOGY_TEXT = `This prototype was built by Jiwe Games for Thought with Donkosira, SOAS (Marie Rodet), and Code for Africa's AI Sandbox fellowship. Every piece of testimony in this demo is synthetic — written to test the interaction model, not drawn from a real witness. It is not a simulation of a real survivor, not a replacement for testimony or human facilitation, and not an oracle of historical truth. It exists to make visible how testimony changes as it moves through memory, research mediation, and AI mediation, and to test refusal rules and mediation labels before any real testimony is ever involved.`;

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
  }

  div.className = `msg ${cls}`;
  div.innerHTML = `<div class="role">${roleLabel}</div><div class="bubble"></div>`;
  const bubble = $(".bubble", div);
  const p = document.createElement("div");
  p.textContent = answerText;
  bubble.appendChild(p);

  if (label) labelChip(label, bubble);
  if (rough) addMediationToggle(bubble, answerText, rough);

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

function usePresetPath() {
  return new URLSearchParams(window.location.search).has("preset");
}

function labelById(id) {
  return Object.values(LABELS).find((l) => l.id === id) || LABELS.UNKNOWN;
}

// Adapts the preset proxy's flat {type, id, label, answer, rough} shape into
// the {type, entry: {...}} shape addBotResponse() already expects from the
// local matcher, so rendering code doesn't need to know which path answered.
function adaptPresetResult(json) {
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
    return { type: "refusal", answer: json.answer, rule: json.rule, id: json.id };
  }
  return { type: "unknown", label: LABELS.UNKNOWN, suggestions: json.suggestions || [] };
}

async function askQuestion(text) {
  addUserMessage(text);

  if (usePresetPath()) {
    try {
      const res = await fetch("/api/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok) throw new Error(`proxy responded ${res.status}`);
      const json = await res.json();
      addBotResponse(adaptPresetResult(json));
    } catch (e) {
      console.error("preset path failed, falling back to local matcher:", e);
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

  $("#enter-room-btn").addEventListener("click", () => {
    showScreen(2);
    if (!$("#chat-log").dataset.introShown) {
      addBotVoiceIntro();
      $("#chat-log").dataset.introShown = "1";
    }
  });

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
