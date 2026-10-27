import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, employmentOf, httpsUrl, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, kmToMiles, onlyEmployment, pagesFor, placesOf, shape } from "./common";

const resultSchema = z.object({
	jobId: z.number(),
	employerName: z.string().nullish(),
	jobTitle: z.string(),
	locationName: z.string().nullish(),
	minimumSalary: z.number().nullish(),
	maximumSalary: z.number().nullish(),
	currency: z.string().nullish(),
	date: z.string().nullish(),
	jobDescription: z.string().nullish(),
	jobUrl: z.string(),
});

/** Reed dates read "23/10/2026". */
const reedDate = (value: string | null | undefined) => {
	const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	return match ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))) : null;
};

const auth = (apiKey: string) => ({ authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` });

export const reed: JobSearchAdapter = {
	id: "reed",
	key: { fields: ["apiKey"] },
	countries: ["GB"],
	attribution: { name: "Reed", url: "https://www.reed.co.uk" },
	search: async ({ query, filters, limit, signal, key }) => {
		const headers = auth(key?.apiKey ?? "");
		const postings: JobPosting[] = [];
		for (const where of placesOf(filters))
			for (let page = 0; page < pagesFor(limit, 100); page++) {
				const params = new URLSearchParams({ resultsToTake: "100", resultsToSkip: String(page * 100) });
				if (query) params.set("keywords", query);
				if (where) params.set("locationName", where);
				if (where && filters.radiusKm !== null) params.set("distanceFromLocation", String(kmToMiles(filters.radiusKm)));
				if (filters.minSalary?.period === "year" && filters.minSalary.currency === "GBP")
					params.set("minimumSalary", String(filters.minSalary.amount));
				if (onlyEmployment(filters, "full-time")) params.set("fullTime", "true");
				if (onlyEmployment(filters, "part-time")) params.set("partTime", "true");
				if (onlyEmployment(filters, "contract")) params.set("contract", "true");
				if (onlyEmployment(filters, "temporary")) params.set("temp", "true");
				const body = shape(
					z.object({ results: z.array(z.unknown()) }),
					await fetchSourceJson(`https://www.reed.co.uk/api/1.0/search?${params}`, { headers, signal }),
				);
				for (const result of items(resultSchema, body.results)) {
					const url = httpsUrl(result.jobUrl);
					if (!url) continue;
					postings.push({
						source: "reed",
						board: null,
						url,
						title: clean(result.jobTitle),
						company: clean(result.employerName),
						location: clean(result.locationName),
						workplace: workplaceOf({}, result.jobTitle, result.locationName),
						employment: employmentOf(result.jobTitle),
						salary: salaryOf(result.minimumSalary, result.maximumSalary, result.currency ?? "GBP", "year"),
						postedAt: reedDate(result.date),
						description: plainText(result.jobDescription),
						details: async (detailSignal) => {
							const detail = shape(
								z.object({ jobDescription: z.string().nullish() }),
								await fetchSourceJson(`https://www.reed.co.uk/api/1.0/jobs/${result.jobId}`, {
									headers,
									signal: detailSignal,
								}),
							);
							return plainText(detail.jobDescription);
						},
					});
				}
				if (body.results.length < 100) break;
			}
		return postings;
	},
};
