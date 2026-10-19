import { describe, expect, it } from "vitest";
import { sanitizeAndParseResumeJson } from "./sanitize";

describe("sanitizeAndParseResumeJson", () => {
	it("strips text before and after the JSON block", () => {
		const messy = `Some preamble text\n\n{ "basics": { "name": "Carol" } }\n\nSome trailing text`;
		const result = sanitizeAndParseResumeJson(messy);
		expect(result.data.basics.name).toBe("Carol");
	});

	it("coerces 'true'/'false' strings to booleans", () => {
		const json = JSON.stringify({
			basics: { name: "Test" },
			summary: { hidden: "true", title: "", columns: "2", content: "" },
		});

		const result = sanitizeAndParseResumeJson(json);
		expect(result.data.summary.hidden).toBe(true);
		expect(result.data.summary.columns).toBe(2);
		expect(result.diagnostics.coercions.length).toBeGreaterThan(0);
	});

	it("drops items missing required fields with diagnostics", () => {
		const json = JSON.stringify({
			basics: { name: "Test" },
			sections: {
				skills: {
					items: [
						{ name: "TypeScript", level: 4 },
						{ name: "" }, // dropped: missing name
						{}, // dropped: missing name
					],
				},
			},
		});

		const result = sanitizeAndParseResumeJson(json);
		expect(result.data.sections.skills.items).toHaveLength(1);
		expect(result.diagnostics.droppedSectionItems.length).toBeGreaterThan(0);
		expect(result.diagnostics.salvageApplied).toBe(true);
	});

	it("auto-generates ids for items lacking them", () => {
		const json = JSON.stringify({
			basics: { name: "Test" },
			sections: {
				skills: { items: [{ name: "Go" }] },
			},
		});

		const result = sanitizeAndParseResumeJson(json);
		const item = result.data.sections.skills.items[0];
		expect(item).toBeDefined();
		expect(item?.id?.length).toBeGreaterThan(0);
		expect(result.diagnostics.salvageApplied).toBe(true);
	});

	it("uses defaultResumeData picture and metadata regardless of input", () => {
		const json = JSON.stringify({
			basics: { name: "Test" },
			picture: { url: "https://attacker.com/pic.png", size: 1024 }, // overridden
			metadata: { template: "unknown" }, // overridden
			customSections: [{ key: "hack" }], // cleared
		});

		const result = sanitizeAndParseResumeJson(json);
		expect(result.data.metadata.template).toBe("onyx");
		expect(result.data.picture.url).toBe("");
		expect(result.data.customSections).toEqual([]);
	});

	it("throws when input is non-JSON garbage", () => {
		expect(() => sanitizeAndParseResumeJson("not even close to json")).toThrow();
	});
});
