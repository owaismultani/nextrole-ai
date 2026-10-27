import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, workplaceOf } from "../normalize";
import { items, pagesFor, placesOf, shape } from "./common";

const jobSchema = z.object({
	title: z.string(),
	location: z.string().nullish(),
	snippet: z.string().nullish(),
	type: z.string().nullish(),
	link: z.string(),
	company: z.string().nullish(),
	updated: z.string().nullish(),
});

/** Jooble's key travels in the path; requests are POSTed JSON. Salaries are free text, so they stay unknown. */
export const jooble: JobSearchAdapter = {
	id: "jooble",
	key: { fields: ["apiKey"] },
	attribution: { name: "Jooble", url: "https://jooble.org" },
	search: async ({ query, filters, limit, signal, key }) => {
		const postings: JobPosting[] = [];
		for (const where of placesOf(filters))
			for (let page = 1; page <= pagesFor(limit, 50); page++) {
				const body = shape(
					z.object({ jobs: z.array(z.unknown()) }),
					await fetchSourceJson(`https://jooble.org/api/${encodeURIComponent(key?.apiKey ?? "")}`, {
						method: "POST",
						signal,
						body: {
							keywords: query,
							...(where ? { location: where } : {}),
							...(where && filters.radiusKm !== null ? { radius: String(filters.radiusKm) } : {}),
							...(filters.minSalary ? { salary: filters.minSalary.amount } : {}),
							page: String(page),
							ResultOnPage: "50",
						},
					}),
				);
				for (const job of items(jobSchema, body.jobs)) {
					const url = httpsUrl(job.link);
					if (!url) continue;
					postings.push({
						source: "jooble",
						board: null,
						url,
						title: clean(plainText(job.title)),
						company: clean(job.company),
						location: clean(job.location),
						workplace: workplaceOf({}, job.title, job.location),
						employment: employmentOf(job.type),
						salary: null,
						postedAt: dateOf(job.updated),
						description: plainText(job.snippet),
					});
				}
				if (body.jobs.length < 50) break;
			}
		return postings;
	},
};
