import z from "zod";

export const webAccessProviderSchema = z.enum(["firecrawl", "tavily", "exa"]);
export type WebAccessProvider = z.infer<typeof webAccessProviderSchema>;

/** Resolved on the server for each request; never accepted as a tool input. */
export type WebAccessConnection = {
	provider: WebAccessProvider;
	apiKey?: string;
	apiUrl?: string;
};

export type WebAccessContext = {
	connection: WebAccessConnection | null;
	userId: string;
	signal?: AbortSignal | undefined;
};

export type ReadPageResult = {
	requestedUrl: string;
	resolvedUrl?: string;
	content: string;
	format: "text" | "markdown";
	/** Time received by this application, not necessarily an origin fetch. */
	retrievedAt: string;
	providerFetchedAt?: string;
	method: "builtin" | WebAccessProvider;
	truncated: boolean;
	completeness: "unknown" | "incomplete";
	fallbackReason?: WebAccessFailure;
	/** Bounded server-only input for JobPosting parsing. */
	html?: string;
};

export type WebAccessFailure =
	| "unsafe-url"
	| "unreachable"
	| "not-a-page"
	| "too-large"
	| "auth"
	| "quota"
	| "malformed"
	| "empty"
	| "challenge"
	| "timeout"
	| "unavailable"
	| "rate-limit";

export class WebAccessError extends Error {
	constructor(readonly reason: WebAccessFailure) {
		super(`Web access failed (${reason}).`);
		this.name = "WebAccessError";
	}
}

export const MAX_PAGE_BYTES = 2_000_000;
export const MAX_CONTENT_CHARS = 20_000;
export const MAX_SEARCH_RESULTS = 5;
export const WEB_ACCESS_DEADLINE_MS = 20_000;

/**
 * Optional bounds for one search. Without them a search returns the provider's default handful, which is what every
 * feature but scheduled discovery wants. Providers rank results rather than page through them, so more results means
 * a larger single request, not a cursor.
 */
export type SearchOptions = {
	/** How many results to ask for; clamped to what the provider allows. */
	limit?: number | undefined;
	/** Prefer results published after this moment, where the provider can filter by date. */
	since?: Date | undefined;
};

export type ProviderRequest = {
	connection: WebAccessConnection;
	signal: AbortSignal;
	search?: SearchOptions | undefined;
};

export const DEFAULT_SEARCH_LIMIT = 5;
/** Tavily's cap per search, the lowest of the three providers. */
export const MAX_SEARCH_LIMIT = 20;
export const searchLimit = (options: SearchOptions | undefined) =>
	Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(options?.limit ?? DEFAULT_SEARCH_LIMIT)));
