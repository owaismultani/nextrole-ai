import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, httpsUrl, plainText, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const jobSchema = z.object({
	id: z.number(),
	title: z.string(),
	absolute_url: z.string(),
	company_name: z.string().nullish(),
	first_published: z.string().nullish(),
	updated_at: z.string().nullish(),
	location: z.object({ name: z.string().nullish() }).nullish(),
});

/** The light list has no descriptions (one large company's full list runs to ~6 MB), so text is read per kept role. */
export const greenhouse: CompanyBoardAdapter = {
	kind: "greenhouse",
	slug: /^[a-z0-9][a-z0-9_-]{0,99}$/i,
	list: async (slug, { signal }) => {
		const base = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
		const body = shape(
			z.object({ jobs: z.array(z.unknown()) }),
			await fetchSourceJson(base, { signal, cacheMs: 600_000 }),
		);
		const jobs = items(jobSchema, body.jobs);
		const postings = jobs.flatMap((job): JobPosting[] => {
			const url = httpsUrl(job.absolute_url);
			if (!url) return [];
			return [
				{
					source: "greenhouse",
					board: `greenhouse:${slug}`,
					url,
					title: clean(job.title),
					company: clean(job.company_name),
					location: clean(job.location?.name),
					workplace: workplaceOf({}, job.title, job.location?.name),
					employment: null,
					salary: null,
					postedAt: dateOf(job.first_published ?? job.updated_at),
					description: "",
					details: async (detailSignal) => {
						const detail = shape(
							z.object({ content: z.string().nullish() }),
							await fetchSourceJson(`${base}/${job.id}`, { signal: detailSignal }),
						);
						return plainText(detail.content);
					},
				},
			];
		});
		return { company: clean(jobs[0]?.company_name), postings, complete: true };
	},
};
