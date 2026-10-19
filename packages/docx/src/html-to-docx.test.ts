// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { htmlToParagraphs } from "./html-to-docx";

describe("htmlToParagraphs", () => {
	it("converts plain text nodes at the body root into a paragraph", () => {
		const result = htmlToParagraphs("Just some plain text");
		expect(result.length).toBe(1);
	});

	it("reads custom background-color from <mark> style for shading fill", () => {
		const result = htmlToParagraphs('<p><mark style="background-color: rgba(204, 255, 204, 1)">green</mark></p>');
		const json = JSON.stringify(result[0]);
		expect(json).toContain("CCFFCC");
	});

	it("leaves script and style text out of the document", () => {
		const json = JSON.stringify(
			htmlToParagraphs("<p>Hello<style>.x { color: red }</style></p><script>alert(1)</script>"),
		);
		expect(json).toContain("Hello");
		expect(json).not.toContain("color: red");
		expect(json).not.toContain("alert(1)");
	});
});
