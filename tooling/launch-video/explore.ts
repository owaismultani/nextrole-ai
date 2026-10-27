/**
 * Screenshots the screens the launch video films, at the recording viewport, so camera moves can be planned against
 * the real layout. Signed in as the demo account from ../landing/seed-demo.ts.
 *
 *   DEMO_APP_URL=http://localhost:3100 pnpm --filter @reactive-resume/tooling exec tsx launch-video/explore.ts [out]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { demoAccount } from "../landing/demo-account";
import { demoIds, signIn, viewport } from "./shared";

const base = process.env.DEMO_APP_URL ?? "http://localhost:3000";
const out = process.argv[2] || join(import.meta.dirname, "..", "..", "tmp", "launch-video", "explore");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
	baseURL: base,
	viewport,
	deviceScaleFactor: 1,
	colorScheme: "dark",
	locale: "en-US",
	timezoneId: "Europe/Berlin",
});
await signIn(context, demoAccount);
const ids = await demoIds(context);

const only = process.argv.slice(3);
const pages: [string, string, ((page: Page) => Promise<void>)?][] = [
	["discover", "/dashboard/discover"],
	["discover-activity", "/dashboard/discover", (page) => page.getByRole("tab", { name: "Search activity" }).click()],
	[
		"discover-run",
		"/dashboard/discover",
		async (page) => {
			await page.getByRole("tab", { name: "Search activity" }).click();
			await page.getByText("Open run").first().click();
		},
	],
	["fit", `/dashboard/applications/${ids.mosaic}/summary`],
	["studio", `/builder/${ids.tailored}`],
	["studio-check", `/builder/${ids.tailored}`, (page) => page.getByRole("tab", { name: /^Check/ }).click()],
	["studio-design", `/builder/${ids.tailored}`, (page) => page.getByRole("tab", { name: /^Design/ }).click()],
	["prepare", `/dashboard/applications/${ids.northstar}/interviews`],
	["applications", "/dashboard/applications"],
	["board", "/dashboard/applications", (page) => page.getByRole("tab", { name: "Board", exact: true }).click()],
	["offers", "/dashboard/applications", (page) => page.getByText("Offers", { exact: true }).first().click()],
	["overview", "/dashboard"],
	["knowledge", "/dashboard/knowledge"],
];
for (const [name, path, act] of pages) {
	if (only.length > 0 && !only.includes(name)) continue;
	const page = await context.newPage();
	await page.goto(path);
	await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
	await page.waitForTimeout(name.startsWith("studio") ? 8000 : 2500);
	if (act) {
		await act(page);
		await page.waitForTimeout(2500);
	}
	await page.screenshot({ path: join(out, `${name}.png`) });
	await page.screenshot({ path: join(out, `${name}-full.png`), fullPage: true });
	await page.close();
}
await browser.close();
console.log(`Screens written to ${out}`);
