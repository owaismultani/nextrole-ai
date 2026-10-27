import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, place, plainText, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const PAGE = 100;
const MAX_PAGES = 10;

const postingSchema = z.object({
	id: z.string(),
	name: z.string(),
	releasedDate: z.string().nullish(),
	company: z.object({ name: z.string().nullish() }).nullish(),
	typeOfEmployment: z.object({ label: z.string().nullish() }).nullish(),
	location: z
		.object({
			city: z.string().nullish(),
			region: z.string().nullish(),
			country: z.string().nullish(),
			remote: z.boolean().nullish(),
			hybrid: z.boolean().nullish(),
		})
		.nullish(),
});

const sectionSchema = z.object({ text: z.string().nullish() }).nullish();

/** Paged at 100; details hold the description sections. The company id is case-sensitive ("Visa", "smartrecruiters"). */
export const smartrecruiters: CompanyBoardAdapter = {
	kind: "smartrecruiters",
	slug: /^[a-z0-9][a-z0-9_-]{0,99}$/i,
	list: async (slug, { signal }) => {
		const base = `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
		const postings: JobPosting[] = [];
		let company = "";
		let complete = false;
		for (let page = 0; page < MAX_PAGES; page++) {
			const body = shape(
				z.object({ content: z.array(z.unknown()), totalFound: z.number().nullish() }),
				await fetchSourceJson(`${base}?limit=${PAGE}&offset=${page * PAGE}`, { signal, cacheMs: 600_000 }),
			);
			for (const posting of items(postingSchema, body.content)) {
				company ||= clean(posting.company?.name);
				const location = place(
					posting.location?.city,
					posting.location?.region,
					posting.location?.country?.toUpperCase(),
				);
				postings.push({
					source: "smartrecruiters",
					board: `smartrecruiters:${slug}`,
					url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${encodeURIComponent(posting.id)}`,
					title: clean(posting.name),
					company: clean(posting.company?.name),
					location,
					workplace: workplaceOf(
						{ remote: posting.location?.remote, hybrid: posting.location?.hybrid },
						posting.name,
						location,
					),
					employment: employmentOf(posting.typeOfEmployment?.label),
					salary: null,
					postedAt: dateOf(posting.releasedDate),
					description: "",
					details: async (detailSignal) => {
						const detail = shape(
							z.object({
								jobAd: z
									.object({
										sections: z
											.object({
												companyDescription: sectionSchema,
												jobDescription: sectionSchema,
												qualifications: sectionSchema,
												additionalInformation: sectionSchema,
											})
											.nullish(),
									})
									.nullish(),
							}),
							await fetchSourceJson(`${base}/${encodeURIComponent(posting.id)}`, { signal: detailSignal }),
						);
						const sections = detail.jobAd?.sections;
						return plainText(
							[
								sections?.jobDescription,
								sections?.qualifications,
								sections?.additionalInformation,
								sections?.companyDescription,
							]
								.map((section) => section?.text ?? "")
								.join("\n"),
						);
					},
				});
			}
			if (body.content.length < PAGE) {
				complete = true;
				break;
			}
		}
		return { company, postings, complete };
	},
};
