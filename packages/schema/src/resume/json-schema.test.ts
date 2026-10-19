import { describe, expect, it } from "vitest";
import z from "zod";
import { defaultResumeData } from "./default";
import { createResumeDataJsonSchema } from "./json-schema";

describe("createResumeDataJsonSchema", () => {
	it("accepts legacy input with omitted picture fit", () => {
		const schema = createResumeDataJsonSchema();

		expect(schema).toMatchObject({
			properties: {
				picture: { required: expect.not.arrayContaining(["fit"]) },
			},
		});
	});

	it("enforces the custom-section type and item correlation", () => {
		const generatedSchema = z.fromJSONSchema(createResumeDataJsonSchema());
		const valid = {
			...defaultResumeData,
			customSections: [
				{
					id: "custom-summary",
					type: "summary",
					title: "Summary",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "summary-item", hidden: false, content: "<p>Summary</p>" }],
				},
			],
		};
		const mismatched = {
			...valid,
			customSections: valid.customSections.map((section) => ({ ...section, type: "experience" })),
		};

		expect(generatedSchema.safeParse(valid).success).toBe(true);
		expect(generatedSchema.safeParse(mismatched).success).toBe(false);
	});
});
