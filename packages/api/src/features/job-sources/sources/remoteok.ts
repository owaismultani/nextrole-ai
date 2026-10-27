import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, salaryOf } from "../normalize";
import { items, shape } from "./common";

const jobSchema = z.object({
	id: z.union([z.string(), z.number()]),
	epoch: z.number().nullish(),
	company: z.string().nullish(),
	position: z.string(),
	tags: z.array(z.string()).nullish(),
	description: z.string().nullish(),
	location: z.string().nullish(),
	salary_min: z.number().nullish(),
	salary_max: z.number().nullish(),
	url: z.string(),
});

/**
 * The whole Remote OK feed in one response; the first entry is its legal notice. Its terms require a followed link
 * back to the posting on Remote OK and naming it as the source, which the posting's address and source label do.
 */
export const remoteok: JobSearchAdapter = {
	id: "remoteok",
	key: null,
	attribution: { name: "Remote OK", url: "https://remoteok.com" },
	search: async ({ signal }) => {
		const body = shape(
			z.array(z.unknown()),
			await fetchSourceJson("https://remoteok.com/api", { signal, cacheMs: 3_600_000 }),
		);
		const postings: JobPosting[] = [];
		for (const job of items(jobSchema, body.slice(1))) {
			const url = httpsUrl(job.url);
			if (!url) continue;
			postings.push({
				source: "remoteok",
				board: null,
				url,
				title: clean(job.position),
				company: clean(job.company),
				location: clean(job.location) || "Anywhere",
				workplace: "remote",
				employment: employmentOf(job.tags?.find((tag) => /time|contract|intern/i.test(tag))),
				salary: salaryOf(job.salary_min, job.salary_max, "USD", "year"),
				postedAt: dateOf(job.epoch),
				description: plainText(job.description),
			});
		}
		return postings;
	},
};
