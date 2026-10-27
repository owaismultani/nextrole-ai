import type { CompanyBoardAdapter, JobPosting } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, place, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, shape } from "../sources/common";

const jobSchema = z.object({
	title: z.string(),
	location: z.string().nullish(),
	secondaryLocations: z.array(z.object({ location: z.string().nullish() })).nullish(),
	employmentType: z.string().nullish(),
	isRemote: z.boolean().nullish(),
	isListed: z.boolean().nullish(),
	workplaceType: z.string().nullish(),
	publishedAt: z.string().nullish(),
	jobUrl: z.string(),
	descriptionPlain: z.string().nullish(),
	descriptionHtml: z.string().nullish(),
	compensation: z
		.object({
			summaryComponents: z
				.array(
					z.object({
						compensationType: z.string().nullish(),
						interval: z.string().nullish(),
						currencyCode: z.string().nullish(),
						minValue: z.number().nullish(),
						maxValue: z.number().nullish(),
					}),
				)
				.nullish(),
		})
		.nullish(),
});

export const ashby: CompanyBoardAdapter = {
	kind: "ashby",
	slug: /^[a-z0-9][a-z0-9._-]{0,99}$/i,
	list: async (slug, { signal }) => {
		const body = shape(
			z.object({ jobs: z.array(z.unknown()) }),
			await fetchSourceJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`, {
				signal,
				cacheMs: 600_000,
			}),
		);
		const postings = items(jobSchema, body.jobs).flatMap((job): JobPosting[] => {
			const url = httpsUrl(job.jobUrl);
			if (!url || job.isListed === false) return [];
			const type = job.workplaceType?.toLowerCase();
			const pay = job.compensation?.summaryComponents?.find((part) => part.compensationType === "Salary");
			return [
				{
					source: "ashby",
					board: `ashby:${slug}`,
					url,
					title: clean(job.title),
					company: "",
					location: place(job.location, ...(job.secondaryLocations ?? []).map((other) => other.location)),
					workplace:
						type === "remote" || type === "hybrid"
							? type
							: type === "onsite"
								? "onsite"
								: workplaceOf({ remote: job.isRemote }, job.title, job.location),
					employment: employmentOf(job.employmentType),
					salary: pay
						? salaryOf(
								pay.minValue,
								pay.maxValue,
								pay.currencyCode,
								/hour/i.test(pay.interval ?? "") ? "hour" : pay.interval,
							)
						: null,
					postedAt: dateOf(job.publishedAt),
					description: job.descriptionPlain ? plainText(job.descriptionPlain) : plainText(job.descriptionHtml),
				},
			];
		});
		return { company: "", postings, complete: true };
	},
};
