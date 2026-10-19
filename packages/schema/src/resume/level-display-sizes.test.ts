import { describe, expect, it } from "vitest";
import { resolveLevelDisplaySizes } from "./level-display-sizes";

describe("resolveLevelDisplaySizes", () => {
	it("uses typography defaults when no custom font sizes are set", () => {
		expect(resolveLevelDisplaySizes({ bodyFontSize: 12 })).toEqual({
			decorationSize: 10,
			levelIconExplicitSize: 14,
		});
	});

	it("uses the level font size for all level display visuals", () => {
		expect(resolveLevelDisplaySizes({ bodyFontSize: 12, levelFontSize: 16 })).toEqual({
			decorationSize: 16,
			levelIconExplicitSize: 16,
		});
	});
});
