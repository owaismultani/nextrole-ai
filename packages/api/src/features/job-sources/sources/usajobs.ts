import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, kmToMiles, pagesFor, placesOf, shape } from "./common";

const itemSchema = z.object({
	MatchedObjectDescriptor: z.object({
		PositionTitle: z.string(),
		PositionURI: z.string(),
		PositionLocationDisplay: z.string().nullish(),
		OrganizationName: z.string().nullish(),
		DepartmentName: z.string().nullish(),
		PositionRemuneration: z
			.array(
				z.object({
					MinimumRange: z.string().nullish(),
					MaximumRange: z.string().nullish(),
					RateIntervalCode: z.string().nullish(),
				}),
			)
			.nullish(),
		PositionSchedule: z.array(z.object({ Name: z.string().nullish() })).nullish(),
		PublicationStartDate: z.string().nullish(),
		QualificationSummary: z.string().nullish(),
		UserArea: z.object({ Details: z.object({ JobSummary: z.string().nullish() }).nullish() }).nullish(),
	}),
});

/** USAJOBS asks for the registered email as the User-Agent beside the key. Salaries are USD; "PH" is per hour. */
export const usajobs: JobSearchAdapter = {
	id: "usajobs",
	key: { fields: ["apiKey", "email"] },
	countries: ["US"],
	attribution: { name: "USAJOBS", url: "https://www.usajobs.gov" },
	search: async ({ query, filters, limit, signal, key }) => {
		const headers = { "authorization-key": key?.apiKey ?? "", "user-agent": key?.email ?? "" };
		const postings: JobPosting[] = [];
		for (const where of placesOf(filters))
			for (let page = 1; page <= pagesFor(limit, 250, 2); page++) {
				const params = new URLSearchParams({ ResultsPerPage: "250", Page: String(page) });
				if (query) params.set("Keyword", query);
				if (where) params.set("LocationName", where);
				if (where && filters.radiusKm !== null) params.set("Radius", String(kmToMiles(filters.radiusKm)));
				if (filters.postedWithinDays) params.set("DatePosted", String(Math.min(60, filters.postedWithinDays)));
				if (filters.minSalary?.period === "year" && filters.minSalary.currency === "USD")
					params.set("RemunerationMinimumAmount", String(filters.minSalary.amount));
				const body = shape(
					z.object({ SearchResult: z.object({ SearchResultItems: z.array(z.unknown()) }) }),
					await fetchSourceJson(`https://data.usajobs.gov/api/search?${params}`, { headers, signal }),
				);
				const results = body.SearchResult.SearchResultItems;
				for (const { MatchedObjectDescriptor: job } of items(itemSchema, results)) {
					const url = httpsUrl(job.PositionURI);
					if (!url) continue;
					const pay = job.PositionRemuneration?.[0];
					postings.push({
						source: "usajobs",
						board: null,
						url,
						title: clean(job.PositionTitle),
						company: clean(job.OrganizationName || job.DepartmentName),
						location: clean(job.PositionLocationDisplay),
						workplace: workplaceOf({}, job.PositionTitle, job.PositionLocationDisplay),
						employment: employmentOf(job.PositionSchedule?.[0]?.Name),
						salary: pay
							? salaryOf(pay.MinimumRange, pay.MaximumRange, "USD", pay.RateIntervalCode === "PH" ? "hour" : "year")
							: null,
						postedAt: dateOf(job.PublicationStartDate),
						description: plainText(
							[job.UserArea?.Details?.JobSummary, job.QualificationSummary].filter(Boolean).join("\n\n"),
						),
					});
				}
				if (results.length < 250) break;
			}
		return postings;
	},
};
