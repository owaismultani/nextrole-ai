import type { JobPosting, JobSearchAdapter } from "../types";
import z from "zod";
import { fetchSourceJson } from "../http";
import { clean, dateOf, place, plainText, salaryOf, workplaceOf } from "../normalize";
import { items, onlyEmployment, pagesFor, placesOf, remoteOnly, shape } from "./common";

const BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc";
/** The Federal Employment Agency's published client key; every caller uses it. */
const headers = { "x-api-key": "jobboerse-jobsuche" };

const offerSchema = z.object({
	referenznummer: z.string(),
	stellenangebotsTitel: z.string().nullish(),
	titel: z.string().nullish(),
	firma: z.string().nullish(),
	arbeitszeitVollzeit: z.boolean().nullish(),
	arbeitszeitTeilzeitFlexibel: z.boolean().nullish(),
	arbeitszeitTeilzeitVormittag: z.boolean().nullish(),
	homeofficemoeglich: z.boolean().nullish(),
	homeofficeprozent: z.number().nullish(),
	vertragsdauer: z.string().nullish(),
	verguetungsangabe: z.string().nullish(),
	festgehalt: z.number().nullish(),
	datumErsteVeroeffentlichung: z.string().nullish(),
	stellenangebotsart: z.string().nullish(),
	stellenlokationen: z
		.array(z.object({ adresse: z.object({ ort: z.string().nullish(), region: z.string().nullish() }).nullish() }))
		.nullish(),
	arbeitsort: z.object({ ort: z.string().nullish(), region: z.string().nullish() }).nullish(),
});

/**
 * Germany's public job exchange. Searches run on v6; full descriptions only come from v4's details, keyed by the
 * reference number in base64.
 */
export const bundesagentur: JobSearchAdapter = {
	id: "bundesagentur",
	key: null,
	countries: ["DE"],
	attribution: { name: "Bundesagentur für Arbeit", url: "https://www.arbeitsagentur.de/jobsuche" },
	search: async ({ query, filters, limit, signal }) => {
		const postings: JobPosting[] = [];
		const hours = [
			...(onlyEmployment(filters, "full-time") ? ["vz"] : []),
			...(onlyEmployment(filters, "part-time") ? ["tz"] : []),
			...(remoteOnly(filters) ? ["ho"] : []),
		];
		for (const where of placesOf(filters))
			for (let page = 1; page <= pagesFor(limit, 50); page++) {
				const params = new URLSearchParams({ page: String(page), size: "50", angebotsart: "1" });
				if (onlyEmployment(filters, "internship")) params.set("angebotsart", "34");
				if (query) params.set("was", query);
				if (where) params.set("wo", where);
				if (where && filters.radiusKm !== null) params.set("umkreis", String(filters.radiusKm));
				if (filters.postedWithinDays)
					params.set("veroeffentlichtseit", String(Math.min(100, filters.postedWithinDays)));
				if (hours.length) params.set("arbeitszeit", hours.join(";"));
				const body = shape(
					z.object({ ergebnisliste: z.array(z.unknown()).nullish() }),
					await fetchSourceJson(`${BASE}/v6/jobs?${params}`, { headers, signal }),
				);
				const results = body.ergebnisliste ?? [];
				for (const offer of items(offerSchema, results)) {
					const title = clean(offer.stellenangebotsTitel ?? offer.titel);
					if (!title) continue;
					const address = offer.stellenlokationen?.[0]?.adresse ?? offer.arbeitsort;
					const location = place(address?.ort, address?.region && clean(address.region).replace(/_/g, " "), "Germany");
					const reference = offer.referenznummer;
					postings.push({
						source: "bundesagentur",
						board: null,
						url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(reference)}`,
						title,
						company: clean(offer.firma),
						location,
						workplace: offer.homeofficemoeglich
							? (offer.homeofficeprozent ?? 0) >= 100
								? "remote"
								: "hybrid"
							: workplaceOf({}, title),
						employment: offer.arbeitszeitVollzeit
							? "full-time"
							: offer.arbeitszeitTeilzeitFlexibel || offer.arbeitszeitTeilzeitVormittag
								? "part-time"
								: null,
						salary:
							offer.verguetungsangabe === "JAHRESGEHALT" || offer.verguetungsangabe === "MONATSGEHALT"
								? salaryOf(offer.festgehalt, null, "EUR", offer.verguetungsangabe === "MONATSGEHALT" ? "month" : "year")
								: null,
						postedAt: dateOf(offer.datumErsteVeroeffentlichung),
						description: "",
						details: async (detailSignal) => {
							const detail = shape(
								z.object({ stellenangebotsBeschreibung: z.string().nullish() }),
								await fetchSourceJson(`${BASE}/v4/jobdetails/${Buffer.from(reference).toString("base64")}`, {
									headers,
									signal: detailSignal,
								}),
							);
							return plainText(detail.stellenangebotsBeschreibung);
						},
					});
				}
				if (results.length < 50) break;
			}
		return postings;
	},
};
