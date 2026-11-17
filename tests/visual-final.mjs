import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
import { existsSync } from "node:fs";
// usa CHROMIUM_PATH, o Chromium do sistema ou o do Playwright, o que existir
function chromiumPath() {
  for (const p of [process.env.CHROMIUM_PATH, "/usr/bin/chromium", "/opt/pw-browsers/chromium"])
    if (p && existsSync(p)) return p;
  return undefined;
}
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const artifacts = process.env.VISUAL_OUTPUT || "/workspace/aliadas-review";
await mkdir(artifacts, { recursive: true });
const b = await chromium.launch({
  headless: true,
  executablePath: chromiumPath(),
  args: ["--no-sandbox"],
});
function luminance(hex) {
  const rgb = hex
    .trim()
    .replace("#", "")
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
try {
  for (const width of [375, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      const context = await b.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
      });
      const p = await context.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base);
      await p
        .getByRole("heading", {
          name: "Uma conversa pode abrir novos caminhos.",
        })
        .waitFor();
      await p.evaluate(() => document.fonts.ready);
      assert.equal(
        await p.evaluate(() => document.body.scrollWidth > innerWidth),
        false,
        `${width}/${theme}: overflow`,
      );
      const styles = await p.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          [
            "--fundo",
            "--texto",
            "--texto-suave",
            "--destaque",
            "--sobre-destaque",
          ].map((k) => [k, s.getPropertyValue(k).trim()]),
        );
      });
      for (const [a, z] of [
        ["--texto", "--fundo"],
        ["--texto-suave", "--fundo"],
        ["--sobre-destaque", "--destaque"],
      ])
        assert(
          contrast(styles[a], styles[z]) >= 4.5,
          `${a}/${z} sem contraste AA`,
        );
      assert.equal(
        await p
          .locator('a[href*="women-less-likely-to-have-strong-networks"]')
          .count(),
        1,
      );
      assert.equal(
        await p.locator('a[href*="global-gender-gap-report-2024"]').count(),
        1,
      );
      assert.equal(await p.locator(".stat-number").count(), 2);
      // "Quem somos" fica no rodapé (saiu do menu de visitantes)
      await p.getByRole("navigation", { name: "Rodapé" }).getByRole("link", { name: "Quem somos" }).click();
      await p.waitForURL("**/quem-somos");
      await p.getByRole("heading", { name: "Quem somos", exact: true }).waitFor();
      await p.goto(base);
      await p
        .getByRole("heading", {
          name: "Uma conversa pode abrir novos caminhos.",
        })
        .waitFor();
      await p.screenshot({
        path: `${artifacts}/landing-${width}-${theme}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log(
        `PASSOU: ${width}px, ${theme}, contraste AA, duas fontes e navegação por seção`,
      );
      await context.close();
    }
} finally {
  await b.close();
}
