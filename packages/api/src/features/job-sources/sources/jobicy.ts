import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, salaryOf } from "../normalize";
import { items, shape } from "./common";

const jobSchema = z.object({
	url: z.string(),
	jobTitle: z.string(),
	companyName: z.string().nullish(),
	jobType: z.array(z.string()).nullish(),
	jobGeo: z.string().nullish(),
	jobExcerpt: z.string().nullish(),
	jobDescription: z.string().nullish(),
	pubDate: z.string().nullish(),
	salaryMin: z.number().nullish(),
	salaryMax: z.number().nullish(),
	salaryCurrency: z.string().nullish(),
	salaryPeriod: z.string().nullish(),
});

/** Remote roles only. Its terms ask for credit with a direct link, and Apply must use the posting's own address. */
export const jobicy: JobSearchAdapter = {
	id: "jobicy",
	key: null,
	attribution: { name: "Jobicy", url: "https://jobicy.com" },
	search: async ({ query, signal }) => {
		const params = new URLSearchParams({ count: "100" });
		// `tag` searches titles and descriptions; a long phrase rarely matches, so it gets the first few words.
		const tag = query.split(/\s+/).slice(0, 3).join(" ");
		if (tag) params.set("tag", tag);
		const body = shape(
			z.object({ jobs: z.array(z.unknown()).nullish() }),
			await fetchSourceJson(`https://jobicy.com/api/v2/remote-jobs?${params}`, { signal, cacheMs: 3_600_000 }),
		);
		const postings: JobPosting[] = [];
		for (const job of items(jobSchema, body.jobs ?? [])) {
			const url = httpsUrl(job.url);
			if (!url) continue;
			postings.push({
				source: "jobicy",
				board: null,
				url,
				title: clean(plainText(job.jobTitle)),
				company: clean(job.companyName),
				location: clean(job.jobGeo) || "Anywhere",
				workplace: "remote",
				employment: employmentOf(job.jobType?.[0]),
				salary: salaryOf(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod),
				postedAt: dateOf(job.pubDate),
				description: plainText(job.jobDescription || job.jobExcerpt),
			});
		}
		return postings;
	},
};
