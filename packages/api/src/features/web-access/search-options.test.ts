import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SEARCH_LIMIT, PROVIDER_SEARCH_MAX, searchLimit } from "./contracts";

const sent = vi.hoisted(() => ({ calls: [] as { url: string; body: Record<string, unknown> }[] }));
vi.mock("./transport", async () => {
	const actual = await vi.importActual<typeof import("./transport")>("./transport");
	return {
		...actual,
		postJson: async (url: string, _headers: unknown, body: Record<string, unknown>) => {
			sent.calls.push({ url, body });
			return { results: [] };
		},
	};
});

const { searchTavily } = await import("./tavily");
const { searchExa } = await import("./exa");
const connection = { provider: "tavily", apiKey: "k" } as never;
const signal = new AbortController().signal;

describe("search result limits", () => {
	beforeEach(() => {
		sent.calls.length = 0;
	});

	it("keeps the small default for every other feature, and clamps a budget only to the provider's own maximum", () => {
		expect(searchLimit(undefined, "exa")).toBe(DEFAULT_SEARCH_LIMIT);
		expect(searchLimit({}, "exa")).toBe(5);
		expect(searchLimit({ limit: 60 }, "exa")).toBe(60);
		expect(searchLimit({ limit: 60 }, "tavily")).toBe(PROVIDER_SEARCH_MAX.tavily);
		expect(searchLimit({ limit: 500 }, "firecrawl")).toBe(PROVIDER_SEARCH_MAX.firecrawl);
		expect(searchLimit({ limit: 0 }, "exa")).toBe(1);
	});

	it("sends the budget and a start date to Tavily only when asked", async () => {
		await searchTavily("q", { connection, signal });
		expect(sent.calls[0]?.body).toMatchObject({ max_results: 5 });
		expect(sent.calls[0]?.body).not.toHaveProperty("start_date");
		await searchTavily("q", { connection, signal, search: { limit: 15, since: new Date("2026-10-19T08:00:00Z") } });
		expect(sent.calls[1]?.body).toMatchObject({ max_results: 15, start_date: "2026-10-19" });
	});

	it("sends the budget and a published-since filter to Exa only when asked", async () => {
		await searchExa("q", { connection, signal });
		expect(sent.calls[0]?.body).toMatchObject({ numResults: 5 });
		expect(sent.calls[0]?.body).not.toHaveProperty("startPublishedDate");
		await searchExa("q", { connection, signal, search: { limit: 12, since: new Date("2026-10-19T08:00:00Z") } });
		expect(sent.calls[1]?.body).toMatchObject({ numResults: 12, startPublishedDate: "2026-10-19T08:00:00.000Z" });
	});
});
