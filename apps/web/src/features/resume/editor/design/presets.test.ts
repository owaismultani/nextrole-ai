import { describe, expect, it } from "vitest";
import { fitToPages, nextFitStep } from "./presets";

describe("Fit to one page", () => {
	it("tightens density, then margins, then size, never below 9 pt", () => {
		expect(nextFitStep({ density: "roomy", margins: "wide", size: 10 })).toEqual({ density: "normal" });
		expect(nextFitStep({ density: "compact", margins: "wide", size: 10 })).toEqual({ margins: "normal" });
		expect(nextFitStep({ density: "compact", margins: "narrow", size: 10 })).toEqual({ size: 9.5 });
		expect(nextFitStep({ density: "compact", margins: "narrow", size: 9 })).toBeNull();
		// Values that match no preset jump straight to the tightest one.
		expect(nextFitStep({ density: null, margins: null, size: 10 })).toEqual({ density: "compact" });
	});

	it("stops as soon as the page fits", async () => {
		const applied: unknown[] = [];
		let pagesLeft = 2;
		const result = await fitToPages(
			{ density: "normal", margins: "normal", size: 10 },
			(step) => applied.push(step),
			async () => pagesLeft-- <= 0,
		);
		expect(result.fits).toBe(true);
		expect(applied).toEqual([{ density: "compact" }, { margins: "narrow" }]);
		expect(result.state).toEqual({ density: "compact", margins: "narrow", size: 10 });
	});
});
