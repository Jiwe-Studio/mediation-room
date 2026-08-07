const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  const fileUrl = "file://" + path.join(__dirname, "index.html");
  await page.goto(fileUrl);

  // Screen 0 -> Enter
  await page.click("#enter-btn");
  await page.waitForSelector("#screen-1.active");
  console.log("Screen 1 active:", await page.locator("#screen-1").isVisible());

  // Screen 1 -> Enter the Mediation Room
  await page.click("#enter-room-btn");
  await page.waitForSelector("#screen-2.active");
  const introText = await page.locator(".chat-log .msg.bot .bubble").first().innerText();
  console.log("Voice intro shown, length:", introText.length);

  // Click a starter question
  await page.locator(".chip-row button", { hasText: "Are you one real person?" }).click();
  await page.waitForTimeout(200);
  const lastBubble = await page.locator(".chat-log .msg").last().innerText();
  console.log("After starter question, last msg:", lastBubble.slice(0, 120));

  // Ask a refusal-triggering free-text question
  await page.fill("#chat-input", "what was her name though");
  await page.click("#chat-form button[type=submit]");
  await page.waitForTimeout(200);
  const refusalMsg = await page.locator(".msg.refusal").last();
  console.log("Refusal message present:", await refusalMsg.count() > 0);

  // Ask an off-script question
  await page.fill("#chat-input", "what's your favorite color");
  await page.click("#chat-form button[type=submit]");
  await page.waitForTimeout(200);
  const unknownMsg = await page.locator(".msg.unknown").last();
  console.log("Unknown message present:", await unknownMsg.count() > 0);

  // One more exchange to trigger reflect prompt (need >=3 user turns)
  await page.fill("#chat-input", "what is mediation");
  await page.click("#chat-form button[type=submit]");
  await page.waitForTimeout(200);
  console.log("Reflect button visible:", await page.locator("#reflect-btn-wrap").isVisible());

  // Test the "see the mediation" toggle on the voice intro
  const toggleBtn = page.locator(".msg.bot .toggle-mediation").first();
  await toggleBtn.click();
  await page.waitForTimeout(150);
  const roughVisible = await page.locator(".rough-draft.open").first().isVisible();
  console.log("Rough draft toggle works:", roughVisible);

  // Test label chip explanation toggle
  await page.locator(".label-chip").first().click();
  await page.waitForTimeout(150);
  console.log("Label explain toggle works:", await page.locator(".label-explain.open").first().isVisible());

  // Go to reflection screen
  await page.click("#reflect-btn");
  await page.waitForSelector("#screen-3.active");
  console.log("Screen 3 active:", await page.locator("#screen-3").isVisible());
  console.log("Archive recap populated:", (await page.locator("#reflect-archive-recap").innerText()).length > 50);

  // Methodology modal
  await page.locator("#screen-3 .open-methodology").click();
  await page.waitForTimeout(150);
  console.log("Modal open:", await page.locator("#methodology-modal.open").isVisible());

  await page.screenshot({ path: "screenshot-chat.png", fullPage: false });
  await page.goto(fileUrl);
  await page.screenshot({ path: "screenshot-landing.png", fullPage: false });

  console.log("\nJS errors during run:", errors.length ? errors : "none");

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
