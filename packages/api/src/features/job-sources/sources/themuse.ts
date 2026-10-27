import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, httpsUrl, place, plainText, workplaceOf } from "../normalize";
import { items, pagesFor, shape } from "./common";

const jobSchema = z.object({
	name: z.string(),
	contents: z.string().nullish(),
	publication_date: z.string().nullish(),
	locations: z.array(z.object({ name: z.string() })).nullish(),
	refs: z.object({ landing_page: z.string() }),
	company: z.object({ name: z.string().nullish() }).nullish(),
});

/**
 * The Muse takes no keywords, only places (in its own spelling, such as "Berlin, Germany" or "Flexible / Remote"),
 * so it reads the newest postings for each place and the filters do the rest. A key only raises its rate limit.
 */
export const themuse: JobSearchAdapter = {
	id: "themuse",
	key: { fields: ["apiKey"], optional: true },
	attribution: { name: "The Muse", url: "https://www.themuse.com" },
	search: async ({ filters, limit, signal, key }) => {
		const postings: JobPosting[] = [];
		for (let page = 0; page < pagesFor(limit, 20, 3); page++) {
			const params = new URLSearchParams({ page: String(page), descending: "true" });
			for (const location of filters.locations) params.append("location", location);
			if (filters.workplace.includes("remote")) params.append("location", "Flexible / Remote");
			if (key?.apiKey) params.set("api_key", key.apiKey);
			const body = shape(
				z.object({ results: z.array(z.unknown()), page_count: z.number().nullish() }),
				await fetchSourceJson(`https://www.themuse.com/api/public/jobs?${params}`, { signal, cacheMs: 1_800_000 }),
			);
			for (const job of items(jobSchema, body.results)) {
				const url = httpsUrl(job.refs.landing_page);
				if (!url) continue;
				const places = (job.locations ?? []).map((location) => location.name);
				postings.push({
					source: "themuse",
					board: null,
					url,
					title: clean(job.name),
					company: clean(job.company?.name),
					location: place(...places.slice(0, 5)),
					workplace: workplaceOf({}, ...places),
					employment: null,
					salary: null,
					postedAt: dateOf(job.publication_date),
					description: plainText(job.contents),
				});
			}
			if (page + 1 >= (body.page_count ?? 0)) break;
		}
		return postings;
	},
};
