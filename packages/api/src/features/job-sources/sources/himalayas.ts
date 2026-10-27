import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, place, plainText, salaryOf } from "../normalize";
import { countryName, items, pagesFor, shape } from "./common";

const EMPLOYMENT = {
	"full-time": "Full Time",
	"part-time": "Part Time",
	contract: "Contractor",
	temporary: "Temporary",
	internship: "Intern",
} as const;

const jobSchema = z.object({
	title: z.string(),
	excerpt: z.string().nullish(),
	companyName: z.string().nullish(),
	employmentType: z.string().nullish(),
	minSalary: z.number().nullish(),
	maxSalary: z.number().nullish(),
	currency: z.string().nullish(),
	salaryPeriod: z.string().nullish(),
	locationRestrictions: z.array(z.string()).nullish(),
	description: z.string().nullish(),
	pubDate: z.union([z.number(), z.string()]).nullish(),
	applicationLink: z.string(),
});

/** Remote roles only. Its terms require Apply to use `applicationLink`, so that is the posting's address. */
export const himalayas: JobSearchAdapter = {
	id: "himalayas",
	key: null,
	attribution: { name: "Himalayas", url: "https://himalayas.app" },
	search: async ({ query, filters, limit, signal }) => {
		const postings: JobPosting[] = [];
		const country = countryName(filters.country);
		for (let page = 1; page <= pagesFor(limit, 20); page++) {
			const params = new URLSearchParams({ sort: "recent", page: String(page) });
			if (query) params.set("q", query);
			if (country) params.set("country", country);
			for (const kind of filters.employment) params.append("employment_type", EMPLOYMENT[kind]);
			const body = shape(
				z.object({ jobs: z.array(z.unknown()) }),
				// It refreshes daily, so an hour's reuse loses nothing.
				await fetchSourceJson(`https://himalayas.app/jobs/api/search?${params}`, { signal, cacheMs: 3_600_000 }),
			);
			for (const job of items(jobSchema, body.jobs)) {
				const url = httpsUrl(job.applicationLink);
				if (!url) continue;
				const restrictions = job.locationRestrictions ?? [];
				postings.push({
					source: "himalayas",
					board: null,
					url,
					title: clean(job.title),
					company: clean(job.companyName),
					location: restrictions.length ? place(...restrictions.slice(0, 5)) : "Anywhere",
					workplace: "remote",
					employment: employmentOf(job.employmentType),
					salary: salaryOf(job.minSalary, job.maxSalary, job.currency, job.salaryPeriod),
					postedAt: dateOf(job.pubDate),
					description: plainText(job.description || job.excerpt),
				});
			}
			if (body.jobs.length < 20) break;
		}
		return postings;
	},
};
