import type { DiscoveryFilters } from "@reactive-resume/schema/career";
import { describe, expect, it } from "vitest";
import { discoveryFiltersSchema } from "@reactive-resume/schema/career";
import { resolveCompany } from "./boards";
import { companyBoards, searchSources } from "./registry";

/**
 * Calls the real keyless sources, to notice when one changes its format. Off by default; run with
 * `JOB_SOURCES_LIVE=1 pnpm --filter @reactive-resume/api test src/features/job-sources/live.test.ts`.
 */
const live = describe.skipIf(!process.env.JOB_SOURCES_LIVE);

const filters = (overrides: Partial<DiscoveryFilters> = {}) => discoveryFiltersSchema.parse(overrides);
const signal = () => AbortSignal.timeout(60_000);

const check = (postings: { url: string; title: string }[]) => {
	expect(postings.length).toBeGreaterThan(0);
	for (const posting of postings.slice(0, 20)) {
		expect(posting.url).toMatch(/^https:\/\//);
		expect(posting.title.length).toBeGreaterThan(0);
	}
};

live("keyless job sources", { timeout: 120_000 }, () => {
	it("Bundesagentur searches Germany and reads details", async () => {
		const postings = await searchSources.bundesagentur.search({
			query: "Softwareentwickler",
			filters: filters({ country: "DE", locations: ["Berlin"] }),
			limit: 10,
			signal: signal(),
			key: null,
		});
		check(postings);
		expect((await postings[0]?.details?.(signal()))?.length).toBeGreaterThan(50);
	});

	it.each([
		["himalayas", "backend"],
		["jobicy", "python"],
		["themuse", ""],
		["arbeitnow", ""],
		["remoteok", ""],
		["weworkremotely", ""],
	] as const)("%s lists postings", async (id, query) => {
		check(await searchSources[id].search({ query, filters: filters(), limit: 20, signal: signal(), key: null }));
	});

	it.each([
		["greenhouse", "stripe"],
		["lever", "palantir"],
		["ashby", "ramp"],
		["smartrecruiters", "smartrecruiters"],
		["recruitee", "bunq"],
		["personio", "personio"],
		["workable", "huggingface"],
		["workday", "nvidia/wd5/NVIDIAExternalCareerSite"],
	] as const)("%s board %s lists roles", async (kind, slug) => {
		const { postings } = await companyBoards[kind].list(slug, { query: "engineer", signal: signal() });
		check(postings);
		const first = postings[0];
		if (first?.details) expect((await first.details(signal())).length).toBeGreaterThan(50);
		// Personio's own board lists one role with an empty description, which the feed allows.
		else if (kind !== "personio") expect(postings.some((posting) => posting.description.length > 50)).toBe(true);
	});

	it("resolves a careers address to its board", async () => {
		const company = await resolveCompany("https://jobs.ashbyhq.com/ramp", signal());
		expect(company).toMatchObject({ kind: "ashby", slug: "ramp" });
		expect(company?.openRoles).toBeGreaterThan(0);
	});
});
