import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { pdf } from "../forme/testing";

type HostNode = {
	type: string;
	value?: string;
	break?: boolean;
	wrap?: boolean;
	props?: { break?: boolean; wrap?: boolean };
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const findSectionView = (node: HostNode, text: string): HostNode | undefined => {
	for (const child of node.children ?? []) {
		const match = findSectionView(child, text);
		if (match) return match;
	}

	const props = flowProps(node);
	return node.type === "VIEW" && nodeText(node) === text && (props.break !== undefined || props.wrap !== undefined)
		? node
		: undefined;
};

const flowProps = (node: HostNode | undefined) => ({
	break: node?.break ?? node?.props?.break,
	wrap: node?.wrap ?? node?.props?.wrap,
});

const buildFixture = (value?: string): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "";
	data.basics.headline = "";
	data.basics.email = "";
	data.basics.phone = "";
	data.basics.location = "";
	data.basics.customFields = [];
	data.summary.content = "<p>Pagination sentinel</p>";
	data.summary.keepTogether = true;
	data.summary.startOnNewPage = true;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	if (value === undefined) return data;

	const source = {
		languageVersion: 1,
		text: `@version 1; section[type="summary"] { break-before: ${value}; break-inside: ${value}; }`,
	};
	data.metadata.stylesheet = { mode: "semantic", source };
	return data;
};

describe("semantic pagination cancellation", () => {
	it.each([
		["the auto cancellation", "auto", false, true],
		["the initial cancellation", "initial", false, true],
		["the builder's own pagination", undefined, true, false],
	] as const)("puts %s on the final existing section View", async (_name, value, breakBefore, wrap) => {
		const data = buildFixture(value);
		const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<typeof pdf>[0];
		const instance = pdf(element);
		await vi.waitFor(() => expect(instance.container.document).not.toBeNull());
		const section = findSectionView(instance.container.document as HostNode, "SummaryPagination sentinel");

		expect(flowProps(section)).toEqual({ break: breakBefore, wrap });
	});
});
