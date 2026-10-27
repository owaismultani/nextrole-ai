import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, workplaceOf } from "../normalize";
import { items, shape } from "./common";

const jobSchema = z.object({
	company_name: z.string().nullish(),
	title: z.string(),
	description: z.string().nullish(),
	remote: z.boolean().nullish(),
	url: z.string(),
	job_types: z.array(z.string()).nullish(),
	location: z.string().nullish(),
	created_at: z.union([z.number(), z.string()]).nullish(),
});

/**
 * Europe-focused, and a feed rather than a search: 300 postings a page, newest first, refreshed hourly. It reads up to
 * three pages, stopping once postings are older than the search wants.
 */
export const arbeitnow: JobSearchAdapter = {
	id: "arbeitnow",
	key: null,
	attribution: { name: "Arbeitnow", url: "https://www.arbeitnow.com" },
	search: async ({ filters, signal }) => {
		const oldest = filters.postedWithinDays ? Date.now() - filters.postedWithinDays * 86_400_000 : 0;
		const postings: JobPosting[] = [];
		for (let page = 1; page <= 3; page++) {
			const body = shape(
				z.object({ data: z.array(z.unknown()) }),
				await fetchSourceJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, {
					signal,
					cacheMs: 1_800_000,
				}),
			);
			let older = false;
			for (const job of items(jobSchema, body.data)) {
				const url = httpsUrl(job.url);
				const postedAt = dateOf(job.created_at);
				if (postedAt && postedAt.getTime() < oldest) older = true;
				if (!url) continue;
				postings.push({
					source: "arbeitnow",
					board: null,
					url,
					title: clean(job.title),
					company: clean(job.company_name),
					location: clean(job.location),
					workplace: workplaceOf({ remote: job.remote }, job.title, job.location),
					employment: employmentOf(job.job_types?.join(" ")),
					salary: null,
					postedAt,
					description: plainText(job.description),
				});
			}
			if (older || body.data.length < 300) break;
		}
		return postings;
	},
};
