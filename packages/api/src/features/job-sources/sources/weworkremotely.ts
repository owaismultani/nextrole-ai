import type { JobPosting, JobSearchAdapter } from "../types";
import { fetchSource } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, place, plainText } from "../normalize";
import { elements, text } from "../xml";

/** Every category's postings in one RSS feed. Titles read "Company: Role". */
export const weworkremotely: JobSearchAdapter = {
	id: "weworkremotely",
	key: null,
	attribution: { name: "We Work Remotely", url: "https://weworkremotely.com" },
	search: async ({ signal }) => {
		const xml = await fetchSource("https://weworkremotely.com/remote-jobs.rss", { signal, cacheMs: 3_600_000 });
		const postings: JobPosting[] = [];
		for (const item of elements(xml, "item")) {
			const url = httpsUrl(text(item, "link") || text(item, "guid"));
			const heading = clean(text(item, "title"));
			if (!url || !heading) continue;
			const split = heading.indexOf(": ");
			postings.push({
				source: "weworkremotely",
				board: null,
				url,
				title: split > 0 ? heading.slice(split + 2) : heading,
				company: split > 0 ? heading.slice(0, split) : "",
				location: place(text(item, "region"), text(item, "country")) || "Anywhere",
				workplace: "remote",
				employment: employmentOf(text(item, "type")),
				salary: null,
				postedAt: dateOf(text(item, "pubDate")),
				description: plainText(text(item, "description")),
			});
		}
		return postings;
	},
};
