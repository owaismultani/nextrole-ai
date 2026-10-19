import { describe, expect, it } from "vitest";
import { escapeCssComment, escapeCssString, serializeGeneratedStylesheet } from "./serialize";

describe("generated Semantic CSS serialization", () => {
	it("escapes labels and strings without creating CSS delimiters", () => {
		expect(escapeCssComment("*/ next")).toBe("*\\/ next");
		expect(escapeCssString('"\\\n')).toBe('"\\"\\\\\\a "');
	});

	it("rejects generated declarations that could escape their block", () => {
		expect(() =>
			serializeGeneratedStylesheet({
				languageVersion: 1,
				blocks: [{ selector: "field", declarations: { color: "red; page { color: blue" } }],
			}),
		).toThrow("unsafe CSS declaration value");
	});
});
