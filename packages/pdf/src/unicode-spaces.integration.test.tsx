import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "./document";
import { renderToBuffer } from "./forme/testing";

type Line = { text: string; x: number; y: number; right: number };

function resume(plain: string, html: string, family = "Noto Serif SC", locale = "zh-CN"): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Probe";
	data.basics.headline = plain;
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = family;
	data.metadata.typography.heading.fontFamily = family;
	data.metadata.typography.body.fontSize = 10;
	data.metadata.typography.body.fontWeights = ["400", "700"];
	data.metadata.typography.heading.fontWeights = ["400", "700"];
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.title = "Whitespace";
	data.summary.hidden = false;
	data.summary.content = html;
	return data;
}

async function pdfLines(data: ResumeData) {
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
	const loading = getDocument({ data: new Uint8Array(await act(() => renderToBuffer(element))) });
	try {
		const document = await loading.promise;
		expect(document.numPages).toBe(1);
		const page = await document.getPage(1);
		const content = await page.getTextContent({ disableNormalization: true });
		const lines = new Map<number, Line>();
		for (const item of content.items) {
			if (!("str" in item) || !item.str) continue;
			const x = item.transform[4];
			const y = item.transform[5];
			const line = lines.get(y) ?? { text: "", x, y, right: x };
			line.text += item.str;
			line.x = Math.min(line.x, x);
			line.right = Math.max(line.right, x + item.width);
			lines.set(y, line);
		}
		const ordered = [...lines.values()].sort((a, b) => b.y - a.y);
		const title = ordered.find((line) => line.text === data.summary.title);
		if (!title) throw new Error("Missing summary title in PDF");
		const plain = ordered[1];
		if (!plain) throw new Error("Missing plain headline control in PDF");
		return { plain, body: ordered.filter((line) => line.y < title.y) };
	} finally {
		await loading.destroy();
	}
}

function width(line: Line | undefined) {
	if (!line) throw new Error("Missing expected PDF text line");
	return line.right - line.x;
}

describe("Unicode spaces in exported rich text", () => {
	it("retains ideographic-space advances with IBM Plex Serif / zh-CN", { timeout: 60_000 }, async () => {
		const { plain, body } = await pdfLines(
			resume("中\u3000文\u3000字", "<p>中\u3000文\u3000字</p>", "IBM Plex Serif", "zh-CN"),
		);
		expect(body).toHaveLength(1);
		// Three full-width glyphs plus two ideographic spaces at 10pt.
		expect(width(plain)).toBeCloseTo(50, 2);
		expect(width(body[0])).toBeCloseTo(50, 2);
	});

	it("retains ideographic spaces at the start of a paragraph", { timeout: 60_000 }, async () => {
		const { plain, body } = await pdfLines(resume("中 文", "<p>\u3000中 文</p>"));
		expect(body).toHaveLength(1);
		expect(body[0]?.right).toBeCloseTo(plain.right + 10, 2);
	});
});
