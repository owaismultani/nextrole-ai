import type { CompanyBoardAdapter, JobPosting } from "../types";
import { fetchSource } from "../http";
import { clean, dateOf, employmentOf, place, plainText, workplaceOf } from "../normalize";
import { elements, text } from "../xml";

/** "acme" is acme.jobs.personio.de; "acme.com" is acme.jobs.personio.com. The feed is XML. */
export const personio: CompanyBoardAdapter = {
	kind: "personio",
	slug: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.com)?$/i,
	list: async (slug, { signal }) => {
		const [name, tld] = slug.endsWith(".com") ? [slug.slice(0, -4), "com"] : [slug, "de"];
		const origin = `https://${name}.jobs.personio.${tld}`;
		const xml = await fetchSource(`${origin}/xml`, { signal, cacheMs: 600_000 });
		let company = "";
		const postings = elements(xml, "position").flatMap((position): JobPosting[] => {
			const id = text(position, "id").trim();
			const title = clean(text(position, "name"));
			if (!/^\d+$/.test(id) || !title) return [];
			company ||= clean(text(position, "subcompany"));
			const offices = elements(position, "office").map((office) => office.trim());
			const location = place(...offices);
			const description = elements(position, "jobDescription")
				.map((part) => `${clean(text(part, "name"))}\n${plainText(text(part, "value"))}`)
				.join("\n\n");
			return [
				{
					source: "personio",
					board: `personio:${slug}`,
					url: `${origin}/job/${id}`,
					title,
					company: clean(text(position, "subcompany")),
					location,
					workplace: workplaceOf({}, title, location),
					employment: employmentOf(text(position, "schedule")) ?? employmentOf(text(position, "employmentType")),
					salary: null,
					postedAt: dateOf(text(position, "createdAt")),
					description: plainText(description),
				},
			];
		});
		return { company, postings, complete: true };
	},
};
