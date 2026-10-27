import z from "zod";
import {
	companyBoardSchema,
	discoveryFiltersSchema,
	discoverySourcesSchema,
	employmentSchema,
	filterReasonSchema,
	jobSearchSourceSchema,
	workplaceSchema,
} from "@reactive-resume/schema/career";

const sourceReport = z.object({
	source: z.string(),
	found: z.number(),
	kept: z.number(),
	status: z.enum(["ok", "failed", "skipped"]),
	reason: z.string().nullable(),
});

export const jobSourcesDto = {
	status: {
		output: z.array(
			z.object({
				source: jobSearchSourceSchema,
				/** The key's fields, such as ["appId", "appKey"]. */
				fields: z.array(z.string()),
				/** The source also works without a key; one only raises its limits. */
				optional: z.boolean(),
				/** The server supplies the key; personal keys are off for this source. */
				managed: z.boolean(),
				saved: z.boolean(),
				canSave: z.boolean(),
			}),
		),
	},
	saveKey: {
		input: z.object({
			source: jobSearchSourceSchema,
			fields: z.record(z.string(), z.string().trim().min(1).max(2_000)),
		}),
		output: z.void(),
	},
	deleteKey: { input: z.object({ source: jobSearchSourceSchema }), output: z.void() },
	search: {
		input: z.object({
			query: z.string().trim().max(500).default(""),
			sources: discoverySourcesSchema,
			filters: discoveryFiltersSchema,
		}),
		output: z.object({
			results: z.array(
				z.object({
					url: z.string(),
					title: z.string(),
					company: z.string(),
					location: z.string(),
					source: z.string(),
					workplace: workplaceSchema.nullable(),
					employment: employmentSchema.nullable(),
					postedAt: z.date().nullable(),
					salary: z
						.object({
							min: z.number().nullable(),
							max: z.number().nullable(),
							currency: z.string().nullable(),
							period: z.enum(["hour", "month", "year"]),
						})
						.nullable(),
					/** Already saved in New roles, tracked or dismissed. */
					known: z.boolean(),
					/** Why the filters left it out; null when kept. */
					filteredBy: filterReasonSchema.nullable(),
				}),
			),
			bySource: z.array(sourceReport),
		}),
	},
	resolveCompany: {
		input: z.object({ url: z.url().max(2_000) }),
		output: z.object({
			kind: companyBoardSchema,
			slug: z.string(),
			name: z.string(),
			openRoles: z.number(),
		}),
	},
};
