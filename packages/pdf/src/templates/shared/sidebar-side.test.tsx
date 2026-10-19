import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import * as forme from "@formepdf/core";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { renderResume } from "../../forme/render";

/** Where the first page's sidebar and main sections sit, by their left edges. */
const columnEdges = async (template: Template, sidebarSide?: "left" | "right", locale = "en-US") => {
	const data = parseResumeData({
		...sampleResumeData,
		picture: { ...sampleResumeData.picture, hidden: true },
		metadata: {
			...sampleResumeData.metadata,
			template,
			page: { ...sampleResumeData.metadata.page, locale },
			layout: { ...sampleResumeData.metadata.layout, sidebarSide },
		},
	});
	const { pageMap } = await renderResume(forme, { data, template });
	const firstPage = data.metadata.layout.pages[0];
	const x = (column: "main" | "sidebar") =>
		Math.min(
			...pageMap.nodes
				// Some templates print the summary across the page, in the header.
				.filter(
					(node) =>
						node.page === 0 &&
						node.kind === "section" &&
						node.sectionId !== "summary" &&
						firstPage?.[column].includes(node.sectionId),
				)
				.map((node) => node.x),
		);
	return { sidebar: x("sidebar"), main: x("main") };
};

describe("sidebar side", () => {
	it.each(["azurill"] as const)("puts %s's sidebar on the side chosen", { timeout: 60_000 }, async (template) => {
		const left = await columnEdges(template, "left");
		const right = await columnEdges(template, "right");

		expect(left.sidebar).toBeLessThan(left.main);
		expect(right.sidebar).toBeGreaterThan(right.main);
	});

	it("keeps a chosen side on a right-to-left page, and mirrors the template's own side without a choice", async () => {
		const chosen = await columnEdges("azurill", "left", "ar-SA");
		const own = await columnEdges("azurill", undefined, "ar-SA");

		expect(chosen.sidebar).toBeLessThan(chosen.main);
		expect(own.sidebar).toBeGreaterThan(own.main);
	});
});
