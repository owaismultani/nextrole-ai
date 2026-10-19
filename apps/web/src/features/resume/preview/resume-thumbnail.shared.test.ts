import { describe, expect, it } from "vitest";
import { getResumeThumbnailRenderSize, getResumeThumbnailSize } from "./resume-thumbnail.shared";

describe("getResumeThumbnailRenderSize", () => {
	it("bounds extreme zoom and viewport sizes without stretching the page", () => {
		const target = getResumeThumbnailSize({ width: 5000, height: 7071 }, 8);
		const size = getResumeThumbnailRenderSize({ width: 595.28, height: 841.89 }, target);
		expect(size.width * size.height).toBeLessThanOrEqual(2048 * 3072);
		expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(3072);
		expect(size.width / size.height).toBeCloseTo(595.28 / 841.89, 2);
	});

	it("enforces the canvas budget when retained width and height came from different size buckets", () => {
		const size = getResumeThumbnailRenderSize({ width: 595.28, height: 841.89 }, { width: 2112, height: 2985 });
		expect(size.width * size.height).toBeLessThanOrEqual(2048 * 3072);
	});
});
