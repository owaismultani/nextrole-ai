import { describe, expect, it } from "vitest";
import * as forme from "@formepdf/core";
import { templateSchema } from "@reactive-resume/schema/templates";
import { renderResume } from "../forme/render";
import { filterSections } from "../templates/shared/filtering";
import { buildAllTemplatesFixture } from "./all-templates-fixture";

describe("Semantic CSS all-template smoke", () => {
	// A blank or truncated page is still a valid PDF, so check that every visible section reaches a page. That also
	// catches boxes the engine fails to place across page breaks (the re-layout in `forme/render.ts`).
	it.each(templateSchema.options)(
		"renders %s with the comprehensive stylesheet and places every visible section",
		async (template) => {
			const data = buildAllTemplatesFixture(template);
			const { pdf, pageMap } = await renderResume(forme, { data, template });

			expect(new TextDecoder().decode(pdf.subarray(0, 4))).toBe("%PDF");
			const placed = new Set(pageMap.nodes.flatMap((node) => (node.kind === "section" ? [node.sectionId] : [])));
			for (const page of data.metadata.layout.pages) {
				const sections = filterSections([...page.main, ...(page.fullWidth ? [] : page.sidebar)], data);
				// The summary prints in the header or a featured region on some templates, outside a section box.
				for (const id of sections) if (id !== "summary") expect(placed, `${template}: ${id}`).toContain(id);
			}
		},
		30_000,
	);
});
