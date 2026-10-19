import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

const source = createCanvas(100, 100);
const context = source.getContext("2d");
context.fillStyle = "#00aa00";
context.fillRect(0, 0, 100, 100);

async function picturePixels(template: "onyx" | "ditto" | "glalie", borderWidth: number, shadowWidth = 0) {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Picture";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: [] }];
	Object.assign(data.picture, {
		url: source.toDataURL("image/png"),
		hidden: false,
		size: 100,
		borderRadius: 0,
		borderColor: "rgba(255, 0, 255, 1)",
		borderWidth,
		shadowWidth,
		shadowColor: "rgba(0, 0, 255, 1)",
	});
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof renderToBuffer>[0];
	let bytes = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const [page] = await rasterizePdf(bytes);
	if (!page) throw new Error("Missing rendered page");
	let borderPixels = 0;
	let imagePixels = 0;
	let shadowPixels = 0;
	const positions: { x: number; y: number }[] = [];
	for (let index = 0; index < page.data.length; index += 4) {
		if (
			(page.data[index + 2] ?? 0) > (page.data[index] ?? 0) + 5 &&
			(page.data[index + 2] ?? 0) > (page.data[index + 1] ?? 0) + 5
		)
			shadowPixels++;
		if (page.data[index] === 255 && page.data[index + 1] === 0 && page.data[index + 2] === 255) borderPixels++;
		if (
			(page.data[index + 1] ?? 0) > (page.data[index] ?? 0) + 5 &&
			(page.data[index + 1] ?? 0) > (page.data[index + 2] ?? 0) + 5
		)
			imagePixels++;
		if (
			(page.data[index] === 255 && page.data[index + 1] === 0 && page.data[index + 2] === 255) ||
			((page.data[index + 1] ?? 0) > (page.data[index] ?? 0) + 5 &&
				(page.data[index + 1] ?? 0) > (page.data[index + 2] ?? 0) + 5)
		)
			positions.push({ x: (index / 4) % page.width, y: Math.floor(index / 4 / page.width) });
	}
	const bounds = {
		left: Math.min(...positions.map(({ x }) => x)),
		right: Math.max(...positions.map(({ x }) => x)),
		top: Math.min(...positions.map(({ y }) => y)),
		bottom: Math.max(...positions.map(({ y }) => y)),
	};
	return { borderPixels, imagePixels, shadowPixels, bounds };
}

describe("picture border visibility (#3017)", () => {
	it("draws a border and a soft centered shadow without moving the photo", async () => {
		const plain = await picturePixels("onyx", 0);
		const bordered = await picturePixels("onyx", 10);
		expect(plain.borderPixels).toBe(0);
		expect(bordered.borderPixels).toBeGreaterThan(1000);
		expect(bordered.imagePixels).toBeGreaterThan(1000);
		expect(bordered.imagePixels).toBeLessThan(plain.imagePixels);
		// Rasterized border/image edges can differ by one antialiased pixel.
		for (const edge of ["left", "right", "top", "bottom"] as const)
			expect(Math.abs(bordered.bounds[edge] - plain.bounds[edge])).toBeLessThanOrEqual(1);
		const shadow = await picturePixels("onyx", 0, 10);
		expect(plain.shadowPixels).toBe(0);
		expect(shadow.shadowPixels).toBeGreaterThan(100);
		expect(shadow.bounds).toEqual(plain.bounds);
		expect(shadow.imagePixels).toBe(plain.imagePixels);
	});
});
