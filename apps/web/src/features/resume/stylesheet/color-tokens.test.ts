import { describe, expect, it } from "vitest";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { collectCompiledColorTokens } from "./color-tokens";

describe("compiler color source ranges", () => {
	it("ignores comments, strings, and uncompiled values while deduplicating expanded border colors", () => {
		const value = "rgba(231, 0, 11, 1)";
		const source = `@version 1;\nsection { color /*: red */: /* red */ red; border: 1pt solid ${value}; color: "red"; font-family: red; }`;
		const compiled = compileStylesheet({ languageVersion: 1, text: source });
		const red = source.indexOf("red;");
		const rgba = source.indexOf(value);
		expect(collectCompiledColorTokens(source, compiled.program)).toEqual([
			{ from: red, to: red + 3, value: "red" },
			{ from: rgba, to: rgba + value.length, value },
		]);
	});
});
