import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const offerSchema = z.object({
	title: z.string(),
	careers_url: z.string(),
	status: z.string().nullish(),
	location: z.string().nullish(),
	remote: z.boolean().nullish(),
	hybrid: z.boolean().nullish(),
	on_site: z.boolean().nullish(),
	employment_type_code: z.string().nullish(),
	published_at: z.string().nullish(),
	description: z.string().nullish(),
	requirements: z.string().nullish(),
	company_name: z.string().nullish(),
	salary: z
		.object({
			min: z.union([z.number(), z.string()]).nullish(),
			max: z.union([z.number(), z.string()]).nullish(),
			currency: z.string().nullish(),
			period: z.string().nullish(),
		})
		.nullish(),
});

/** Recruitee dates read "2026-10-15 09:31:36 UTC". */
const recruiteeDate = (value: string | null | undefined) => dateOf(value?.replace(" UTC", "Z").replace(" ", "T"));

export const recruitee: CompanyBoardAdapter = {
	kind: "recruitee",
	// A subdomain label.
	slug: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
	list: async (slug, { signal }) => {
		const body = shape(
			z.object({ offers: z.array(z.unknown()) }),
			await fetchSourceJson(`https://${slug}.recruitee.com/api/offers/`, { signal, cacheMs: 600_000 }),
		);
		const offers = items(offerSchema, body.offers).filter((offer) => !offer.status || offer.status === "published");
		const postings = offers.flatMap((offer): JobPosting[] => {
			const url = httpsUrl(offer.careers_url);
			if (!url) return [];
			return [
				{
					source: "recruitee",
					board: `recruitee:${slug}`,
					url,
					title: clean(offer.title),
					company: clean(offer.company_name),
					location: clean(offer.location),
					workplace: workplaceOf(
						{ remote: offer.remote, hybrid: offer.hybrid, onsite: offer.on_site },
						offer.title,
						offer.location,
					),
					employment: employmentOf(offer.employment_type_code),
					salary: offer.salary
						? salaryOf(offer.salary.min, offer.salary.max, offer.salary.currency, offer.salary.period)
						: null,
					postedAt: recruiteeDate(offer.published_at),
					description: plainText(`${offer.description ?? ""}\n${offer.requirements ?? ""}`),
				},
			];
		});
		return { company: clean(offers[0]?.company_name), postings, complete: true };
	},
};
