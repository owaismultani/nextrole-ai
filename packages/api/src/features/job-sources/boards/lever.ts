import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, place, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const postingSchema = z.object({
	text: z.string(),
	hostedUrl: z.string(),
	createdAt: z.number().nullish(),
	workplaceType: z.string().nullish(),
	descriptionPlain: z.string().nullish(),
	additionalPlain: z.string().nullish(),
	lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() })).nullish(),
	categories: z
		.object({
			location: z.string().nullish(),
			commitment: z.string().nullish(),
			allLocations: z.array(z.string()).nullish(),
		})
		.nullish(),
	salaryRange: z
		.object({
			min: z.number().nullish(),
			max: z.number().nullish(),
			currency: z.string().nullish(),
			interval: z.string().nullish(),
		})
		.nullish(),
});

/** "acme" is on Lever's US instance; "eu/acme" on its EU one. Each list carries full descriptions. */
export const lever: CompanyBoardAdapter = {
	kind: "lever",
	slug: /^(?:eu\/)?[a-z0-9][a-z0-9._-]{0,99}$/i,
	list: async (slug, { signal }) => {
		const [host, name] = slug.startsWith("eu/") ? ["api.eu.lever.co", slug.slice(3)] : ["api.lever.co", slug];
		const body = shape(
			z.array(z.unknown()),
			await fetchSourceJson(`https://${host}/v0/postings/${name}?mode=json`, { signal, cacheMs: 600_000 }),
		);
		const postings = items(postingSchema, body).flatMap((posting): JobPosting[] => {
			const url = httpsUrl(posting.hostedUrl);
			if (!url) return [];
			const location = place(...(posting.categories?.allLocations ?? [posting.categories?.location]));
			const type = posting.workplaceType?.toLowerCase();
			const description = [
				posting.descriptionPlain,
				...(posting.lists ?? []).map((list) => `${clean(list.text)}\n${plainText(list.content)}`),
				posting.additionalPlain,
			]
				.filter(Boolean)
				.join("\n\n");
			return [
				{
					source: "lever",
					board: `lever:${slug}`,
					url,
					title: clean(posting.text),
					company: "",
					location,
					workplace:
						type === "remote" || type === "hybrid" || type === "onsite"
							? type
							: workplaceOf({}, posting.text, location),
					employment: employmentOf(posting.categories?.commitment),
					salary: posting.salaryRange
						? salaryOf(
								posting.salaryRange.min,
								posting.salaryRange.max,
								posting.salaryRange.currency,
								posting.salaryRange.interval,
							)
						: null,
					postedAt: dateOf(posting.createdAt),
					description: plainText(description),
				},
			];
		});
		return { company: "", postings, complete: true };
	},
};
