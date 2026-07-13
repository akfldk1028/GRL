import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

test("loads all graph modes and exports transparent captures", async ({ page }) => {
  const errors: string[] = []; page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("contract.json")) errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "GRL" })).toBeVisible();
  await expect(page.getByLabel("GRL graph canvas")).toBeVisible();
  for (const mode of ["features", "evidence", "relations", "stages"]) { const button = page.getByRole("button", { name: mode, exact: true }); await button.click(); await expect(button).toHaveClass(/active/); }
  await page.getByRole("button", { name: "features", exact: true }).click(); await page.getByRole("button", { name: "Filter relations" }).click();
  const pngDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Capture PNG" }).click(); const png = await pngDownload; expect(png.suggestedFilename()).toBe("grl-features-relations.png");
  const path = await png.path(); const decoded = PNG.sync.read(await import("node:fs").then((fs) => fs.readFileSync(path!))); expect(decoded.data[3]).toBe(0);
  const svgDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Capture SVG" }).click(); expect((await svgDownload).suggestedFilename()).toBe("grl-features-relations.svg");
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); expect(errors).toEqual([]);
});

test("shows contract errors for pasted invalid data", async ({ page }) => {
  await page.goto("/"); await page.getByLabel("Paste contract JSON").fill('{"schemaVersion":"wrong"}'); await page.getByRole("button", { name: "Load pasted JSON" }).click(); await expect(page.getByRole("alert")).toContainText("Invalid GRL contract");
});
