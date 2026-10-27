import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, place, plainText, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const jobSchema = z.object({
	title: z.string(),
	url: z.string(),
	employment_type: z.string().nullish(),
	telecommuting: z.boolean().nullish(),
	published_on: z.string().nullish(),
	city: z.string().nullish(),
	state: z.string().nullish(),
	country: z.string().nullish(),
	description: z.string().nullish(),
});

export const workable: CompanyBoardAdapter = {
	kind: "workable",
	slug: /^[a-z0-9][a-z0-9-]{0,99}$/i,
	list: async (slug, { signal }) => {
		const body = shape(
			z.object({ name: z.string().nullish(), jobs: z.array(z.unknown()) }),
			await fetchSourceJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, {
				signal,
				cacheMs: 600_000,
			}),
		);
		const postings = items(jobSchema, body.jobs).flatMap((job): JobPosting[] => {
			const url = httpsUrl(job.url);
			if (!url) return [];
			const location = place(job.city, job.state, job.country);
			return [
				{
					source: "workable",
					board: `workable:${slug}`,
					url,
					title: clean(job.title),
					company: clean(body.name),
					location,
					workplace: workplaceOf({ remote: job.telecommuting }, job.title, location),
					employment: employmentOf(job.employment_type),
					salary: null,
					postedAt: dateOf(job.published_on),
					description: plainText(job.description),
				},
			];
		});
		return { company: clean(body.name), postings, complete: true };
	},
};
