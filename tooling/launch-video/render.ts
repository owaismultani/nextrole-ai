/**
 * Renders the launch video from the clips record.ts filmed: a 1080×1080 cut for LinkedIn, a 1920×1080 cut for GitHub,
 * DEV.to and YouTube, and a thumbnail in each shape.
 *
 * compositor.html draws every frame from the timeline in timeline.ts; this script steps it frame by frame in headless
 * Chromium and pipes the screenshots to ffmpeg, so timing never depends on how fast a frame renders.
 *
 *   FFMPEG=/path/to/ffmpeg pnpm --filter @reactive-resume/tooling exec tsx launch-video/render.ts
 *   ... render.ts --format square            Only one shape (square | wide).
 *   ... render.ts --stills 0.5,6,26           Write PNG stills at those times instead of video, to check an edit.
 *   ... render.ts --thumbnails                Only the thumbnails.
 *
 * Needs an ffmpeg with libx264. Output: tmp/launch-video/out.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { chromium, type Page } from "@playwright/test";
import { timeline } from "./timeline";

const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const root = join(import.meta.dirname, "..", "..");
const clipsDirectory = join(root, "tmp", "launch-video", "clips");
const out = join(root, "tmp", "launch-video", "out");

type Format = "square" | "wide";
const sizes: Record<Format, { width: number; height: number }> = {
	square: { width: 1080, height: 1080 },
	wide: { width: 1920, height: 1080 },
};

const { values } = parseArgs({
	options: {
		format: { type: "string" },
		stills: { type: "string" },
		thumbnails: { type: "boolean", default: false },
	},
});
const formats: Format[] = values.format ? [values.format as Format] : ["square", "wide"];
for (const format of formats) assert(format in sizes, `Unknown format ${format}`);

const clipNames = [...new Set(timeline.scenes.map((scene) => scene.clip))];
const clips = Object.fromEntries(
	clipNames.map((name) => {
		const file = join(clipsDirectory, `${name}.json`);
		assert(existsSync(file), `No clip ${name}; run record.ts first.`);
		return [name, JSON.parse(readFileSync(file, "utf8"))];
	}),
);
for (const scene of timeline.scenes) {
	const filmed = clips[scene.clip].seconds as number;
	const needs = scene.in + (scene.end - scene.start) + timeline.crossfade / 2;
	assert(needs <= filmed + 1e-6, `Scene on ${scene.clip} needs ${needs.toFixed(2)}s of a ${filmed}s clip`);
}

/** What the thumbnails show: the tagline beside the resume editor's Check mode. */
const thumbnails: Record<Format, object> = {
	wide: {
		clip: "studio",
		time: 6.2,
		camera: { x: 0.36, y: 0.36, z: 1.12 },
		kicker: "Open source · Free to self-host",
		headline: "A career team that works while you sleep.",
		sub: "Finds roles, tailors your resume, preps every interview. You make every call.",
		caption: { x: 96, y: 232, w: 690, kicker: 18, headline: 116, sub: 27 },
		window: {
			left: "836px",
			top: "166px",
			width: "1240px",
			height: "808px",
			transform: "none",
			opacity: "1",
			filter: "none",
		},
	},
	square: {
		clip: "studio",
		time: 6.2,
		camera: { x: 0.34, y: 0.36, z: 1.2 },
		kicker: "Open source · Free to self-host",
		headline: "A career team that works while you sleep.",
		sub: "Finds roles, tailors your resume, preps every interview.",
		caption: { x: 56, y: 132, w: 968, kicker: 16, headline: 84, sub: 24 },
		window: {
			left: "56px",
			top: "468px",
			width: "968px",
			height: "660px",
			transform: "none",
			opacity: "1",
			filter: "none",
		},
	},
};

async function open(format: Format): Promise<Page> {
	const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
	const page = await browser.newPage({ viewport: sizes[format], deviceScaleFactor: 1 });
	page.on("pageerror", (error) => console.error(error));
	await page.goto(pathToFileURL(join(import.meta.dirname, "compositor.html")).href);
	await page.evaluate(
		(config) => (window as unknown as { setup: (config: unknown) => Promise<boolean> }).setup(config),
		{ format, timeline, clips, base: pathToFileURL(clipsDirectory).href },
	);
	return page;
}

const renderAt = (page: Page, t: number) =>
	page.evaluate((time) => (window as unknown as { renderAt: (t: number) => Promise<boolean> }).renderAt(time), t);

async function encode(page: Page, format: Format) {
	const frames = Math.round(timeline.duration * timeline.fps);
	const file = join(out, format === "square" ? "nextrole-ai-launch-1080x1080.mp4" : "nextrole-ai-launch-1920x1080.mp4");
	const encoder = spawn(
		ffmpeg,
		[
			"-y",
			"-loglevel",
			"error",
			"-f",
			"image2pipe",
			"-framerate",
			String(timeline.fps),
			"-c:v",
			"png",
			"-i",
			"-",
			"-vf",
			"scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
			"-c:v",
			"libx264",
			"-preset",
			"slow",
			"-crf",
			"16",
			"-maxrate",
			format === "square" ? "14M" : "18M",
			"-bufsize",
			"28M",
			"-profile:v",
			"high",
			"-level:v",
			"4.1",
			"-g",
			String(timeline.fps * 2),
			"-colorspace",
			"bt709",
			"-color_primaries",
			"bt709",
			"-color_trc",
			"bt709",
			"-color_range",
			"tv",
			"-movflags",
			"+faststart",
			"-an",
			file,
		],
		{ stdio: ["pipe", "inherit", "inherit"] },
	);
	const finished = new Promise<void>((resolve, reject) =>
		encoder.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))),
	);
	const started = Date.now();
	for (let frame = 0; frame < frames; frame++) {
		await renderAt(page, frame / timeline.fps);
		const png = await page.screenshot({ type: "png" });
		if (!encoder.stdin.write(png)) await new Promise((resolve) => encoder.stdin.once("drain", resolve));
		if (frame % 90 === 0)
			console.log(`${format}: frame ${frame}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
	}
	encoder.stdin.end();
	await finished;
	console.log(`Wrote ${file}`);
}

mkdirSync(out, { recursive: true });
for (const format of formats) {
	const page = await open(format);
	if (values.stills) {
		for (const time of values.stills.split(",").map(Number)) {
			await renderAt(page, time);
			await page.screenshot({ path: join(out, `still-${format}-${time.toFixed(2)}.png`) });
		}
		console.log(`Stills written to ${out}`);
	} else if (values.thumbnails) {
		await page.evaluate(
			(spec) => (window as unknown as { renderThumbnail: (spec: unknown) => Promise<boolean> }).renderThumbnail(spec),
			thumbnails[format],
		);
		const png = await page.screenshot({ type: "png" });
		writeFileSync(join(out, `nextrole-ai-thumbnail-${sizes[format].width}x${sizes[format].height}.png`), png);
		console.log(`Thumbnail written for ${format}`);
	} else await encode(page, format);
	await page.context().browser()?.close();
}
