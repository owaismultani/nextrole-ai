import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";
import { resolveResumeRuntime } from "../../semantic/resolve";

type Options = { font: string; rtl?: boolean; count?: number; nested?: boolean };
type Run = { text: string; x: number; right: number; y: number; page: number };

async function renderList({ font, rtl = false, count = 102, nested = false }: Options) {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = font;
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	if (rtl) data.metadata.page.locale = "ar-SA";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["projects"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.sections.projects.items = [
		{
			id: "project-0",
			hidden: false,
			name: "Project0",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			// Distinct body weight keeps marker and content separate in PDF.js text runs.
			description: `${nested ? "<ul><li>Outer" : ""}<ol>${Array.from({ length: count }, (_, index) => `<li><strong>ITEM0_${String(index + 1).padStart(3, "0")}</strong></li>`).join("")}</ol>${nested ? "</li></ul>" : ""}`,
		},
	];
	expect(resolveResumeRuntime({ data, template: "rhyhorn" }).diagnostics).toEqual([]);
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="rhyhorn" />));
	const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const document = await loading.promise;
		const runs: Run[] = [];
		for (let page = 1; page <= document.numPages; page++) {
			const text = await (await document.getPage(page)).getTextContent();
			for (const item of text.items) {
				if ("str" in item && item.str)
					runs.push({
						text: item.str,
						x: item.transform[4],
						right: item.transform[4] + item.width,
						y: item.transform[5],
						page,
					});
			}
		}
		return { runs, pages: document.numPages };
	} finally {
		await loading.destroy();
	}
}

function assertGutters(runs: Run[], { count = 102, rtl = false }: Options) {
	const edges: number[] = [];
	for (let index = 1; index <= count; index++) {
		const bodies = runs.filter((run) => run.text === `ITEM0_${String(index).padStart(3, "0")}`);
		expect(bodies).toHaveLength(1);
		const body = bodies[0];
		if (!body) throw new Error(`Missing body ${index}`);
		const marker = runs
			.filter(
				(run) =>
					run.text === (rtl ? `.${index}` : `${index}.`) && run.page === body.page && Math.abs(run.y - body.y) < 10,
			)
			.sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0];
		expect(marker, `missing marker ${index} on content page`).toBeDefined();
		if (!marker) throw new Error(`Missing marker ${index}`);
		expect(rtl ? marker.x - body.right : body.x - marker.right, `marker ${index} gutter`).toBeGreaterThan(0.5);
		edges.push(rtl ? body.right : body.x);
	}
	expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.01);
}

describe("ordered marker gutters (#2751)", () => {
	for (const rtl of [false, true]) {
		it(`keeps Helvetica markers clear in ${rtl ? "RTL" : "LTR"} 102-item lists`, async () => {
			const options = { font: "Helvetica", count: 102, rtl };
			const { runs, pages } = await renderList(options);
			expect(pages).toBeGreaterThan(1);
			assertGutters(runs, options);
		}, 20000); // Include the first right-to-left fallback font download during concurrent suite runs.
	}
	it("retains every nested RTL item", async () => {
		// The existing RTL Text wrapper flattens nested lists into inline text.
		// Preserve their content without asserting unsupported nested row geometry.
		const { runs } = await renderList({ font: "Courier", rtl: true, nested: true, count: 12 });
		const items =
			runs
				.map((run) => run.text)
				.join("")
				.match(/ITEM0_\d{3}/g) ?? [];
		for (let index = 1; index <= 12; index++) {
			expect(items.filter((item) => item === `ITEM0_${String(index).padStart(3, "0")}`)).toHaveLength(1);
		}
	});
});
