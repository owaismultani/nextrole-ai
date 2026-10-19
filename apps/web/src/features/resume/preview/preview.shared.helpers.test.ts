// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { getPreviewCanvasScale } from "./preview.shared.utils";

const setDevicePixelRatio = (value: number) => {
	Object.defineProperty(window, "devicePixelRatio", {
		writable: true,
		configurable: true,
		value,
	});
};

afterEach(() => {
	setDevicePixelRatio(1);
});

describe("getPreviewCanvasScale", () => {
	it("clamps the scale when the page would exceed the canvas pixel budget", () => {
		setDevicePixelRatio(1);
		const scale = getPreviewCanvasScale(2000, 3000);
		// Should NOT exceed the 4x desired scale and must satisfy the pixel budget.
		expect(scale).toBeLessThan(4);
		expect(scale * scale * 2000 * 3000).toBeLessThanOrEqual(16_777_216 + 1);
	});
});
