import { describe, expect, it } from "vitest";
import { filterItems, filterSections, isSectionVisible, isVisibleSummary } from "./filtering";

describe("filterItems", () => {
	it("returns only items where hidden is false", () => {
		const items = [
			{ id: 1, hidden: false },
			{ id: 2, hidden: true },
			{ id: 3, hidden: false },
		];
		expect(filterItems(items)).toEqual([
			{ id: 1, hidden: false },
			{ id: 3, hidden: false },
		]);
	});

	it("filters items with invalid primary titles when a section type is provided", () => {
		const items = [
			{ hidden: false, company: "   ", position: "Engineer" },
			{ hidden: false, company: "Acme", position: "Engineer" },
			{ hidden: false, company: "\n\t", position: "Manager" },
		];

		expect(filterItems(items, "experience")).toEqual([{ hidden: false, company: "Acme", position: "Engineer" }]);
	});

	it("filters invalid experience roles by position", () => {
		const items = [
			{
				hidden: false,
				company: "Acme",
				roles: [
					{ id: "role-1", position: "   ", period: "2020", description: "" },
					{ id: "role-2", position: "Lead Engineer", period: "2021", description: "" },
					{ id: "role-3", position: "\n", period: "2022", description: "" },
				],
			},
		];

		expect(filterItems(items, "experience")).toEqual([
			{
				hidden: false,
				company: "Acme",
				roles: [{ id: "role-2", position: "Lead Engineer", period: "2021", description: "" }],
			},
		]);
	});
});

describe("isVisibleSummary", () => {
	it("returns false when content is empty after trimming", () => {
		expect(isVisibleSummary({ hidden: false, content: "  \n  " })).toBe(false);
	});
});

describe("isSectionVisible", () => {
	const data = {
		summary: { hidden: false, content: "<p>Hi</p>" },
		sections: {
			experience: { hidden: false, items: [{ hidden: false, company: "Acme" }] },
			skills: { hidden: false, items: [] },
			education: { hidden: true, items: [{ hidden: false }] },
		},
		customSections: [{ id: "ext-1", hidden: false, items: [{ hidden: false }] }],
	};

	it("returns false for hidden summary", () => {
		expect(isSectionVisible("summary", { ...data, summary: { hidden: true, content: "<p>x</p>" } })).toBe(false);
	});

	it("returns false for built-in section when all items have invalid primary titles", () => {
		expect(
			isSectionVisible("experience", {
				...data,
				sections: { experience: { hidden: false, items: [{ hidden: false, company: "  " }] } },
			}),
		).toBe(false);
	});

	it("returns false for built-in section with hidden flag", () => {
		expect(isSectionVisible("education", data)).toBe(false);
	});

	it("returns true for matching custom section by id", () => {
		expect(isSectionVisible("ext-1", data)).toBe(true);
	});

	it("uses custom section type to validate item primary titles", () => {
		expect(
			isSectionVisible("ext-education", {
				...data,
				customSections: [
					{ id: "ext-education", type: "education", hidden: false, items: [{ hidden: false, school: "" }] },
				],
			}),
		).toBe(false);
	});

	it("returns false for unknown section id", () => {
		expect(isSectionVisible("does-not-exist", data)).toBe(false);
	});
});

describe("filterSections", () => {
	const data = {
		summary: { hidden: false, content: "<p>Hi</p>" },
		sections: {
			experience: { hidden: false, items: [{ hidden: false, company: "Acme" }] },
			skills: { hidden: false, items: [] },
		},
		customSections: [],
	};

	it("returns only visible section ids in input order", () => {
		expect(filterSections(["summary", "experience", "skills"], data)).toEqual(["summary", "experience"]);
	});
});
