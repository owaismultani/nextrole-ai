import type { PdfRuleCode } from "./catalog";
import type { PdfCheckResult } from "./types";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PDF_ATS_RULE_CODES, pdfRuleCap, pdfRuleCategory, pdfRuleSeverity } from "./catalog";
import { scoreChecks } from "./score";

const result = (code: PdfRuleCode, status: PdfCheckResult["status"]): PdfCheckResult => ({
	code,
	category: pdfRuleCategory(code),
	severity: pdfRuleSeverity(code),
	status,
	findings: [],
});

const allPassing = () => PDF_ATS_RULE_CODES.map((code) => result(code, "pass"));

const statusArbitrary = fc.constantFrom<PdfCheckResult["status"]>("pass", "skip", "fail");

const resultsArbitrary = fc
	.array(statusArbitrary, { minLength: PDF_ATS_RULE_CODES.length, maxLength: PDF_ATS_RULE_CODES.length })
	.map((statuses) => PDF_ATS_RULE_CODES.map((code, index) => result(code, statuses[index] ?? "pass")));

describe("scoreChecks", () => {
	it("holds the score to the tightest cap among the blockers that fired", () => {
		const breakdown = scoreChecks([
			...allPassing().filter((entry) => entry.code !== "NO_EMAIL" && entry.code !== "NO_TEXT_LAYER"),
			result("NO_EMAIL", "fail"),
			result("NO_TEXT_LAYER", "fail"),
		]);

		expect(breakdown.score).toBeLessThanOrEqual(pdfRuleCap("NO_TEXT_LAYER") ?? 0);
		expect(breakdown.cappedBy).toEqual(["NO_TEXT_LAYER", "NO_EMAIL"]);
	});

	it("always produces an integer inside 0–100", () => {
		fc.assert(
			fc.property(resultsArbitrary, (results) => {
				const { score } = scoreChecks(results);

				expect(Number.isInteger(score)).toBe(true);
				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(100);
			}),
		);
	});

	it("never rewards a document for failing one more check", () => {
		fc.assert(
			fc.property(resultsArbitrary, fc.nat(), (results, seed) => {
				const target = results[seed % results.length];
				if (!target || target.status === "fail") return;

				const worse = results.map((entry) =>
					entry.code === target.code ? { ...entry, status: "fail" as const } : entry,
				);

				expect(scoreChecks(worse).score).toBeLessThanOrEqual(scoreChecks(results).score);
			}),
		);
	});
});
