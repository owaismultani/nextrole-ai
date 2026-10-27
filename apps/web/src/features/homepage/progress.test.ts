import { describe, expect, it } from "vitest";
import { coverAt, lastStage, stageAt } from "./progress";

// A 1000px viewport, so the middle of the screen is at 500px.
const viewport = 1000;

describe("stage at", () => {
	it("holds a section's stage for its first half", () => {
		const boxes = [{ stage: 2, top: 100, bottom: 1700, next: 3 }];
		expect(stageAt(boxes, viewport)).toBe(2);
	});

	it("blends into the next stage over a section's second half", () => {
		// The middle of the screen is three quarters of the way down the section.
		const boxes = [{ stage: 2, top: -700, bottom: 900, next: 3 }];
		expect(stageAt(boxes, viewport)).toBeCloseTo(2.5);
	});

	it("doesn't blend when the next section shares the stage", () => {
		const boxes = [{ stage: 8, top: -700, bottom: 900, next: 8 }];
		expect(stageAt(boxes, viewport)).toBe(8);
	});

	it("starts at the first stage above the page and ends at the last below it", () => {
		expect(stageAt([{ stage: 0, top: 600, bottom: 1600, next: 1 }], viewport)).toBe(0);
		expect(stageAt([{ stage: 0, top: -3000, bottom: -2000, next: 1 }], viewport)).toBe(lastStage);
	});
});

// The field's band is the top 400px of the screen.
const zone = 400;

describe("cover at", () => {
	it("is clear while the copy is below the band or has scrolled past it", () => {
		expect(coverAt([{ top: 450, bottom: 1200 }], zone)).toBe(0);
		expect(coverAt([{ top: -900, bottom: -20 }], zone)).toBe(0);
	});

	it("grows as the copy rises into the band", () => {
		expect(coverAt([{ top: 300, bottom: 1200 }], zone)).toBeCloseTo(0.5);
	});

	it("is full once the copy fills half the band", () => {
		expect(coverAt([{ top: 150, bottom: 1200 }], zone)).toBe(1);
		expect(coverAt([{ top: -500, bottom: 1200 }], zone)).toBe(1);
	});

	it("follows the block that covers the most", () => {
		const boxes = [
			{ top: -800, bottom: 40 },
			{ top: 340, bottom: 1400 },
		];
		expect(coverAt(boxes, zone)).toBeCloseTo(0.3);
	});
});
