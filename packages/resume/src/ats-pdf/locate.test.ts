import { describe, expect, it } from "vitest";
import { buildExtractedDocument } from "./extract";
import { locateEvidence } from "./locate";
import { healthyResume, healthyResumeLines } from "./test-fixtures";

const doc = buildExtractedDocument(healthyResume());
const lineText = (entry: (typeof healthyResumeLines)[number]) => (typeof entry === "string" ? entry : entry.text);

describe("locateEvidence", () => {
	it("finds a cut snippet by its start, ignoring case and spacing", () => {
		const text = lineText(healthyResumeLines[3] ?? "");
		const cut = `${text.slice(0, 12).toUpperCase().replace(" ", "  ")}…`;

		expect(locateEvidence(doc, { snippet: cut })?.box).toBeDefined();
	});

	it("keeps a rule's own box, and leaves evidence it can't place as it was", () => {
		const box = { x: 1, y: 2, width: 3, height: 4 };
		expect(locateEvidence(doc, { page: 1, box })).toEqual({ page: 1, box });
		expect(locateEvidence(doc, { snippet: "nowhere in this resume" })).toEqual({ snippet: "nowhere in this resume" });
		expect(locateEvidence(doc, { snippet: lineText(healthyResumeLines[3] ?? ""), page: 9 })?.box).toBeUndefined();
		expect(locateEvidence(doc, undefined)).toBeUndefined();
	});
});
