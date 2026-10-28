import type {
	CompanyBoard,
	DiscoveryFilters,
	Employment,
	JobSearchSource,
	Workplace,
} from "@reactive-resume/schema/career";

export type Salary = {
	min: number | null;
	max: number | null;
	/** ISO 4217, or null when the source doesn't say. */
	currency: string | null;
	period: "hour" | "month" | "year";
};

/** One open role as a source describes it, normalized so every source is filtered and saved the same way. */
export type JobPosting = {
	/** The source id: a job-search source ("adzuna") or a company board ("greenhouse"). */
	source: JobSearchSource | CompanyBoard;
	/** The followed company board it came from ("greenhouse:acme"); null for job-search sources. */
	board: string | null;
	url: string;
	title: string;
	company: string;
	location: string;
	workplace: Workplace | null;
	employment: Employment | null;
	salary: Salary | null;
	postedAt: Date | null;
	/** Plain text; empty when the list carries only a summary and `details` reads the rest. */
	description: string;
	/** Reads the full posting text. Called only for postings kept by the filters and not already saved. */
	details?: (signal: AbortSignal) => Promise<string>;
};

export type SourceKey = Record<string, string>;

type SearchRequest = {
	query: string;
	filters: DiscoveryFilters;
	/** Roughly how many results to ask for; sources page until they have it or run out. */
	limit: number;
	signal: AbortSignal;
	/** The resolved key for keyed sources; null when the source is keyless or its key is optional and absent. */
	key: SourceKey | null;
};

export type JobSearchAdapter = {
	id: JobSearchSource;
	/** The key fields a source needs; `optional` sources also run without one. Null when no key exists. */
	key: { fields: string[]; optional?: boolean } | null;
	/** Searches only these countries (ISO 3166-1 alpha-2); a search for another country skips it. */
	countries?: string[];
	/** The search can't run without a country, because the source is split by country. */
	needsCountry?: boolean;
	/** Credit the source's terms require next to its postings. */
	attribution: { name: string; url: string };
	search: (request: SearchRequest) => Promise<JobPosting[]>;
};

type BoardRequest = { query: string; signal: AbortSignal };

export type CompanyBoardAdapter = {
	kind: CompanyBoard;
	/** What a board name may look like; checked before it goes into an address, so it can't point anywhere else. */
	slug: RegExp;
	/**
	 * The board's open roles. `complete` is false when the list is a search or was cut short, so a role missing from it
	 * isn't taken as closed.
	 */
	list: (
		slug: string,
		request: BoardRequest,
	) => Promise<{ company: string; postings: JobPosting[]; complete: boolean }>;
};
