/**
 * Films the launch video's clips from the real app, signed in as the demo account from ../landing/seed-demo.ts.
 *
 * Each clip is filmed through Chrome's screencast at twice the viewport's resolution, so the compositor can push in
 * on the UI and stay sharp. Frames are kept as JPEGs with their capture time; render.ts picks the frame on screen at
 * each moment. Development overlays are hidden and a drawn cursor shows where each click lands.
 *
 * Clicks here change the demo account (a tracked job, a template, ticked steps), so seed it before each take:
 *
 *   pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts
 *   DEMO_APP_URL=http://localhost:3000 pnpm --filter @reactive-resume/tooling exec tsx launch-video/record.ts [clip...]
 *   pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts --pause
 *
 * Output: tmp/launch-video/clips/<clip>/*.jpg and tmp/launch-video/clips/<clip>.json.
 */
import type { BrowserContext, Page } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { demoAccount } from "../landing/demo-account";
import { type DemoIds, demoIds, signIn, viewport } from "./shared";

const base = process.env.DEMO_APP_URL ?? "http://localhost:3000";
const output = join(import.meta.dirname, "..", "..", "tmp", "launch-video", "clips");
const scale = 2;

/** Hides the dev-only devtools button and breakpoint badge, and draws a cursor that follows the mouse. */
const stagehand = `
	addEventListener("DOMContentLoaded", () => {
		const style = document.createElement("style");
		style.textContent = 'button[class^="go"], .fixed.size-10[class*="bg-blue-"], [data-sonner-toaster] { display: none !important; }'
			+ '#tour-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 30px; height: 30px; transform: translate(-80px, -80px); filter: drop-shadow(0 2px 4px rgb(0 0 0 / .45)); }'
			+ '#tour-cursor::after { content: ""; position: absolute; left: -16px; top: -16px; width: 36px; height: 36px; border-radius: 50%; background: rgb(179 166 255 / .4); transform: scale(0); opacity: 0; transition: transform .4s cubic-bezier(.2,.8,.2,1), opacity .45s; }'
			+ '#tour-cursor.down::after { transform: scale(1); opacity: 1; transition: none; }'
			+ 'html { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }';
		document.head.append(style);
		const cursor = document.createElement("div");
		cursor.id = "tour-cursor";
		cursor.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.4L9 21z" fill="#fff" stroke="#110d2b" stroke-width="1.4" stroke-linejoin="round"/></svg>';
		document.body.append(cursor);
		addEventListener("mousemove", (event) => { cursor.style.transform = "translate(" + event.clientX + "px," + event.clientY + "px)"; }, true);
		addEventListener("mousedown", () => cursor.classList.add("down"), true);
		addEventListener("mouseup", () => setTimeout(() => cursor.classList.remove("down"), 140), true);
	});
`;

type Point = { x: number; y: number };
type Clip = {
	name: string;
	seconds: number;
	url: (ids: DemoIds) => string;
	/** Text that shows the page has loaded. */
	ready: string;
	/** Extra time for the page to finish drawing before filming, such as the resume preview. */
	settle?: number;
	/** Where the cursor waits when filming starts. */
	cursor: Point;
	/** Puts the page in its opening state before filming: a scroll position, a mode. */
	prepare?: (page: Page) => Promise<void>;
	/**
	 * What happens on screen; `at` waits until that many seconds into the clip, and `mark` notes when something
	 * happened, so the edit in timeline.ts can be checked against the take.
	 */
	act: (page: Page, at: (seconds: number) => Promise<void>, mark: (name: string) => void) => Promise<void>;
	/** Undoes what the clip changed, after filming. */
	restore?: (page: Page) => Promise<void>;
};

const cursors = new WeakMap<Page, Point>();
const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/** Moves the cursor along a gentle arc with an ease in and out, like a hand rather than a robot. */
async function glide(page: Page, target: Point, ms = 650) {
	const from = cursors.get(page) ?? { x: viewport.width / 2, y: viewport.height / 2 };
	const steps = Math.max(8, Math.round(ms / 16));
	const bend = Math.min(60, Math.hypot(target.x - from.x, target.y - from.y) * 0.12);
	const started = Date.now();
	for (let step = 1; step <= steps; step++) {
		const k = ease(step / steps);
		const arc = Math.sin(Math.PI * k) * bend;
		await page.mouse.move(lerp(from.x, target.x, k), lerp(from.y, target.y, k) - arc);
		const wait = started + (ms * step) / steps - Date.now();
		if (wait > 0) await page.waitForTimeout(wait);
	}
	cursors.set(page, target);
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

async function centre(locator: ReturnType<Page["locator"]>, offset: Point = { x: 0, y: 0 }): Promise<Point> {
	const box = await locator.boundingBox();
	assert(box, `Nothing on screen for ${locator}`);
	return { x: box.x + box.width / 2 + offset.x, y: box.y + box.height / 2 + offset.y };
}

async function glideTo(page: Page, locator: ReturnType<Page["locator"]>, ms?: number, offset?: Point) {
	await glide(page, await centre(locator, offset), ms);
	return locator;
}

async function click(page: Page) {
	await page.mouse.down();
	await page.waitForTimeout(70);
	await page.mouse.up();
}

const clips: Clip[] = [
	{
		name: "discover",
		seconds: 6,
		url: () => "/dashboard/discover",
		ready: "New opportunities",
		cursor: { x: 760, y: 470 },
		act: async (page, at) => {
			await at(0.5);
			await glideTo(page, page.getByText("Product Lead, Onboarding").first(), 600);
			await at(1.5);
			await glideTo(page, page.getByText("Senior PM, Self-serve").first(), 500);
			await at(2.4);
			const track = page.getByRole("button", { name: "Track job" }).nth(1);
			await glideTo(page, track, 650);
			await at(3.15);
			await click(page);
			await at(4.4);
			await glide(page, { x: 1180, y: 700 }, 900);
		},
	},
	{
		name: "fit",
		seconds: 5.4,
		url: (ids) => `/dashboard/applications/${ids.mosaic}/summary`,
		ready: "How you fit",
		cursor: { x: 640, y: 120 },
		prepare: async (page) => {
			await page.evaluate(() => window.scrollTo(0, 548));
		},
		act: async (page, at) => {
			await at(0.4);
			await glideTo(page, page.getByText("Two stories and a weekly habit").first(), 600, { x: -20, y: 0 });
			await at(1.3);
			await glideTo(page, page.getByText("More than 40 A/B tests").first(), 450, { x: -20, y: 0 });
			await at(2.0);
			await glideTo(page, page.getByText("Owned onboarding at Brightwave").first(), 450, { x: -20, y: 0 });
			await at(2.8);
			await glideTo(page, page.getByText("No evidence yet", { exact: true }).last(), 600);
			await at(4.2);
			await glideTo(page, page.getByRole("button", { name: "Add evidence" }), 700);
		},
	},
	{
		name: "studio",
		seconds: 8.4,
		url: (ids) => `/builder/${ids.tailored}`,
		ready: "Alex Morgan",
		settle: 4000,
		cursor: { x: 640, y: 300 },
		prepare: async (page) => {
			await page.getByRole("tab", { name: /^Design/ }).click();
			await page.getByText("18 of 18 shown").waitFor();
			await page.waitForTimeout(2500);
		},
		act: async (page, at, mark) => {
			await at(0.45);
			await glideTo(page, page.getByText("Chikorita", { exact: true }).first(), 650, { x: 50, y: -120 });
			await at(1.25);
			await click(page);
			mark("template-click");
			// Applying a template keeps the page busy for a moment; wait for it rather than for the clock.
			await page.getByText("Template changed to Chikorita").first().waitFor();
			mark("template-applied");
			await at(3.0);
			await glideTo(page, page.getByRole("tab", { name: /^Check/ }), 650);
			await click(page);
			mark("check-click");
			await page.getByText("Reads cleanly").first().waitFor();
			mark("check-shown");
			await page.waitForTimeout(600);
			await glide(page, { x: 250, y: 140 }, 900);
		},
		restore: async (page) => {
			await page.getByRole("tab", { name: /^Design/ }).click();
			const azurill = await centre(page.getByText("Azurill", { exact: true }).first(), { x: 50, y: -120 });
			await page.mouse.click(azurill.x, azurill.y);
			await page.waitForTimeout(1500);
			await page.getByRole("tab", { name: /^Write/ }).click();
			await page.waitForTimeout(800);
		},
	},
	{
		name: "prepare",
		seconds: 5.4,
		url: (ids) => `/dashboard/applications/${ids.northstar}/interviews`,
		ready: "A focused 30-minute plan",
		cursor: { x: 760, y: 140 },
		prepare: async (page) => {
			await page.evaluate(() => window.scrollTo(0, 500));
		},
		act: async (page, at) => {
			const boxes = page.getByRole("checkbox");
			await at(0.4);
			await glideTo(page, boxes.nth(0), 650);
			await at(1.2);
			await click(page);
			await at(1.9);
			await glideTo(page, boxes.nth(1), 450);
			await at(2.5);
			await click(page);
			await at(3.3);
			await glideTo(page, page.getByRole("button", { name: "Read briefing" }), 800);
		},
	},
	{
		name: "tracker",
		seconds: 7.2,
		url: () => "/dashboard/applications",
		ready: "One workspace for every role",
		cursor: { x: 700, y: 330 },
		prepare: async (page) => {
			const list = page.getByRole("tab", { name: "List", exact: true });
			if ((await list.getAttribute("aria-selected")) !== "true") await list.click();
			await page.waitForTimeout(800);
		},
		act: async (page, at) => {
			await at(0.3);
			await glideTo(page, page.getByRole("tab", { name: "Board", exact: true }), 550);
			await at(0.95);
			await click(page);
			await at(1.6);
			await glide(page, { x: 1000, y: 330 }, 650);
			await at(2.45);
			await glideTo(page, page.getByRole("button", { name: "Offers" }), 600);
			await at(3.1);
			await click(page);
			await page.getByText("Base salary").waitFor();
			await at(4.0);
			await glideTo(page, page.getByText("€6,000 more").first(), 800);
			await at(5.6);
			await glideTo(page, page.getByText("3 office days, over your limit").first(), 700);
		},
	},
];

/** Films one clip through the screencast and writes its frames with their times. */
async function film(context: BrowserContext, clip: Clip, ids: DemoIds) {
	const page = await context.newPage();
	await page.goto(clip.url(ids));
	await page.getByText(clip.ready).first().waitFor({ timeout: 45_000 });
	await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
	await page.waitForTimeout(clip.settle ?? 800);
	await clip.prepare?.(page);
	await page.mouse.move(clip.cursor.x, clip.cursor.y);
	cursors.set(page, clip.cursor);
	await page.waitForTimeout(500);

	const frames: { data: string; at: number }[] = [];
	const cdp = await context.newCDPSession(page);
	cdp.on("Page.screencastFrame", (frame) => {
		frames.push({ data: frame.data, at: frame.metadata.timestamp ?? Date.now() / 1000 });
		void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => undefined);
	});
	await cdp.send("Page.startScreencast", {
		format: "jpeg",
		quality: 94,
		maxWidth: viewport.width * scale,
		maxHeight: viewport.height * scale,
	});
	// Nudge a repaint so the first frame arrives at once, then start the clip's clock.
	await page.mouse.move(clip.cursor.x + 1, clip.cursor.y);
	await page.waitForTimeout(200);
	const start = Date.now() / 1000;
	const paths = [{ t: 0, path: new URL(page.url()).pathname }];
	const marks: Record<string, number> = {};
	const mark = (name: string) => {
		marks[name] = Number((Date.now() / 1000 - start).toFixed(3));
	};
	page.on("framenavigated", (frame) => {
		if (frame === page.mainFrame()) paths.push({ t: Date.now() / 1000 - start, path: new URL(frame.url()).pathname });
	});
	const at = async (seconds: number) => {
		const wait = start + seconds - Date.now() / 1000;
		if (wait > 0) await page.waitForTimeout(wait * 1000);
	};
	await clip.act(page, at, mark);
	await at(clip.seconds);
	await cdp.send("Page.stopScreencast");
	await clip.restore?.(page);
	await page.close();

	const directory = join(output, clip.name);
	rmSync(directory, { recursive: true, force: true });
	mkdirSync(directory, { recursive: true });
	// Keep the last frame before the clock started, so the clip has a picture from its first moment.
	const first = Math.max(
		0,
		frames.findLastIndex((frame) => frame.at <= start),
	);
	const kept = frames.slice(first).filter((frame) => frame.at < start + clip.seconds);
	assert(kept.length > 1, `No frames for ${clip.name}`);
	const index = kept.map((frame, n) => {
		const file = `${String(n).padStart(5, "0")}.jpg`;
		writeFileSync(join(directory, file), Buffer.from(frame.data, "base64"));
		return { t: Math.max(0, Number((frame.at - start).toFixed(4))), file: `${clip.name}/${file}` };
	});
	writeFileSync(
		join(output, `${clip.name}.json`),
		JSON.stringify({ seconds: clip.seconds, marks, paths, frames: index }),
	);
	console.log(`Filmed ${clip.name}: ${index.length} frames over ${clip.seconds}s`, marks);
}

const only = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
	baseURL: base,
	viewport,
	deviceScaleFactor: scale,
	colorScheme: "dark",
	locale: "en-US",
	timezoneId: "Europe/Berlin",
});
await context.addInitScript(stagehand);
await signIn(context, demoAccount);
const ids = await demoIds(context);
mkdirSync(output, { recursive: true });
for (const clip of clips) if (only.length === 0 || only.includes(clip.name)) await film(context, clip, ids);
await browser.close();
