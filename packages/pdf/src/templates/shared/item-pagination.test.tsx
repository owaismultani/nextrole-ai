import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it, vi } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

vi.mock("../../forme/testing", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../forme/testing")>()),
}));

type PdfTextItem = { str: string };
type ParsedPdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
type ParsedPdf = { numPages: number; getPage: (pageNumber: number) => Promise<ParsedPdfPage> };

const renderPdf = async (data: ResumeData): Promise<Uint8Array> => {
	const renderer = await vi.importActual<typeof import("../../forme/testing")>("../../forme/testing");
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
		typeof renderer.renderToBuffer
	>[0];
	return new Uint8Array(await renderer.renderToBuffer(element));
};

const parsePdf = (data: Uint8Array): Promise<ParsedPdf> => getDocument({ data }).promise as Promise<ParsedPdf>;

const readPhysicalPages = async (document: ParsedPdf): Promise<string[]> => {
	const pages: string[] = [];
	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
		const page = await document.getPage(pageNumber);
		const content = await page.getTextContent();
		pages.push(content.items.map(({ str }) => str).join(" "));
	}
	return pages;
};

const makeItem = (id: string, description: string) => ({
	id,
	hidden: false,
	company: id,
	position: "Synthetic item",
	location: "",
	period: "",
	website: { url: "", label: "", inlineLink: false },
	description,
	roles: [],
});

const makeFixture = (items: ResumeData["sections"]["experience"]["items"]): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "ITEM PAGINATION HEADER";
	data.metadata.template = "onyx";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];
	data.sections.experience.title = "Experience";
	data.sections.experience.items = items;
	return data;
};

const numberedTokens = (prefix: string, count: number) =>
	Array.from({ length: count }, (_value, index) => `${prefix}_${String(index + 1).padStart(3, "0")}`);

const numberedParagraphs = (prefix: string, count: number) =>
	numberedTokens(prefix, count)
		.map((token) => `<p>${token}</p>`)
		.join("");

const expectTokensExactlyOnce = (pages: string[], tokens: string[]) => {
	const renderedText = pages.join(" ");
	for (const token of tokens) expect(renderedText.split(token)).toHaveLength(2);
};

describe("item pagination token matrix", () => {
	it.each([
		{
			name: "item taller than a page",
			data: makeFixture([makeItem("oversized", numberedParagraphs("OVERSIZED", 180))]),
			allTokens: numberedTokens("OVERSIZED", 180),
			sampledTokens: ["OVERSIZED_001", "OVERSIZED_090", "OVERSIZED_180"],
			expectedPages: 5,
			expectedTokenPages: [0, 2, 4],
			expectsPhysicalOverflow: true,
		},
		{
			name: "nested bullets",
			data: makeFixture([
				makeItem(
					"nested",
					"<ul><li><p>NESTED_001</p><ul><li><p>NESTED_002</p></li><li><p>NESTED_003</p></li></ul></li></ul>",
				),
			]),
			allTokens: ["NESTED_001", "NESTED_002", "NESTED_003"],
			sampledTokens: ["NESTED_001", "NESTED_002", "NESTED_003"],
			expectedPages: 1,
			expectedTokenPages: [0, 0, 0],
			expectsPhysicalOverflow: false,
		},
	])(
		"preserves every token exactly once: $name",
		async ({ data, allTokens, sampledTokens, expectedPages, expectedTokenPages, expectsPhysicalOverflow }) => {
			const authoredPagesBeforeRender = structuredClone(data.metadata.layout.pages);
			const pages = await readPhysicalPages(await parsePdf(await renderPdf(data)));
			expect(pages).toHaveLength(expectedPages);
			expect(sampledTokens.map((token) => pages.findIndex((page) => page.includes(token)))).toEqual(expectedTokenPages);
			expectTokensExactlyOnce(pages, allTokens);
			expect(data.metadata.layout.pages).toEqual(authoredPagesBeforeRender);
			if (expectsPhysicalOverflow) expect(pages.length).toBeGreaterThan(authoredPagesBeforeRender.length);
		},
	);
});
