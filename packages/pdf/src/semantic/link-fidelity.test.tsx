import type { ResumeData } from "@reactive-resume/schema/resume/data";
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

const buildFixture = (hideLinkUnderline: boolean): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.email = "ada@example.com";
	data.metadata.page.hideLinkUnderline = hideLinkUnderline;
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };

	return data;
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const findEmailLink = (node: HostNode): HostNode | undefined => {
	if (node.type === "LINK" && nodeText(node) === "ada@example.com") return node;
	for (const child of node.children ?? []) {
		const match = findEmailLink(child);
		if (match) return match;
	}
};

const finalLinkDecoration = async (data: ResumeData) => {
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const link = findEmailLink(instance.container.document as HostNode);
	const styles = Array.isArray(link?.style) ? link.style : link?.style ? [link.style] : [];
	return Object.assign({}, ...styles).textDecoration;
};

describe("PDF link decoration fidelity", () => {
	it.each([
		[false, "underline"],
		[true, "none"],
	] as const)("semantic stylesheet with hideLinkUnderline=%s resolves to %s", async (hidden, expected) => {
		expect(await finalLinkDecoration(buildFixture(hidden))).toBe(expected);
	});
});
