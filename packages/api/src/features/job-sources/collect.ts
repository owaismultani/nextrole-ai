import type { FilterDecision } from "./filter";
import type { JobPosting, SourceKey } from "./types";
import type {
	DiscoveryFilters,
	DiscoverySources,
	JobSearchSource,
	SourceRunReport,
} from "@reactive-resume/schema/career";
import { canonicalOpportunityUrl } from "../career/scheduling";
import { applyFilters } from "./filter";
import { SourceError } from "./http";
import { companyBoards, SEARCHES_BY_QUERY, searchSources } from "./registry";

export type CollectedPosting = { posting: JobPosting; decision: FilterDecision };

/** A followed board read in full, so its saved roles that are no longer listed can be closed. */
export type ReadBoard = { board: string; urls: Set<string> };

export type Collected = {
	postings: CollectedPosting[];
	bySource: SourceRunReport[];
	boards: ReadBoard[];
};

const SOURCE_TIMEOUT_MS = 45_000;
const CONCURRENCY = 6;

async function pool<T>(tasks: (() => Promise<T>)[], size: number): Promise<T[]> {
	const results: T[] = new Array(tasks.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(size, tasks.length) }, async () => {
			while (next < tasks.length) {
				const index = next++;
				results[index] = await (tasks[index] as () => Promise<T>)();
			}
		}),
	);
	return results;
}

const failure = (error: unknown) =>
	error instanceof SourceError
		? error.reason
		: error instanceof Error && error.name === "TimeoutError"
			? "timeout"
			: "unreachable";

/**
 * Runs a search across the chosen job sources and followed company boards at once, each on its own deadline so one
 * slow or failing source never sinks the rest. Postings are deduplicated by address (first source wins) and each
 * carries the filters' decision; nothing is saved here.
 */
export async function collectJobs(input: {
	query: string;
	sources: DiscoverySources;
	filters: DiscoveryFilters;
	keys: Map<JobSearchSource, SourceKey>;
	limit: number;
	signal: AbortSignal;
}): Promise<Collected> {
	const { query, sources, filters, keys, limit, signal } = input;
	const bySource: SourceRunReport[] = [];
	const boards: ReadBoard[] = [];
	const found: JobPosting[] = [];
	const deadline = () => AbortSignal.any([signal, AbortSignal.timeout(SOURCE_TIMEOUT_MS)]);

	const searches = [...new Set(sources.apis)].map((id) => async () => {
		const adapter = searchSources[id];
		const key = keys.get(id) ?? null;
		const report: SourceRunReport = { source: id, found: 0, kept: 0, status: "ok", reason: null };
		bySource.push(report);
		if (adapter.key && !adapter.key.optional && !key)
			return Object.assign(report, { status: "skipped", reason: "needs-key" });
		if (adapter.countries && (!filters.country || !adapter.countries.includes(filters.country)))
			return Object.assign(report, { status: "skipped", reason: "country" });
		try {
			const postings = await adapter.search({ query, filters, limit, signal: deadline(), key });
			report.found = postings.length;
			found.push(...postings);
		} catch (error) {
			signal.throwIfAborted();
			Object.assign(report, { status: "failed", reason: failure(error) });
		}
		return report;
	});

	const followed = sources.companies.map((company) => async () => {
		const id = `${company.kind}:${company.slug}`;
		const report: SourceRunReport = { source: id, found: 0, kept: 0, status: "ok", reason: null };
		bySource.push(report);
		const adapter = companyBoards[company.kind];
		if (!adapter.slug.test(company.slug)) return Object.assign(report, { status: "skipped", reason: "invalid" });
		try {
			const { postings, complete } = await adapter.list(company.slug, { query, signal: deadline() });
			report.found = postings.length;
			for (const posting of postings) posting.company ||= company.name;
			found.push(...postings);
			if (complete)
				boards.push({
					board: id,
					urls: new Set(postings.flatMap((posting) => canonicalOpportunityUrl(posting.url) ?? [])),
				});
		} catch (error) {
			signal.throwIfAborted();
			Object.assign(report, { status: "failed", reason: failure(error) });
		}
		return report;
	});

	await pool([...searches, ...followed], CONCURRENCY);

	const seen = new Set<string>();
	const postings: CollectedPosting[] = [];
	const kept = new Map<string, number>();
	for (const posting of found) {
		const url = canonicalOpportunityUrl(posting.url);
		if (!url || seen.has(url)) continue;
		seen.add(url);
		posting.url = url;
		const decision = applyFilters(posting, filters, query, SEARCHES_BY_QUERY.has(posting.source));
		const reportKey = posting.board ?? posting.source;
		if (decision.ok) kept.set(reportKey, (kept.get(reportKey) ?? 0) + 1);
		postings.push({ posting, decision });
	}
	for (const report of bySource) report.kept = kept.get(report.source) ?? 0;
	return { postings, bySource, boards };
}

/** Reads full text for postings whose list carried none, a few at a time; a failed read leaves the summary. */
export async function readDetails(postings: JobPosting[], signal: AbortSignal) {
	await pool(
		postings
			.filter((posting) => posting.details && !posting.description)
			.map((posting) => async () => {
				try {
					posting.description = (await posting.details?.(AbortSignal.any([signal, AbortSignal.timeout(15_000)]))) ?? "";
				} catch {
					signal.throwIfAborted();
				}
			}),
		4,
	);
}
