import { describe, expect, it } from "vitest";
import { sectionProgress } from "./scroll";

describe("section progress", () => {
	it("measures a pinned scene by how far its sticky stage has travelled", () => {
		// A 3000px scene in a 1000px viewport pins for 2000px of scrolling.
		expect(sectionProgress(200, 3000, 1000, true)).toBe(0);
		expect(sectionProgress(-1000, 3000, 1000, true)).toBe(0.5);
		expect(sectionProgress(-2600, 3000, 1000, true)).toBe(1);
	});

	it("measures any other section by how much of it has come into view", () => {
		expect(sectionProgress(1000, 600, 1000, false)).toBe(0);
		expect(sectionProgress(700, 600, 1000, false)).toBe(0.5);
		expect(sectionProgress(-50, 2400, 1000, false)).toBe(1);
	});
});
