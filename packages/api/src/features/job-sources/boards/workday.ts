import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, plainText, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const PAGE = 20;
const MAX_PAGES = 5;

const postingSchema = z.object({
	title: z.string(),
	externalPath: z.string().regex(/^\/job\/[^?#\s]+$/),
	locationsText: z.string().nullish(),
	postedOn: z.string().nullish(),
});

/** "Posted Today", "Posted Yesterday", "Posted 3 Days Ago", "Posted 30+ Days Ago". */
export function workdayPosted(value: string | null | undefined, now = Date.now()): Date | null {
	if (!value) return null;
	if (/today/i.test(value)) return new Date(now);
	if (/yesterday/i.test(value)) return new Date(now - 86_400_000);
	const days = value.match(/(\d+)\+?\s+days?\s+ago/i);
	return days ? new Date(now - Number(days[1]) * 86_400_000) : null;
}

/**
 * Workday has no public list API; this is the JSON its career sites use. The board is "tenant/wdN/site". Its list is
 * searched with the query and capped at 100, so it never counts as complete: a role missing from it isn't closed.
 */
export const workday: CompanyBoardAdapter = {
	kind: "workday",
	slug: /^[a-z0-9][a-z0-9_-]{0,62}\/wd\d{1,3}\/[a-z0-9][a-z0-9_-]{0,99}$/i,
	list: async (slug, { query, signal }) => {
		const [tenant, instance, site] = slug.split("/") as [string, string, string];
		const origin = `https://${tenant}.${instance}.myworkdayjobs.com`;
		const api = `${origin}/wday/cxs/${tenant}/${site}`;
		const postings: JobPosting[] = [];
		for (let page = 0; page < MAX_PAGES; page++) {
			const body = shape(
				z.object({ jobPostings: z.array(z.unknown()) }),
				await fetchSourceJson(`${api}/jobs`, {
					method: "POST",
					signal,
					cacheMs: 600_000,
					body: { appliedFacets: {}, limit: PAGE, offset: page * PAGE, searchText: query },
				}),
			);
			for (const posting of items(postingSchema, body.jobPostings)) {
				const location = clean(posting.locationsText);
				postings.push({
					source: "workday",
					board: `workday:${slug}`,
					url: `${origin}/${site}${posting.externalPath}`,
					title: clean(posting.title),
					company: "",
					// "2 Locations" says nothing about where; leave it unknown rather than filter on it.
					location: /^\d+ locations?$/i.test(location) ? "" : location,
					workplace: workplaceOf({}, posting.title, location),
					employment: null,
					salary: null,
					postedAt: workdayPosted(posting.postedOn),
					description: "",
					details: async (detailSignal) => {
						const detail = shape(
							z.object({
								jobPostingInfo: z.object({ jobDescription: z.string().nullish() }),
							}),
							await fetchSourceJson(`${api}${posting.externalPath}`, { signal: detailSignal }),
						);
						return plainText(detail.jobPostingInfo.jobDescription);
					},
				});
			}
			if (body.jobPostings.length < PAGE) break;
		}
		return { company: "", postings, complete: false };
	},
};
