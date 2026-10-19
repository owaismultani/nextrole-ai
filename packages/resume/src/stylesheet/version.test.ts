import { describe, expect, it } from "vitest";
import { compileStylesheet } from "./compile";

describe("compileStylesheet", () => {
	it("compiles plain CSS without a version line", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "section { color: #123456; }\n" });

		expect(result.program?.languageVersion).toBe(1);
		expect(result.diagnostics).toEqual([]);
	});

	it("ignores the @version line older stylesheets start with", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@version 1;\nsection { color: #123456; }\n" });

		expect(result.program?.rules).toHaveLength(1);
		expect(result.diagnostics).toEqual([]);
	});

	it("compiles around a recovered CSS error", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "section { color red; }" });

		expect(result.program).not.toBeNull();
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "CSS_PARSE_ERROR", severity: "error" }));
	});
});
