/**
 * Records the landing page's product tour from the real app, signed in as the demo account from seed-demo.ts.
 *
 * Each chapter is filmed on its own page once it has loaded, through Chrome's screencast (sharper than Playwright's
 * video), then cut to its exact length so the tour's chapter buttons in features/homepage/closing.tsx stay in step.
 * Development overlays are hidden and a drawn cursor shows where each click lands. The result goes to
 * apps/web/public/landing as tour.mp4 (H.264), tour.webm (VP9) and tour-poster.webp.
 *
 * Needs the app running locally, the seeded demo account, and an ffmpeg with libx264, libvpx-vp9 and libwebp:
 *
 *   FFMPEG=/path/to/ffmpeg pnpm --filter @reactive-resume/tooling exec tsx landing/record-tour.ts
 */
import type { BrowserContext, Page } from "@playwright/test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { demoAccount } from "./demo-account";

const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const base = process.env.DEMO_APP_URL ?? "http://localhost:3000";
const output = join(import.meta.dirname, "..", "..", "apps", "web", "public", "landing");
const work = mkdtempSync(join(tmpdir(), "nextrole-tour-"));
const fps = 30;

/** Hides the dev-only devtools button and breakpoint badge, and draws a cursor that follows the mouse. */
const stagehand = `
	addEventListener("DOMContentLoaded", () => {
		const style = document.createElement("style");
		style.textContent = 'button[class^="go"], .fixed.size-10[class*="bg-blue-"] { display: none !important; }'
			+ '#tour-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 26px; height: 26px; transform: translate(-60px, -60px); }'
			+ '#tour-cursor::after { content: ""; position: absolute; inset: -14px; border-radius: 50%; background: rgb(179 166 255 / .35); transform: scale(0); opacity: 0; transition: transform .35s ease-out, opacity .35s; }'
			+ '#tour-cursor.down::after { transform: scale(1); opacity: 1; transition: none; }';
		document.head.append(style);
		const cursor = document.createElement("div");
		cursor.id = "tour-cursor";
		cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.4L9 21z" fill="#fff" stroke="#110d2b" stroke-width="1.4" stroke-linejoin="round"/></svg>';
		document.body.append(cursor);
		addEventListener("mousemove", (event) => { cursor.style.transform = "translate(" + event.clientX + "px," + event.clientY + "px)"; }, true);
		addEventListener("mousedown", () => cursor.classList.add("down"), true);
		addEventListener("mouseup", () => setTimeout(() => cursor.classList.remove("down"), 120), true);
	});
`;

type Chapter = {
	name: string;
	seconds: number;
	url: (ids: DemoIds) => string;
	/** Text that shows the page has loaded. */
	ready: string;
	/** Extra time to let the page finish drawing before filming starts, such as the resume preview. */
	settle?: number;
	/** What happens on screen; `at` waits until that many seconds into the chapter. */
	act: (page: Page, at: (seconds: number) => Promise<void>) => Promise<void>;
};

type DemoIds = { baseline: string; tailored: string; mosaic: string; northstar: string };

async function glide(page: Page, target: { x: number; y: number }) {
	await page.mouse.move(target.x, target.y, { steps: 28 });
}

async function glideTo(page: Page, text: string, options: { exact?: boolean; role?: "tab" | "button" | "link" } = {}) {
	const locator = options.role
		? page.getByRole(options.role, { name: text, exact: options.exact ?? false }).first()
		: page.getByText(text, { exact: options.exact ?? false }).first();
	const box = await locator.boundingBox();
	assert(box, `Nothing on screen for "${text}"`);
	await glide(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
	return locator;
}

async function scrollBy(page: Page, pixels: number, steps = 30) {
	for (let step = 0; step < steps; step++) {
		await page.mouse.wheel(0, pixels / steps);
		await page.waitForTimeout(16);
	}
}

const chapters: Chapter[] = [
	{
		name: "baseline",
		seconds: 10,
		url: () => "/dashboard/profile/baseline",
		ready: "Confirmed as your baseline",
		act: async (page, at) => {
			await glide(page, { x: 700, y: 300 });
			await at(1.5);
			await glideTo(page, "Dates on every experience entry");
			await at(4);
			await glideTo(page, "ATS readability");
			await at(6.5);
			await scrollBy(page, 260);
			await at(9.6);
		},
	},
	{
		name: "discover",
		seconds: 10,
		url: () => "/dashboard/discover",
		ready: "New opportunities",
		act: async (page, at) => {
			await glide(page, { x: 640, y: 160 });
			await at(1.2);
			await glideTo(page, "Product Lead, Onboarding");
			await at(3.2);
			await glideTo(page, "Senior PM, Self-serve");
			await at(5);
			const activity = await glideTo(page, "Search activity", { role: "tab" });
			await activity.click();
			await at(9.6);
		},
	},
	{
		name: "fit",
		seconds: 12,
		url: (ids) => `/dashboard/applications/${ids.mosaic}/summary`,
		ready: "Mosaic Cloud",
		act: async (page, at) => {
			await glide(page, { x: 700, y: 420 });
			await at(1.5);
			await scrollBy(page, 320);
			await at(5);
			const documents = await glideTo(page, "Documents", { role: "tab", exact: true });
			await documents.click();
			await at(8);
			await glide(page, { x: 760, y: 520 });
			await at(11.6);
		},
	},
	{
		name: "studio",
		seconds: 10,
		url: (ids) => `/builder/${ids.tailored}`,
		ready: "Alex Morgan",
		settle: 6000,
		act: async (page, at) => {
			await glide(page, { x: 980, y: 380 });
			await at(2);
			await scrollBy(page, 240);
			await at(5);
			await glide(page, { x: 980, y: 300 });
			await at(9.6);
		},
	},
	{
		name: "prepare",
		seconds: 10,
		url: (ids) => `/dashboard/applications/${ids.northstar}/interviews`,
		ready: "A focused 30-minute plan",
		act: async (page, at) => {
			await glide(page, { x: 700, y: 260 });
			await at(1.2);
			await scrollBy(page, 360);
			await at(3.5);
			const first = page.getByRole("checkbox").first();
			const box = await first.boundingBox();
			if (box) {
				await glide(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
				await first.click();
			}
			await at(6);
			await glideTo(page, "Read briefing");
			await at(9.6);
		},
	},
	{
		name: "board",
		seconds: 8,
		url: () => "/dashboard/applications",
		ready: "Applications",
		act: async (page, at) => {
			const board = await glideTo(page, "Board", { role: "tab", exact: true });
			await board.click();
			await at(3.6);
			const offers = await glideTo(page, "Offers", { exact: true });
			await offers.click();
			await page.getByText("Base salary").waitFor();
			await glide(page, { x: 980, y: 420 });
			await at(7.7);
		},
	},
];

async function demoIds(context: BrowserContext): Promise<DemoIds> {
	const get = async <T>(path: string) => (await (await context.request.get(`/api/openapi${path}`)).json()) as T;
	const applications = await get<{ id: string; company: string }[]>("/applications");
	const resumes = await get<{ id: string; name: string; tags: string[] }[]>("/resumes");
	const ids = {
		baseline: resumes.find((resume) => resume.tags.includes("baseline"))?.id ?? "",
		tailored: resumes.find((resume) => resume.name.includes("Mosaic"))?.id ?? "",
		mosaic: applications.find((application) => application.company === "Mosaic Cloud")?.id ?? "",
		northstar: applications.find((application) => application.company === "Northstar Labs")?.id ?? "",
	};
	for (const [key, value] of Object.entries(ids))
		assert(value, `The demo account has no ${key}; run seed-demo.ts first.`);
	return ids;
}

/** Films one chapter through the screencast and encodes exactly `seconds` of it. */
async function film(context: BrowserContext, chapter: Chapter, ids: DemoIds) {
	const page = await context.newPage();
	await page.goto(chapter.url(ids));
	await page.getByText(chapter.ready).first().waitFor({ timeout: 30_000 });
	await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
	await page.waitForTimeout(chapter.settle ?? 600);

	const frames: { data: string; at: number }[] = [];
	const cdp = await context.newCDPSession(page);
	cdp.on("Page.screencastFrame", (frame) => {
		frames.push({ data: frame.data, at: frame.metadata.timestamp ?? Date.now() / 1000 });
		void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => undefined);
	});
	await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1200 });
	// Nudge a repaint so the first frame arrives at once, then start the chapter's clock.
	await page.mouse.move(2, 2);
	await page.waitForTimeout(150);
	const start = Date.now() / 1000;
	const at = async (seconds: number) => {
		const wait = start + seconds - Date.now() / 1000;
		if (wait > 0) await page.waitForTimeout(wait * 1000);
	};
	await chapter.act(page, at);
	await at(chapter.seconds);
	await cdp.send("Page.stopScreencast");
	await page.close();

	const directory = join(work, chapter.name);
	mkdirSync(directory, { recursive: true });
	const end = start + chapter.seconds;
	const kept = frames.filter(
		(frame, index) =>
			frame.at < end &&
			(frame.at >= start || frames[index + 1]?.at === undefined || (frames[index + 1]?.at ?? 0) > start),
	);
	assert(kept.length > 0, `No frames for ${chapter.name}`);
	const lines: string[] = [];
	kept.forEach((frame, index) => {
		const file = `frame-${String(index).padStart(5, "0")}.jpg`;
		writeFileSync(join(directory, file), Buffer.from(frame.data, "base64"));
		const from = Math.max(frame.at, start);
		const to = Math.min(kept[index + 1]?.at ?? end, end);
		lines.push(`file '${file}'`, `duration ${Math.max(to - from, 1 / fps).toFixed(4)}`);
	});
	lines.push(`file 'frame-${String(kept.length - 1).padStart(5, "0")}.jpg'`);
	writeFileSync(join(directory, "frames.txt"), lines.join("\n"));

	const clip = join(work, `${chapter.name}.mp4`);
	execFileSync(ffmpeg, [
		"-y",
		"-loglevel",
		"error",
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		join(directory, "frames.txt"),
		"-vf",
		`fps=${fps},scale=1920:1200:flags=lanczos,format=yuv420p`,
		"-t",
		String(chapter.seconds),
		"-c:v",
		"libx264",
		"-crf",
		"14",
		"-preset",
		"medium",
		clip,
	]);
	console.log(`Filmed ${chapter.name}: ${kept.length} frames, ${chapter.seconds}s`);
	return clip;
}

const browser = await chromium.launch();
const context = await browser.newContext({
	baseURL: base,
	viewport: { width: 1280, height: 800 },
	deviceScaleFactor: 1.5,
	colorScheme: "dark",
	locale: "en-US",
	timezoneId: "Europe/Berlin",
});
await context.addInitScript(stagehand);

const login = await context.newPage();
await login.goto("/auth/login");
await login.getByLabel("Email Address", { exact: true }).fill(demoAccount.email);
await login.getByLabel("Password", { exact: true }).fill(demoAccount.password);
await login.getByRole("button", { name: "Sign in" }).click();
await login.waitForURL(/\/dashboard/);
await login.close();

const ids = await demoIds(context);
const clips: string[] = [];
for (const chapter of chapters) clips.push(await film(context, chapter, ids));
await browser.close();

mkdirSync(output, { recursive: true });
writeFileSync(join(work, "clips.txt"), clips.map((clip) => `file '${clip.replaceAll("\\", "/")}'`).join("\n"));
const joined = join(work, "tour.mp4");
execFileSync(ffmpeg, [
	"-y",
	"-loglevel",
	"error",
	"-f",
	"concat",
	"-safe",
	"0",
	"-i",
	join(work, "clips.txt"),
	"-c",
	"copy",
	joined,
]);
execFileSync(ffmpeg, [
	"-y",
	"-loglevel",
	"error",
	"-i",
	joined,
	"-vf",
	"scale=1600:1000:flags=lanczos",
	"-an",
	"-c:v",
	"libx264",
	"-crf",
	"24",
	"-preset",
	"slow",
	"-profile:v",
	"high",
	"-pix_fmt",
	"yuv420p",
	"-movflags",
	"+faststart",
	join(output, "tour.mp4"),
]);
execFileSync(ffmpeg, [
	"-y",
	"-loglevel",
	"error",
	"-i",
	joined,
	"-vf",
	"scale=1600:1000:flags=lanczos",
	"-an",
	"-c:v",
	"libvpx-vp9",
	"-crf",
	"36",
	"-b:v",
	"0",
	"-row-mt",
	"1",
	"-deadline",
	"good",
	"-cpu-used",
	"2",
	join(output, "tour.webm"),
]);
execFileSync(ffmpeg, [
	"-y",
	"-loglevel",
	"error",
	"-ss",
	"4",
	"-i",
	joined,
	"-frames:v",
	"1",
	"-vf",
	"scale=1600:1000:flags=lanczos",
	"-c:v",
	"libwebp",
	"-quality",
	"82",
	join(output, "tour-poster.webp"),
]);
rmSync(work, { recursive: true, force: true });
console.log(`Tour written to ${output}`);
