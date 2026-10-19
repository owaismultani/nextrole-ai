import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

type FixtureOptions = {
	columns: number;
	count: number;
	configure?: (data: ResumeData) => void;
};

function setCss(data: ResumeData, css: string) {
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: `@version 1; ${css}` } };
}

async function renderRatings({ columns, count, configure }: FixtureOptions) {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	data.metadata.design.colors.primary = "rgba(255, 0, 0, 1)";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.sections.skills.columns = columns;
	data.sections.skills.items = Array.from({ length: count }, (_, index) => ({
		id: `skill-${index}`,
		hidden: false,
		icon: "",
		iconColor: "",
		name: `Skill ${index}`,
		proficiency: index === 1 ? "Experienced" : "",
		level: 5,
		keywords: index === 1 ? Array.from({ length: 12 }, (_, word) => `Keyword${word}`) : ["Short"],
	}));
	configure?.(data);
	expect(resolveResumeRuntime({ data, template: "onyx" }).diagnostics).toEqual([]);
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
	const pages = await rasterizePdf(new Uint8Array(bytes));
	const loading = getDocument({ data: new Uint8Array(bytes) });
	const text: string[] = [];
	try {
		const pdf = await loading.promise;
		for (let number = 1; number <= pdf.numPages; number++) {
			const page = await pdf.getPage(number);
			text.push((await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
		}
	} finally {
		await loading.destroy();
	}
	const rows = pages.map((page) => {
		const rows: { top: number; bottom: number; circles: number }[] = [];
		for (let y = 0; y < page.height; y++) {
			let redPixels = 0;
			let segments = 0;
			let previousRed = false;
			for (let x = 0; x < page.width; x++) {
				const offset = (y * page.width + x) * 4;
				const red = (page.data[offset] ?? 0) > 200 && (page.data[offset + 1] ?? 255) < 100;
				if (red) {
					redPixels++;
					if (!previousRed) segments++;
				}
				previousRed = red;
			}
			if (redPixels === 0) continue;
			const previous = rows.at(-1);
			if (previous && previous.bottom === y - 1) {
				previous.bottom = y;
				previous.circles = Math.max(previous.circles, segments);
			} else rows.push({ top: y, bottom: y, circles: segments });
		}
		// Onyx's thin section separator is red too; retain only the circle bands.
		return rows.filter((row) => row.bottom - row.top > 5);
	});
	return { rows, text: text.join(" ") };
}

describe("skill rating alignment (#3343)", () => {
	it("aligns mixed-height skills and preserves an incomplete row", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({ columns: 2, count: 3 });
		expect(rows).toHaveLength(2);
		if (!rows?.[0] || !rows[1]) throw new Error("Missing rating rows");
		// Ten circles share the first row; the remaining skill has five.
		expect(rows.map((row) => row.circles)).toEqual([10, 5]);
		expect(text).toContain("Keyword11");
		expect(text).toContain("Skill 2");
		expect(text.indexOf("Skill 0")).toBeLessThan(text.indexOf("Skill 1"));
		expect(text.indexOf("Skill 1")).toBeLessThan(text.indexOf("Skill 2"));
	});
	it("aligns language ratings in multi-column rows with unequal fluency text", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({
			columns: 2,
			count: 0,
			configure: (data) => {
				data.metadata.layout.pages = [{ fullWidth: true, main: ["languages"], sidebar: [] }];
				data.sections.languages.columns = 2;
				data.sections.languages.items = [
					{ id: "english", hidden: false, language: "English", fluency: "Native", level: 5 },
					{
						id: "german",
						hidden: false,
						language: "German",
						fluency:
							"Professional working proficiency with deliberately long wrapping text across several lines in the language grid",
						level: 5,
					},
				];
			},
		});
		expect(rows).toHaveLength(1);
		expect(rows?.[0]?.circles).toBe(10);
		expect(text).toContain("Professional working proficiency");
	});
	it("retains aligned ratings and text across automatic page breaks", async () => {
		const { rows, text } = await renderRatings({
			columns: 3,
			count: 12,
			configure: (data) => setCss(data, "page { size: 300pt 220pt; }"),
		});
		expect(rows.length).toBeGreaterThan(1);
		expect(rows.flat()).toHaveLength(4);
		for (let index = 0; index < 12; index++) expect(text).toContain(`Skill ${index}`);
		expect(text).toContain("Keyword11");
		expect(rows.flat().map((row) => row.circles)).toEqual([15, 15, 15, 15]);
	});
});
