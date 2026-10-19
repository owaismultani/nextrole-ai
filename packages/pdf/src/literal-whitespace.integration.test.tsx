import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumePdfFile } from "./server";

const require = createRequire(import.meta.url);
const standardFontDataUrl = `${join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")}/`;
const preserve = 'data-resume-whitespace="preserve"';

type TextItem = {
	text: string;
	x: number;
	y: number;
	width: number;
};

async function renderItems(content: string, locale = "en-US", narrow = false): Promise<TextItem[]> {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "";
	data.metadata.template = narrow ? "chikorita" : "onyx";
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [
		narrow ? { fullWidth: false, main: [], sidebar: ["summary"] } : { fullWidth: true, main: ["summary"], sidebar: [] },
	];
	if (narrow) data.metadata.layout.sidebarWidth = 25;
	data.summary.content = content;

	let file: File | undefined;
	await act(async () => {
		file = await createResumePdfFile({ data, filename: "literal-whitespace.pdf" });
	});
	if (!file) throw new Error("PDF generation failed");
	const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), standardFontDataUrl });
	try {
		const document = await task.promise;
		const items: TextItem[] = [];
		for (let pageIndex = 0; pageIndex < document.numPages; pageIndex++) {
			const page = await document.getPage(pageIndex + 1);
			const text = await page.getTextContent();
			for (const item of text.items) {
				if ("str" in item)
					items.push({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width });
			}
		}
		return items;
	} finally {
		await task.destroy();
	}
}

function lineMetrics(items: TextItem[]) {
	const anchor = items.find((item) => item.text.includes("LIT"));
	if (!anchor) throw new Error(`Expected LIT anchor in: ${items.map((item) => item.text).join("|")}`);
	const line = items.filter((item) => Math.abs(item.y - anchor.y) < 0.01);
	const start = Math.min(...line.map((item) => item.x));
	const end = Math.max(...line.map((item) => item.x + item.width));
	return { start, width: end - start, text: line.map((item) => item.text).join("") };
}

async function line(content: string, locale = "en-US") {
	return lineMetrics(await renderItems(content, locale));
}

describe("actual PDF literal whitespace (#3397)", () => {
	it("keeps literal layout local to marked siblings in the same PDF", async () => {
		const items = await renderItems(`<p ${preserve}>\tLIT AB END</p><p>  LIT AB END</p><p>LIT AB END</p>`);
		const anchors = items.filter((item) => item.text.includes("LIT"));
		expect(anchors).toHaveLength(3);
		const [marked, legacy, compact] = anchors;
		if (!marked || !legacy || !compact) throw new Error("Missing mixed-block anchors");
		// Helvetica body is 10pt, with an ordinary-space advance of 2.78pt: a marked tab is four of them.
		expect(marked.x - legacy.x).toBeCloseTo(11.12, 2);
		expect(legacy.x).toBeCloseTo(compact.x, 2);
		for (const anchor of anchors) {
			expect(
				items
					.filter((item) => Math.abs(item.y - anchor.y) < 0.01)
					.map((item) => item.text)
					.join("")
					.replace(/\s/g, ""),
			).toBe("LITABEND");
		}
	});

	it("keeps unmarked collapse node-local and marked narrow content complete", async () => {
		const unmarked = await line("<p>LIT A    B END</p>");
		const collapsed = await line("<p>LIT A B END</p>");
		expect(unmarked).toEqual(collapsed);

		const sample = "LIT    START\tSome breakable words continue through narrow content without disappearing END";
		const items = await renderItems(`<p ${preserve}>${sample}</p>`, "en-US", true);
		const text = items
			.map((item) => item.text)
			.join("")
			.replace(/\s/g, "");
		expect(text.slice(text.indexOf("LIT"))).toBe(sample.replace(/\s/g, ""));
	});
});
