import type { JobPosting, Salary } from "./types";
import type { DiscoveryFilters, FilterReason } from "@reactive-resume/schema/career";
import { matchOpportunity } from "../career/matching";

export type FilterDecision = { ok: true } | { ok: false; reason: FilterReason };

const matches = (text: string, phrases: string[]) => matchOpportunity(text, phrases).matches.length > 0;

/** A place matches when any comma part of it does: "Berlin, Germany" takes postings in Berlin or in Germany. */
const placeParts = (phrases: string[]) =>
	phrases.flatMap((phrase) => phrase.split(",").map((part) => part.trim())).filter(Boolean);

const WORLDWIDE = /\b(?:anywhere|worldwide|global|world)\b/i;

const PER_YEAR = { hour: 2080, month: 12, year: 1 } as const;
const yearly = (amount: number, period: Salary["period"]) => amount * PER_YEAR[period];

/**
 * Whether a posting meets the search's filters, and which one it failed first. A posting that doesn't say something
 * (no location, no salary, no workplace) passes that filter, unless `hideUnknownSalary` asks otherwise.
 *
 * `searched` is true when the source already searched by the query itself. A whole feed or company board didn't, so
 * without explicit titles its postings must contain the query's words.
 */
export function applyFilters(
	posting: JobPosting,
	filters: DiscoveryFilters,
	query: string,
	searched: boolean,
): FilterDecision {
	if (filters.titles.length) {
		if (!matches(posting.title, filters.titles)) return { ok: false, reason: "title" };
	} else if (!searched && query.trim()) {
		const text = [posting.title, posting.location, posting.company, posting.description].join("\n");
		if (!matches(text, [query])) return { ok: false, reason: "title" };
	}
	if (filters.exclude.length && matches(posting.title, filters.exclude)) return { ok: false, reason: "excluded" };
	if (
		filters.excludeCompanies.length &&
		posting.company &&
		filters.excludeCompanies.some((company) => posting.company.toLowerCase().includes(company.toLowerCase()))
	)
		return { ok: false, reason: "company" };
	// The country only routes country-bound sources: postings often name a city and not its country.
	const places = placeParts(filters.locations);
	if (
		places.length &&
		posting.location &&
		!matches(posting.location, places) &&
		!(posting.workplace === "remote" && WORLDWIDE.test(posting.location))
	)
		return { ok: false, reason: "location" };
	if (filters.workplace.length && posting.workplace && !filters.workplace.includes(posting.workplace))
		return { ok: false, reason: "workplace" };
	if (
		filters.postedWithinDays &&
		posting.postedAt &&
		posting.postedAt.getTime() < Date.now() - filters.postedWithinDays * 86_400_000
	)
		return { ok: false, reason: "posted" };
	if (filters.employment.length && posting.employment && !filters.employment.includes(posting.employment))
		return { ok: false, reason: "employment" };
	if (filters.minSalary) {
		const salary = posting.salary;
		const top = salary?.max ?? salary?.min ?? null;
		if (!salary || top === null) {
			if (filters.hideUnknownSalary) return { ok: false, reason: "salary" };
		} else if (
			(!salary.currency || salary.currency === filters.minSalary.currency) &&
			yearly(top, salary.period) < yearly(filters.minSalary.amount, filters.minSalary.period)
		)
			return { ok: false, reason: "salary" };
	}
	return { ok: true };
}
