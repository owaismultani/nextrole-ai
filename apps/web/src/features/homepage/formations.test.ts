import { describe, expect, it } from "vitest";
import { createField } from "./formations";
import { lastStage } from "./progress";

const mark = {
	frame: [
		[-0.4, -0.4],
		[0.4, 0.4],
	] as [number, number][],
	letter: [
		[0, 0],
		[0.1, -0.1],
	] as [number, number][],
};

describe("particle field", () => {
	const count = 600;
	const data = createField({ count, templates: 18, languages: 55, mark });

	it("has one formation per stage, each placing every point", () => {
		expect(data.formations).toHaveLength(lastStage + 1);
		expect(data.spin).toHaveLength(lastStage + 1);
		for (const formation of data.formations) {
			expect(formation.positions).toHaveLength(count * 3);
			expect(formation.colors).toHaveLength(count * 3);
			expect(formation.positions.every(Number.isFinite)).toBe(true);
			expect(formation.colors.every(Number.isFinite)).toBe(true);
		}
	});

	it("is the same on every visit", () => {
		const again = createField({ count, templates: 18, languages: 55, mark });
		expect(again.formations[0]?.positions).toEqual(data.formations[0]?.positions);
	});

	it("marks a few matches on the discovery terrain", () => {
		const matches = data.match.reduce((sum, value) => sum + value, 0);
		expect(matches).toBeGreaterThan(0);
		expect(matches).toBeLessThan(count * 0.1);
	});
});
