import { describe, expect, it } from "vitest";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";

const renderLevel = async (level: number) => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Audit";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.design.level = { type: "icon", icon: "star" };
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.sections.skills.items = [
		{ id: "skill", hidden: false, name: "Skill", proficiency: "Expert", level, keywords: [], icon: "", iconColor: "" },
	];
	const element = createElement(ResumeDocument, { data, template: "scizor" }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
	let bytes: Uint8Array = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const loadingTask = getDocument({ data: bytes, useSystemFonts: true });
	try {
		const document = await loadingTask.promise;
		const page = await document.getPage(1);
		const operators = await page.getOperatorList();
		return operators.fnArray.flatMap((fn, index) => (fn === OPS.setGState ? operators.argsArray[index][0] : []));
	} finally {
		await loadingTask.destroy();
	}
};

describe("PDF icon opacity (#3352)", () => {
	it.each([3])("writes inactive level %i opacity to PDF graphics state", async (level) => {
		const states = await renderLevel(level);
		expect(states).toContainEqual(["ca", 0.35]);
		expect(states).toContainEqual(["CA", 0.35]);
	});
});
