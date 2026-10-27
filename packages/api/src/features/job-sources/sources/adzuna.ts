import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, employmentOf, httpsUrl, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, onlyEmployment, pagesFor, placesOf, shape } from "./common";

/** Adzuna's country sites and the currency their salaries are in. */
const CURRENCIES: Record<string, string> = {
	AT: "EUR",
	AU: "AUD",
	BE: "EUR",
	BR: "BRL",
	CA: "CAD",
	CH: "CHF",
	DE: "EUR",
	ES: "EUR",
	FR: "EUR",
	GB: "GBP",
	IN: "INR",
	IT: "EUR",
	MX: "MXN",
	NL: "EUR",
	NZ: "NZD",
	PL: "PLN",
	SG: "SGD",
	US: "USD",
	ZA: "ZAR",
};

const resultSchema = z.object({
	id: z.union([z.string(), z.number()]),
	title: z.string(),
	description: z.string().nullish(),
	created: z.string().nullish(),
	redirect_url: z.string(),
	salary_min: z.number().nullish(),
	salary_max: z.number().nullish(),
	salary_is_predicted: z.union([z.string(), z.number()]).nullish(),
	contract_time: z.string().nullish(),
	contract_type: z.string().nullish(),
	location: z.object({ display_name: z.string().nullish() }).nullish(),
	company: z.object({ display_name: z.string().nullish() }).nullish(),
});

export const adzuna: JobSearchAdapter = {
	id: "adzuna",
	key: { fields: ["appId", "appKey"] },
	countries: Object.keys(CURRENCIES),
	needsCountry: true,
	attribution: { name: "Adzuna", url: "https://www.adzuna.com" },
	search: async ({ query, filters, limit, signal, key }) => {
		const country = filters.country ?? "";
		const postings: JobPosting[] = [];
		for (const where of placesOf(filters))
			for (let page = 1; page <= pagesFor(limit, 50); page++) {
				const params = new URLSearchParams({
					app_id: key?.appId ?? "",
					app_key: key?.appKey ?? "",
					results_per_page: "50",
					"content-type": "application/json",
				});
				if (query) params.set("what", query);
				if (filters.exclude.length) params.set("what_exclude", filters.exclude.join(" "));
				if (where) params.set("where", where);
				if (where && filters.radiusKm !== null) params.set("distance", String(filters.radiusKm));
				if (filters.postedWithinDays) params.set("max_days_old", String(filters.postedWithinDays));
				if (filters.minSalary?.period === "year" && filters.minSalary.currency === CURRENCIES[country]) {
					params.set("salary_min", String(filters.minSalary.amount));
					if (!filters.hideUnknownSalary) params.set("salary_include_unknown", "1");
				}
				if (onlyEmployment(filters, "full-time")) params.set("full_time", "1");
				if (onlyEmployment(filters, "part-time")) params.set("part_time", "1");
				if (onlyEmployment(filters, "contract")) params.set("contract", "1");
				const body = shape(
					z.object({ results: z.array(z.unknown()) }),
					await fetchSourceJson(
						`https://api.adzuna.com/v1/api/jobs/${country.toLowerCase()}/search/${page}?${params}`,
						{ signal },
					),
				);
				for (const result of items(resultSchema, body.results)) {
					const url = httpsUrl(result.redirect_url);
					if (!url) continue;
					const predicted = String(result.salary_is_predicted ?? "0") === "1";
					postings.push({
						source: "adzuna",
						board: null,
						url,
						title: clean(plainText(result.title)),
						company: clean(result.company?.display_name),
						location: clean(result.location?.display_name),
						workplace: workplaceOf({}, result.title, result.location?.display_name),
						employment: employmentOf(result.contract_time) ?? (result.contract_type === "contract" ? "contract" : null),
						salary: predicted ? null : salaryOf(result.salary_min, result.salary_max, CURRENCIES[country], "year"),
						postedAt: dateOf(result.created),
						description: plainText(result.description),
					});
				}
				if (body.results.length < 50) break;
			}
		return postings;
	},
};
