import type { JobPosting } from "./types";
import type { DiscoveryFilters, DiscoverySources } from "@reactive-resume/schema/career";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { searchJobPostings } from "../applications/posting";
import { canonicalOpportunityUrl, parseListingTitle } from "../career/scheduling";
import { webAccessService } from "../web-access/credentials";
import { collectJobs } from "./collect";
import { jobSourceKeys } from "./credentials";
import { applyFilters } from "./filter";
import { workplaceOf } from "./normalize";

/** The most a preview lists; enough to judge the filters without sending a whole feed to the browser. */
const MAX_RESULTS = 300;

/**
 * Runs a search once across the chosen sources and applies the filters, saving nothing, so a search can be tried
 * and tuned before it runs on a schedule. Web hits aren't opened here: they are judged by their titles alone.
 */
export async function searchJobs(
	userId: string,
	input: { query: string; sources: DiscoverySources; filters: DiscoveryFilters },
	signal?: AbortSignal,
) {
	const deadline = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(60_000)]);
	const connection = input.sources.web ? await webAccessService.resolve(userId) : null;
	const [web, collected] = await Promise.all([
		connection && input.query
			? searchJobPostings(input.query, { userId, connection, signal: deadline }, { limit: 20 }).then(
					(hits) => ({ hits, failed: false }),
					() => ({ hits: [], failed: true }),
				)
			: null,
		collectJobs({
			query: input.query,
			sources: input.sources,
			filters: input.filters,
			keys: await jobSourceKeys.resolve(userId),
			limit: 50,
			signal: deadline,
		}),
	]);

	const fromWeb = (web?.hits ?? []).flatMap((hit) => {
		const url = canonicalOpportunityUrl(hit.url);
		if (!url) return [];
		const title = parseListingTitle(hit.title.replace(/\s+/g, " ").trim());
		const posting: JobPosting = {
			source: "web" as JobPosting["source"],
			board: null,
			url,
			title: title.role,
			company: title.company,
			location: "",
			workplace: workplaceOf({}, title.role),
			employment: null,
			salary: null,
			postedAt: null,
			description: hit.description,
		};
		return [{ posting, decision: applyFilters(posting, input.filters, input.query, true) }];
	});
	const seen = new Set<string>();
	const all = [...fromWeb, ...collected.postings].filter(({ posting }) => {
		if (seen.has(posting.url)) return false;
		seen.add(posting.url);
		return true;
	});
	// Kept roles first, newest first, then what the filters left out.
	all.sort(
		(a, b) =>
			Number(b.decision.ok) - Number(a.decision.ok) ||
			(b.posting.postedAt?.getTime() ?? 0) - (a.posting.postedAt?.getTime() ?? 0),
	);
	const listed = all.slice(0, MAX_RESULTS);
	const urls = listed.map(({ posting }) => posting.url);
	const known = new Set(
		urls.length
			? (
					await db
						.select({ url: tables.careerOpportunity.url })
						.from(tables.careerOpportunity)
						.where(and(eq(tables.careerOpportunity.userId, userId), inArray(tables.careerOpportunity.url, urls)))
				).map((row) => row.url)
			: [],
	);
	return {
		results: listed.map(({ posting, decision }) => ({
			url: posting.url,
			title: posting.title,
			company: posting.company,
			location: posting.location,
			source: posting.board ?? posting.source,
			workplace: posting.workplace,
			employment: posting.employment,
			postedAt: posting.postedAt,
			salary: posting.salary,
			known: known.has(posting.url),
			filteredBy: decision.ok ? null : decision.reason,
		})),
		bySource: [
			...(input.sources.web
				? [
						{
							source: "web",
							found: web?.hits.length ?? 0,
							kept: fromWeb.filter(({ decision }) => decision.ok).length,
							status: !connection ? ("skipped" as const) : web?.failed ? ("failed" as const) : ("ok" as const),
							reason: !connection ? "needs-key" : web?.failed ? "search" : null,
						},
					]
				: []),
			...collected.bySource,
		],
	};
}
