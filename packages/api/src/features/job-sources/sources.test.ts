import type { DiscoveryFilters } from "@reactive-resume/schema/career";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoveryFiltersSchema } from "@reactive-resume/schema/career";
import { clearSourceCache, SourceError } from "./http";
import { companyBoards, searchSources } from "./registry";

/** Real responses from each source, trimmed to two postings (captured 2026-10-23). */
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const requests: { url: string; init: RequestInit | undefined }[] = [];
let respond: (url: string) => string | number = () => 404;

beforeEach(() => {
	requests.length = 0;
	clearSourceCache();
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			requests.push({ url, init });
			const body = respond(url);
			return typeof body === "number" ? new Response("no", { status: body }) : new Response(body, { status: 200 });
		}),
	);
});
afterEach(() => vi.unstubAllGlobals());

const filters = (overrides: Partial<DiscoveryFilters> = {}) => discoveryFiltersSchema.parse(overrides);
const search = (overrides: Partial<Parameters<(typeof searchSources)["adzuna"]["search"]>[0]> = {}) => ({
	query: "engineer",
	filters: filters(),
	limit: 20,
	signal: new AbortController().signal,
	key: null,
	...overrides,
});
const params = (index = 0) => new URL(requests[index]?.url ?? "").searchParams;

describe("job-search sources", () => {
	it("Bundesagentur maps German fields and reads details from v4 by base64 reference", async () => {
		respond = (url) =>
			url.includes("/v4/jobdetails/")
				? JSON.stringify({ stellenangebotsBeschreibung: "Wir suchen **dich** in Berlin." })
				: fixture("bundesagentur.json");
		const [first] = await searchSources.bundesagentur.search(
			search({
				query: "Softwareentwickler",
				filters: filters({ country: "DE", locations: ["Berlin"], radiusKm: 25, postedWithinDays: 7 }),
			}),
		);
		expect(Object.fromEntries(params())).toMatchObject({ was: "Softwareentwickler", wo: "Berlin", umkreis: "25" });
		expect(params().get("veroeffentlichtseit")).toBe("7");
		expect(new Headers(requests[0]?.init?.headers).get("x-api-key")).toBe("jobboerse-jobsuche");
		expect(first).toMatchObject({
			source: "bundesagentur",
			title: "Softwareentwicklerin (w/m/d)",
			company: "GASAG AG",
			workplace: "hybrid",
			employment: "full-time",
			salary: { min: 72600, currency: "EUR", period: "year" },
		});
		expect(first?.url).toBe("https://www.arbeitsagentur.de/jobsuche/jobdetail/10001-1003891446-S");
		expect(await first?.details?.(new AbortController().signal)).toContain("Wir suchen");
		expect(requests[1]?.url).toContain(`/v4/jobdetails/${Buffer.from("10001-1003891446-S").toString("base64")}`);
	});

	it("Himalayas keeps applicationLink as the address and marks roles remote", async () => {
		respond = () => fixture("himalayas.json");
		const [first] = await searchSources.himalayas.search(
			search({ query: "backend", filters: filters({ country: "DE", employment: ["full-time"] }) }),
		);
		expect(params().get("q")).toBe("backend");
		expect(params().get("country")).toBe("Germany");
		expect(params().getAll("employment_type")).toEqual(["Full Time"]);
		expect(first?.url).toMatch(/^https:\/\/himalayas\.app\/companies\/m2talents\/jobs\//);
		expect(first).toMatchObject({ workplace: "remote", employment: "full-time", company: "m2TALENTS" });
	});

	it("Jobicy, Remote OK, Arbeitnow, The Muse and We Work Remotely read their lists", async () => {
		const cases = [
			["jobicy", "jobicy.json", { title: "Engineering Manager, Core Engineering", company: "SeatGeek" }],
			["remoteok", "remoteok.json", { title: "Senior DevOps Engineer", company: "Lemon.io", workplace: "remote" }],
			["arbeitnow", "arbeitnow.json", { title: "Mitarbeiter (w/m/d) Kundensupport", company: "IONOS SE" }],
			["themuse", "themuse.json", { title: "Senior Technical Product Manager - AvaCloud", company: "Ava Labs" }],
			["weworkremotely", "weworkremotely.rss", { title: "Senior Backend Engineer", company: "DuckDuckGo" }],
		] as const;
		for (const [id, file, expected] of cases) {
			respond = () => fixture(file);
			const postings = await searchSources[id].search(search());
			expect(postings.length, id).toBe(2);
			expect(postings[0], id).toMatchObject(expected);
			expect(postings[0]?.url, id).toMatch(/^https:\/\//);
			expect(postings[0]?.description.length, id).toBeGreaterThan(20);
		}
	});

	it("Remote OK skips its legal notice and reads salaries as USD a year", async () => {
		respond = () => fixture("remoteok.json");
		const postings = await searchSources.remoteok.search(search());
		expect(postings.every((posting) => posting.title)).toBe(true);
		expect(postings[0]?.salary).toMatchObject({ min: 50000, currency: "USD", period: "year" });
	});

	it("sends keyed sources their keys and maps the filters they take", async () => {
		respond = () => JSON.stringify({ results: [] });
		await searchSources.adzuna.search(
			search({
				query: "data engineer",
				key: { appId: "id", appKey: "secret" },
				filters: filters({
					country: "GB",
					locations: ["London"],
					radiusKm: 10,
					exclude: ["intern"],
					postedWithinDays: 14,
					employment: ["contract"],
					minSalary: { amount: 60000, currency: "GBP", period: "year" },
				}),
			}),
		);
		expect(requests[0]?.url).toMatch(/^https:\/\/api\.adzuna\.com\/v1\/api\/jobs\/gb\/search\/1\?/);
		expect(Object.fromEntries(params())).toMatchObject({
			app_id: "id",
			app_key: "secret",
			what: "data engineer",
			what_exclude: "intern",
			where: "London",
			distance: "10",
			max_days_old: "14",
			salary_min: "60000",
			salary_include_unknown: "1",
			contract: "1",
		});

		respond = () => JSON.stringify({ results: [] });
		await searchSources.reed.search(
			search({ key: { apiKey: "reed-key" }, filters: filters({ country: "GB", locations: ["Leeds"], radiusKm: 16 }) }),
		);
		const reed = requests.at(-1);
		expect(new Headers(reed?.init?.headers).get("authorization")).toBe(
			`Basic ${Buffer.from("reed-key:").toString("base64")}`,
		);
		expect(new URL(reed?.url ?? "").searchParams.get("distanceFromLocation")).toBe("10");

		respond = () => JSON.stringify({ jobs: [] });
		await searchSources.jooble.search(search({ key: { apiKey: "jooble/key" } }));
		expect(requests.at(-1)?.url).toBe("https://jooble.org/api/jooble%2Fkey");
		expect(requests.at(-1)?.init?.method).toBe("POST");

		respond = () => JSON.stringify({ SearchResult: { SearchResultItems: [] } });
		await searchSources.usajobs.search(search({ key: { apiKey: "k", email: "me@example.com" } }));
		const usajobs = new Headers(requests.at(-1)?.init?.headers);
		expect(usajobs.get("authorization-key")).toBe("k");
		expect(usajobs.get("user-agent")).toBe("me@example.com");
	});

	it("reads one search per place, up to five", async () => {
		respond = () => JSON.stringify({ ergebnisliste: [] });
		await searchSources.bundesagentur.search(
			search({ filters: filters({ country: "DE", locations: ["Berlin", "Hamburg", "München"] }) }),
		);
		expect(requests.map((request) => new URL(request.url).searchParams.get("wo"))).toEqual([
			"Berlin",
			"Hamburg",
			"München",
		]);
	});

	it("turns HTTP failures into source failures", async () => {
		for (const [status, reason] of [
			[401, "auth"],
			[429, "quota"],
			[404, "not-found"],
			[500, "unreachable"],
		] as const) {
			respond = () => status;
			await expect(searchSources.jobicy.search(search())).rejects.toMatchObject({ reason });
		}
		respond = () => "not json";
		await expect(searchSources.jobicy.search(search())).rejects.toBeInstanceOf(SourceError);
	});
});

describe("company boards", () => {
	const list = (kind: keyof typeof companyBoards, slug: string, query = "") =>
		companyBoards[kind].list(slug, { query, signal: new AbortController().signal });

	it("Greenhouse lists without descriptions, then reads one role's text", async () => {
		respond = (url) => (url.endsWith("/jobs") ? fixture("greenhouse.json") : fixture("greenhouse-job.json"));
		const { company, postings, complete } = await list("greenhouse", "stripe");
		expect(requests[0]?.url).toBe("https://boards-api.greenhouse.io/v1/boards/stripe/jobs");
		expect(company).toBe("Stripe");
		expect(complete).toBe(true);
		expect(postings[0]).toMatchObject({
			title: "Abuse Investigator",
			location: "Dublin",
			board: "greenhouse:stripe",
			description: "",
		});
		const text = await postings[0]?.details?.(new AbortController().signal);
		expect(text).not.toMatch(/&lt;|<h2>/);
		expect(requests[1]?.url).toBe("https://boards-api.greenhouse.io/v1/boards/stripe/jobs/8172508");
	});

	it("Lever, Ashby, Recruitee and Workable carry descriptions in their lists", async () => {
		const cases = [
			["lever", "palantir", "lever.json", "https://api.lever.co/v0/postings/palantir?mode=json"],
			["ashby", "ramp", "ashby.json", "https://api.ashbyhq.com/posting-api/job-board/ramp?includeCompensation=true"],
			["recruitee", "bunq", "recruitee.json", "https://bunq.recruitee.com/api/offers/"],
			[
				"workable",
				"huggingface",
				"workable.json",
				"https://apply.workable.com/api/v1/widget/accounts/huggingface?details=true",
			],
		] as const;
		for (const [kind, slug, file, endpoint] of cases) {
			respond = () => fixture(file);
			const { postings, complete } = await list(kind, slug);
			expect(requests.at(-1)?.url, kind).toBe(endpoint);
			expect(complete, kind).toBe(true);
			expect(postings.length, kind).toBeGreaterThan(0);
			expect(postings[0]?.board, kind).toBe(`${kind}:${slug}`);
			expect(postings[0]?.description.length, kind).toBeGreaterThan(50);
		}
	});

	it("Lever's EU boards use its EU host", async () => {
		respond = () => "[]";
		await list("lever", "eu/acme");
		expect(requests[0]?.url).toBe("https://api.eu.lever.co/v0/postings/acme?mode=json");
	});

	it("Ashby and Lever read their workplace types", async () => {
		respond = () => fixture("ashby.json");
		const ashby = await list("ashby", "ramp");
		expect(ashby.postings.find((posting) => posting.title === "Security Engineer, Cloud")).toMatchObject({
			workplace: "hybrid",
			employment: "full-time",
		});
		respond = () => fixture("lever.json");
		expect((await list("lever", "palantir")).postings[0]?.workplace).toBe("hybrid");
	});

	it("SmartRecruiters builds public addresses and reads description sections", async () => {
		respond = (url) =>
			url.includes("/postings/")
				? JSON.stringify({ jobAd: { sections: { jobDescription: { text: "<p>Run SRE for the platform.</p>" } } } })
				: fixture("smartrecruiters.json");
		const { postings, company, complete } = await list("smartrecruiters", "smartrecruiters");
		expect(company).toBe("SmartRecruiters Inc");
		expect(complete).toBe(true);
		expect(postings[0]?.url).toBe("https://jobs.smartrecruiters.com/smartrecruiters/744000157427223");
		expect(postings[0]?.workplace).toBe("remote");
		expect(await postings[0]?.details?.(new AbortController().signal)).toContain("Run SRE for the platform.");
	});

	it("Personio reads its XML and builds role addresses on the right domain", async () => {
		respond = () => fixture("personio.xml");
		const { postings, company } = await list("personio", "personio");
		expect(company).toBe("Personio SE & Co. KG");
		expect(postings[0]).toMatchObject({
			url: "https://personio.jobs.personio.de/job/1834171",
			title: "Staff Software Engineer, Data Platform",
			location: "Munich, Berlin",
			employment: "full-time",
		});
		await list("personio", "acme.com");
		expect(requests.at(-1)?.url).toBe("https://acme.jobs.personio.com/xml");
	});

	it("Workday searches with the query, never counts as complete, and ignores '2 Locations'", async () => {
		respond = () => fixture("workday.json");
		const { postings, complete } = await list("workday", "nvidia/wd5/NVIDIAExternalCareerSite", "backend");
		expect(requests[0]?.url).toBe("https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs");
		expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({ searchText: "backend", limit: 20, offset: 0 });
		expect(complete).toBe(false);
		expect(postings[0]).toMatchObject({
			url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Senior-Data-Backend-Engineer_JR2020354",
			location: "",
		});
	});

	it("caches a board's list briefly, so two searches read it once", async () => {
		respond = () => fixture("greenhouse.json");
		await list("greenhouse", "stripe");
		await list("greenhouse", "stripe");
		expect(requests).toHaveLength(1);
	});
});
