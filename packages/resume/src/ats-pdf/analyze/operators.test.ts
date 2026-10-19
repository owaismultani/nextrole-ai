import type { OperatorListLike } from "./operators";
import { describe, expect, it } from "vitest";
import { PDF_OPS } from "../pdf-ops";
import { summarizePageOperators } from "./operators";

const A4 = { width: 595.28, height: 841.89 };

function ops(entries: readonly [number, unknown][]): OperatorListLike {
	return { fnArray: entries.map(([op]) => op), argsArray: entries.map(([, args]) => args) };
}

describe("summarizePageOperators", () => {
	it("measures image coverage through the transform stack", () => {
		// A full-page image: scale the unit square up to the page box, then paint it.
		const summary = summarizePageOperators(
			ops([
				[PDF_OPS.save, []],
				[PDF_OPS.transform, [A4.width, 0, 0, A4.height, 0, 0]],
				[PDF_OPS.paintImageXObject, ["img_1"]],
				[PDF_OPS.restore, []],
			]),
			A4,
		);

		expect(summary.imageAreaRatio).toBeCloseTo(1, 5);
		expect(summary.imageCount).toBe(1);
	});

	it("restores the transform on restore, so a later image is measured at its own size", () => {
		const summary = summarizePageOperators(
			ops([
				[PDF_OPS.save, []],
				[PDF_OPS.transform, [A4.width, 0, 0, A4.height, 0, 0]],
				[PDF_OPS.restore, []],
				[PDF_OPS.transform, [10, 0, 0, 10, 0, 0]],
				[PDF_OPS.paintImageXObject, ["img_1"]],
			]),
			A4,
		);

		expect(summary.imageAreaRatio).toBeCloseTo(100 / (A4.width * A4.height), 6);
	});

	it("treats a form XObject as an implicit save and concat", () => {
		const summary = summarizePageOperators(
			ops([
				[
					PDF_OPS.paintFormXObjectBegin,
					[
						[2, 0, 0, 2, 0, 0],
						[0, 0, 1, 1],
					],
				],
				[PDF_OPS.transform, [10, 0, 0, 10, 0, 0]],
				[PDF_OPS.paintImageXObject, ["img_1"]],
				[PDF_OPS.paintFormXObjectEnd, []],
				[PDF_OPS.paintImageXObject, ["img_2"]],
			]),
			A4,
		);

		// 20x20 inside the form, then 1x1 outside it.
		expect(summary.imageAreaRatio).toBeCloseTo(401 / (A4.width * A4.height), 6);
		expect(summary.imageCount).toBe(2);
	});

	it("counts invisible text drawn in rendering mode 3", () => {
		const summary = summarizePageOperators(
			ops([
				[PDF_OPS.beginText, []],
				[PDF_OPS.setTextRenderingMode, [3]],
				[PDF_OPS.showText, [[]]],
				[PDF_OPS.showText, [[]]],
				[PDF_OPS.setTextRenderingMode, [0]],
				[PDF_OPS.showText, [[]]],
				[PDF_OPS.endText, []],
			]),
			A4,
		);

		expect(summary.invisibleTextItems).toBe(2);
		expect(summary.whiteFillTextItems).toBe(0);
	});

	it("counts white-filled text, and stops counting once the fill changes", () => {
		const summary = summarizePageOperators(
			ops([
				[PDF_OPS.setFillRGBColor, [255, 255, 255]],
				[PDF_OPS.showText, [[]]],
				[PDF_OPS.setFillRGBColor, [17, 17, 17]],
				[PDF_OPS.showText, [[]]],
			]),
			A4,
		);

		expect(summary.whiteFillTextItems).toBe(1);
	});

	it("does not call a pattern fill white", () => {
		const summary = summarizePageOperators(
			ops([
				[PDF_OPS.setFillRGBColor, [255, 255, 255]],
				[PDF_OPS.setFillColorN, ["p0"]],
				[PDF_OPS.showText, [[]]],
			]),
			A4,
		);

		expect(summary.whiteFillTextItems).toBe(0);
	});

	it("survives a stream that restores more than it saved", () => {
		expect(() =>
			summarizePageOperators(
				ops([
					[PDF_OPS.restore, []],
					[PDF_OPS.restore, []],
					[PDF_OPS.showText, [[]]],
				]),
				A4,
			),
		).not.toThrow();
	});
});
