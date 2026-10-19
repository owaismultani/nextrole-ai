import { describe, expect, it } from "vitest";
import { ATS_CATEGORIES, ATS_RULE_CATALOG_V1, ATS_RULE_CODES } from "./catalog";

describe("ATS_RULE_CATALOG_V1", () => {
	it("gives every rule a severity and a category", () => {
		for (const code of ATS_RULE_CODES) {
			const rule = ATS_RULE_CATALOG_V1[code];
			expect(["error", "warning", "info"]).toContain(rule.severity);
			expect(ATS_CATEGORIES).toContain(rule.category);
		}
	});
});
