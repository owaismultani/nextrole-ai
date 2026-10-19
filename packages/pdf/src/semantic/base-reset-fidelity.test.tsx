import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { pdf } from "../forme/testing";

type HostNode = {
	type: string;
	style?: unknown;
	value?: string;
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const findText = (node: HostNode, text: string): HostNode | undefined => {
	if (node.type === "TEXT" && nodeText(node) === text) return node;
	for (const child of node.children ?? []) {
		const match = findText(child, text);
		if (match) return match;
	}
};

const mergedStyle = (node: HostNode | undefined): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(node?.style) ? node.style : node?.style ? [node.style] : []));

const buildFixture = (template: Template, rule = ""): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.metadata.design.colors.text = "#111111";
	data.metadata.design.colors.background = "#eeeeee";
	data.metadata.design.colors.primary = "#663399";
	data.metadata.typography.heading.fontWeights = ["400", "700"];
	data.sections.skills.title = "Expertise";
	data.sections.skills.items = [
		{
			id: "skill-1",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "TypeScript",
			proficiency: "Expert",
			level: 3,
			keywords: [],
		},
	];
	data.metadata.layout.pages =
		template === "chikorita"
			? [{ fullWidth: false, main: [], sidebar: ["skills"] }]
			: [{ fullWidth: true, main: ["skills"], sidebar: [] }];

	const stylesheet = { languageVersion: 1, text: `@version 1; ${rule}` };
	data.metadata.stylesheet = { mode: "semantic", source: stylesheet };
	return data;
};

const finalTextStyle = async (template: Template, text: string, rule = "") => {
	const data = buildFixture(template, rule);
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const node = findText(instance.container.document as HostNode, text);
	expect(node).toBeDefined();
	return mergedStyle(node);
};

describe("PDF semantic base and reset fidelity", () => {
	it("cancels Bronzor's heading weight with the CSS initial value", async () => {
		expect(await finalTextStyle("bronzor", "Expertise", "section-heading { font-weight: initial; }")).toMatchObject({
			fontWeight: undefined,
		});
	});

	it("keeps Chikorita's sidebar placement color and lets an explicit body color override it", async () => {
		expect(await finalTextStyle("chikorita", "TypeScript")).toMatchObject({ color: "#eeeeee" });
		expect(await finalTextStyle("chikorita", "TypeScript", "field[name='name'] { color: #111111; }")).toMatchObject({
			color: "#111111",
		});
	});

	it("cancels Chikorita's sidebar field color with inherit and emits the inherited parent value", async () => {
		expect(await finalTextStyle("chikorita", "TypeScript", "field[name='name'] { color: inherit; }")).toMatchObject({
			color: "#111111",
		});
	});
});
