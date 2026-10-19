import type { CustomSectionType } from "./data";
import { describe, expect, it } from "vitest";
import {
	baseSectionSchema,
	customFieldSchema,
	customSectionSchema,
	pageSchema,
	parseResumeData,
	pictureSchema,
	resumeDataSchema,
	skillsSectionSchema,
	summarySchema,
} from "./data";
import { defaultResumeData } from "./default";

const representativeCustomSectionItemByType = {
	summary: { id: "summary-item", hidden: false, content: "<p>Summary</p>" },
	experience: {
		id: "experience-item",
		hidden: false,
		company: "Analytical Engines",
		position: "Programmer",
		location: "London",
		period: "1842–1843",
		description: "<p>Wrote the first algorithm.</p>",
	},
} as const satisfies Partial<Record<CustomSectionType, Record<string, unknown>>>;

const customSectionFixture = (type: CustomSectionType, item: Record<string, unknown>) => ({
	id: `custom-${type}`,
	type,
	title: "Custom section",
	icon: "",
	columns: 1,
	hidden: false,
	keepTogether: false,
	startOnNewPage: false,
	items: [item],
});

describe("resumeDataSchema", () => {
	it("rejects a renderer-unsafe custom section before PDF or DOCX dispatch", () => {
		const rendererUnsafeSection = customSectionFixture("experience", representativeCustomSectionItemByType.summary);

		expect(customSectionSchema.safeParse(rendererUnsafeSection).success).toBe(false);
		expect(
			resumeDataSchema.safeParse({
				...defaultResumeData,
				customSections: [rendererUnsafeSection],
			}).success,
		).toBe(false);
	});

	it("returns renderer-safe normalized data without losing compatible overlapping fields", () => {
		const data = {
			...structuredClone(defaultResumeData),
			customSections: [
				customSectionFixture("experience", {
					...representativeCustomSectionItemByType.experience,
					content: "<p>Preserve this overlapping field</p>",
				}),
			],
		};
		const parsed = parseResumeData(data);

		expect(parsed.customSections[0]?.items[0]).toMatchObject({
			content: "<p>Preserve this overlapping field</p>",
			roles: [],
			website: { url: "", label: "", inlineLink: false },
		});
	});
});

describe("pictureSchema", () => {
	it("defaults missing and invalid legacy fit values to cover", () => {
		const { fit: _fit, ...legacyPicture } = defaultResumeData.picture;

		expect(pictureSchema.parse(legacyPicture).fit).toBe("cover");
		expect(pictureSchema.parse({ ...legacyPicture, fit: "stretch" }).fit).toBe("cover");
	});
});

describe("customFieldSchema", () => {
	it("falls back to empty link via .catch when missing", () => {
		const result = customFieldSchema.safeParse({ id: "1", icon: "phone", text: "x" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.link).toBe("");
	});
});

describe("pageSchema", () => {
	it("defaults hideLinkUnderline to false when missing", () => {
		const { hideLinkUnderline: _, ...pageWithout } = defaultResumeData.metadata.page;
		const result = pageSchema.safeParse(pageWithout);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.hideLinkUnderline).toBe(false);
	});
});

describe("baseSectionSchema", () => {
	it("defaults icon to empty string when missing", () => {
		const result = baseSectionSchema.safeParse({ title: "Test", columns: 1, hidden: false });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.icon).toBe("");
	});
});

describe("summarySchema", () => {
	it("defaults icon to empty string when missing", () => {
		const result = summarySchema.safeParse({ title: "", columns: 1, hidden: false, content: "" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.icon).toBe("");
	});
});

describe("skillsSectionSchema", () => {
	it("defaults layout to 'default' when missing", () => {
		const result = skillsSectionSchema.parse({
			title: "Skills",
			columns: 2,
			hidden: false,
			items: [],
		});
		expect(result.layout).toBe("default");
		expect(result.columns).toBe(2);
	});
});
