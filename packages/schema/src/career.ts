import z from "zod";
import { timezoneSchema } from "@reactive-resume/utils/timezone";

/** The workspace tabs of one application, in the order a search happens. */
/** The application workspace's tabs, by purpose: what the job is, its documents, its answers, its interviews and its history. */
export const WORKSPACE_TABS = [
	"summary",
	"documents",
	"answers",
	"interviews",
	"messages",
	"saved",
	"activity",
] as const;
export const workspaceTabSchema = z.enum(WORKSPACE_TABS);
export type WorkspaceTab = z.infer<typeof workspaceTabSchema>;

/** Inside Interviews: the round's overview, then preparing for it, practising for it and writing it up. */
export const INTERVIEW_SECTIONS = ["overview", "prepare", "practise", "debrief"] as const;
export const interviewSectionSchema = z.enum(INTERVIEW_SECTIONS);
export type InterviewSection = z.infer<typeof interviewSectionSchema>;

/** The tab names used before the workspace was reorganized, and where each one goes now. */
const LEGACY_WORKSPACE_TABS = {
	fit: { tab: "summary" },
	apply: { tab: "answers" },
	prepare: { tab: "interviews", section: "prepare" },
	practise: { tab: "interviews", section: "practise" },
	debrief: { tab: "interviews", section: "debrief" },
} as const satisfies Record<string, { tab: WorkspaceTab; section?: InterviewSection }>;

/** A current or former tab name resolved to the tab (and interview section) it opens, or null when it is neither. */
export function resolveWorkspaceTab(
	name: string | undefined,
): { tab: WorkspaceTab; section?: InterviewSection } | null {
	if (!name) return null;
	const current = workspaceTabSchema.safeParse(name);
	if (current.success) return { tab: current.data };
	const legacy = (LEGACY_WORKSPACE_TABS as Record<string, { tab: WorkspaceTab; section?: InterviewSection }>)[name];
	return legacy ?? null;
}

/**
 * What the coach is told the user is looking at: a workspace tab, or the section within Interviews. Older apps still send
 * the former tab names, so those are accepted too.
 */
export const workspaceHintSchema = z.enum([...WORKSPACE_TABS, "fit", "apply", "prepare", "practise", "debrief"]);
export type WorkspaceHint = z.infer<typeof workspaceHintSchema>;

export const careerScopeSchema = z.object({ applicationId: z.string().min(1).nullable().default(null) });

export const careerSourceSchema = z.object({
	kind: z.enum([
		"user-message",
		"resume",
		"letter",
		"resume-version",
		"letter-version",
		"attachment",
		"manual",
		"debrief",
	]),
	id: z.string().max(255),
	quote: z.string().max(4000),
});
export type CareerSource = z.infer<typeof careerSourceSchema>;

export const factCategorySchema = z.enum(["accomplishment", "experience", "skill", "preference"]);
export type FactCategory = z.infer<typeof factCategorySchema>;

export const memoryModeSchema = z.enum(["ask", "auto", "off"]);
export type MemoryMode = z.infer<typeof memoryModeSchema>;

const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const payPeriodSchema = z.enum(["hour", "month", "year"]);

/** Preferences: what the user is looking for, used by discovery, Fit, Offers and the coach. */
export const careerProfileDataSchema = z.object({
	targetRoles: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
	locations: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
	/** "What matters to you", in the user's own words. */
	priorities: z.string().max(4000).default(""),
	minBase: z
		.object({ amount: z.number().nonnegative().nullable(), currency: currencySchema, period: payPeriodSchema })
		.default({ amount: null, currency: "USD", period: "year" }),
	/** 0 is fully remote. */
	maxOfficeDays: z.number().int().min(0).max(5).nullable().default(null),
	noticeWeeks: z.number().int().min(0).max(52).nullable().default(null),
	memoryMode: memoryModeSchema.default("ask"),
});
export type CareerProfileData = z.infer<typeof careerProfileDataSchema>;

export const careerFactInputSchema = careerScopeSchema.extend({
	text: z.string().trim().min(1).max(2000),
	category: factCategorySchema,
	source: careerSourceSchema,
});

export const careerStoryInputSchema = careerScopeSchema.extend({
	title: z.string().trim().min(1).max(200),
	situation: z.string().trim().min(1).max(4000),
	task: z.string().trim().min(1).max(4000),
	action: z.string().trim().min(1).max(6000),
	result: z.string().trim().max(4000).default(""),
	reflection: z.string().trim().max(4000).default(""),
	factIds: z.array(z.string().min(1)).max(30).default([]),
	tags: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});
export type CareerStoryData = z.infer<typeof careerStoryInputSchema>;

/** Offer terms in their own currency and pay period. Unknown amounts are null, never zero. */
export const offerTermsSchema = z.object({
	version: z.enum(["written", "verbal"]).default("written"),
	currency: currencySchema,
	period: payPeriodSchema,
	base: z.number().nonnegative().nullable(),
	variable: z.number().nonnegative().nullable(),
	/** What the bonus depends on, or "" when unconditional or unknown. */
	variableConditions: z.string().max(1000).default(""),
	equity: z.string().max(1000).default(""),
	location: z.string().max(500).default(""),
	officeDays: z.number().int().min(0).max(5).nullable().default(null),
	leave: z.string().max(500).default(""),
	learning: z.number().nonnegative().nullable().default(null),
	other: z.string().max(1000).default(""),
	respondBy: z.iso.datetime({ offset: true }).nullable().default(null),
});
export type OfferTerms = z.infer<typeof offerTermsSchema>;

const text = (max = 2000) => z.string().trim().max(max);

/**
 * What the coach wrote for an application, by kind. Each one is produced by `career.generate` from a fixed shape,
 * so tabs render it without parsing prose, and it still opens when the provider is down.
 */
export const savedItemDataSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("fit"),
		headline: text(200),
		summary: text(600),
		requirements: z
			.array(
				z.object({
					text: text(300),
					origin: z.enum(["posting", "inferred"]),
					status: z.enum(["supported", "partial", "missing"]),
					evidence: text(600),
					factIds: z.array(z.string()).max(10).default([]),
				}),
			)
			.max(20),
		/** Checks against Preferences: salary, office days, location. `met: null` is "needs confirming". */
		checks: z.array(z.object({ label: text(60), met: z.boolean().nullable(), text: text(300) })).max(5),
		ask: z.object({ person: text(100), text: text(400) }).nullable(),
	}),
	z.object({
		kind: z.literal("briefing"),
		headline: text(200),
		summary: text(300),
		plan: z
			.array(
				z.object({
					minutes: z.number().int().min(1).max(60),
					title: text(120),
					detail: text(400),
					action: z.enum(["story", "draft-story", "questions", "practise", "none"]),
					storyId: z.string().nullable().default(null),
				}),
			)
			.max(8),
		questions: z.array(z.object({ text: text(400), origin: text(60) })).max(8),
		focus: text(500),
		opening: text(600),
		stories: z.array(text(300)).max(3),
		honesty: text(400),
		storyIds: z.array(z.string()).max(5).default([]),
		/** A story the interviewer asked for that Knowledge doesn't have yet. */
		missingStory: text(300).nullable().default(null),
		practiceQuestions: z.array(text(300)).max(5).default([]),
	}),
	z.object({
		kind: z.literal("practice"),
		question: text(500),
		origin: z.enum(["simulated", "recalled"]),
		mode: z.enum(["typed", "spoken"]),
		answer: text(6000),
		title: text(200),
		works: text(500),
		strengthen: text(500),
		opening: text(800),
		/** A three-word result note for the attempts rail, e.g. "Contribution unclear". */
		note: text(60),
	}),
	z.object({
		kind: z.literal("debrief"),
		round: text(100),
		question: text(500),
		answer: text(6000),
		landed: z.enum(["well", "mixed", "not"]),
		title: text(200),
		verdicts: z.array(z.object({ tag: z.enum(["supported", "observation"]), text: text(400) })).max(6),
		nextRound: text(600),
		priority: text(400),
		/** Something the interviewer asked for, worth remembering for this application only. */
		remember: text(400).nullable().default(null),
		plan: z
			.array(
				z.object({
					day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
					minutes: z.number().int().min(5).max(120),
					task: text(300),
				}),
			)
			.max(5),
	}),
	z.object({
		kind: z.literal("answers"),
		answers: z.array(z.object({ question: text(), answer: text(6000) })).max(30),
	}),
	z.object({
		kind: z.literal("reply"),
		message: text(20_000),
		title: text(200),
		asks: z.array(text(300)).max(5),
		unconfirmed: z.array(text(300)).max(5),
		reply: text(4000),
		changes: z
			.array(
				z.discriminatedUnion("type", [
					z.object({
						type: z.literal("stage"),
						// Never "applied": marking a submission is Apply's job, with the versions sent.
						stage: z.enum(["screening", "interview", "offer", "closed"]),
					}),
					/** The application's next step, with a reminder when a reply is due. */
					z.object({ type: z.literal("follow-up"), at: z.iso.datetime({ offset: true }).nullable(), note: text(300) }),
					z.object({ type: z.literal("offer") }),
				]),
			)
			.max(4),
		offer: offerTermsSchema.nullable().default(null),
		/** Set when the user applied the proposal: which changes, and when. */
		applied: z
			.object({ at: z.iso.datetime({ offset: true }), changes: z.array(z.number().int()) })
			.nullable()
			.default(null),
	}),
	z.object({ kind: z.literal("offer"), ...offerTermsSchema.shape }),
]);
export type SavedItemData = z.infer<typeof savedItemDataSchema>;
export type SavedItemKind = SavedItemData["kind"];

/**
 * Live, user-owned state of one application's workspace. Each widget owns one key and saves the whole value, so
 * the fields have no defaults: a partial save must not reset the keys it leaves out. Start from `EMPTY_WORKSPACE`.
 */
export const careerWorkspaceSchema = z.object({
	answers: z
		.array(
			z.object({
				id: z.string().min(1).max(64),
				question: text(),
				answer: text(6000),
				factIds: z.array(z.string()).max(10),
			}),
		)
		.max(30),
	/** Indexes of the ticked "Before you submit" items. */
	checklist: z.array(z.number().int().min(0).max(10)).max(10),
	/** Questions to ask, added from Fit or the coach. */
	questions: z.array(z.object({ text: text(400), origin: text(60) })).max(20),
	/** Fit requirements closed with "Add evidence": requirement text → the new fact's id. */
	evidence: z.record(z.string().max(300), z.string().max(64)),
	/** Ticked rows per list: "plan:{savedItemId}", "now:{interviewId}", "week:{savedItemId}". */
	ticks: z.record(z.string().max(100), z.array(z.string().max(20)).max(20)),
	/** The employer message pasted into Messages, kept with the application. */
	message: text(20_000),
});
export type CareerWorkspace = z.infer<typeof careerWorkspaceSchema>;
export const EMPTY_WORKSPACE: CareerWorkspace = {
	answers: [],
	checklist: [],
	questions: [],
	evidence: {},
	ticks: {},
	message: "",
};

/** What a tab asks the coach to write. */
export const generateTaskSchema = z.discriminatedUnion("task", [
	z.object({ task: z.literal("fit") }),
	z.object({ task: z.literal("briefing"), interviewId: z.string().min(1) }),
	z.object({
		task: z.literal("practice"),
		storyId: z.string().min(1).optional(),
		interviewId: z.string().min(1).nullable(),
		question: text(500).min(1),
		origin: z.enum(["simulated", "recalled"]),
		mode: z.enum(["typed", "spoken"]),
		answer: text(6000).min(10),
	}),
	z.object({
		task: z.literal("debrief"),
		interviewId: z.string().min(1).nullable(),
		question: text(500).min(1),
		answer: text(6000).min(1),
		landed: z.enum(["well", "mixed", "not"]),
	}),
	z.object({ task: z.literal("reply"), message: text(20_000).min(1) }),
	/** Not saved: a shorter answer, or a first draft when `answer` is empty. */
	z.object({
		task: z.literal("answer"),
		question: text().min(1),
		answer: text(6000),
	}),
]);
export type GenerateTask = z.infer<typeof generateTaskSchema>;

/**
 * A notification, stored as what happened rather than as words. The server writes its English title and body when it's
 * read, so a later release can show the same notices in the reader's language (and any times in their timezone).
 */
export const careerNoticeSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("opportunities"), count: z.number().int().min(1), query: z.string() }),
	z.object({ type: z.literal("briefing"), company: z.string(), role: z.string() }),
	z.object({ type: z.literal("followup"), company: z.string(), role: z.string() }),
	z.object({ type: z.literal("schedule-failed"), reason: z.enum(["stopped", "failed"]) }),
	z.object({ type: z.literal("email-failed") }),
	z.object({ type: z.literal("briefing-paused") }),
]);
export type CareerNotice = z.infer<typeof careerNoticeSchema>;

/** Discovery cadences shorter than a day, in minutes. Longer ones keep `intervalDays` and its wall-clock behaviour. */
export const careerIntervalMinutesSchema = z.union([z.literal(60), z.literal(180), z.literal(360)]);

// ---- Job sources: where discovery looks, and what it keeps ----

/** Job-search APIs and public feeds. Each searches across companies; keyed ones need a server or personal key. */
export const JOB_SEARCH_SOURCES = [
	"adzuna",
	"reed",
	"jooble",
	"usajobs",
	"bundesagentur",
	"himalayas",
	"jobicy",
	"themuse",
	"arbeitnow",
	"remoteok",
	"weworkremotely",
] as const;
export const jobSearchSourceSchema = z.enum(JOB_SEARCH_SOURCES);
export type JobSearchSource = z.infer<typeof jobSearchSourceSchema>;
/** The sources that work with no key, switched on for a new search. */
export const KEYLESS_JOB_SOURCES: JobSearchSource[] = [
	"bundesagentur",
	"himalayas",
	"jobicy",
	"themuse",
	"arbeitnow",
	"remoteok",
	"weworkremotely",
];

/** Applicant-tracking systems whose public boards list every open role of one company. */
export const COMPANY_BOARDS = [
	"greenhouse",
	"lever",
	"ashby",
	"smartrecruiters",
	"recruitee",
	"personio",
	"workable",
	"workday",
] as const;
export const companyBoardSchema = z.enum(COMPANY_BOARDS);
export type CompanyBoard = z.infer<typeof companyBoardSchema>;
export const followedCompanySchema = z.object({
	kind: companyBoardSchema,
	/** The board's name in its address; Workday's is "tenant/wdN/site". */
	slug: z.string().trim().min(1).max(200),
	name: z.string().trim().max(200).default(""),
});
export type FollowedCompany = z.infer<typeof followedCompanySchema>;

export const discoverySourcesSchema = z.object({
	/** The search connection from Settings (Firecrawl, Tavily or Exa). */
	web: z.boolean().default(true),
	apis: z.array(jobSearchSourceSchema).max(JOB_SEARCH_SOURCES.length).default(KEYLESS_JOB_SOURCES),
	companies: z.array(followedCompanySchema).max(500).default([]),
	/** Follow the company boards that web search turns up, so their other roles are found too. */
	followFromSearch: z.boolean().default(true),
});
export type DiscoverySources = z.infer<typeof discoverySourcesSchema>;

export const workplaceSchema = z.enum(["remote", "hybrid", "onsite"]);
export type Workplace = z.infer<typeof workplaceSchema>;
export const employmentSchema = z.enum(["full-time", "part-time", "contract", "temporary", "internship"]);
export type Employment = z.infer<typeof employmentSchema>;
const phrases = (max: number) => z.array(z.string().trim().min(1).max(200)).max(max).default([]);

/**
 * What a search keeps. Sources apply what they can on their side; everything is checked again here, so every source
 * obeys the same rules. A posting that doesn't say (no salary, no location) passes unless asked otherwise.
 */
export const discoveryFiltersSchema = z.object({
	/** A title must match one of these; empty uses the search's keywords. */
	titles: phrases(30),
	/** Words that reject a title. */
	exclude: phrases(50),
	/** Any of these places; empty is anywhere. */
	locations: phrases(20),
	/** ISO 3166-1 alpha-2. Country-bound sources (Reed, USAJOBS, Bundesagentur) only run for their country. */
	country: z
		.string()
		.regex(/^[A-Z]{2}$/)
		.nullable()
		.default(null),
	radiusKm: z.number().int().min(0).max(500).nullable().default(null),
	/** Empty is any. */
	workplace: z.array(workplaceSchema).max(3).default([]),
	postedWithinDays: z.number().int().min(1).max(365).nullable().default(null),
	/** Empty is any. */
	employment: z.array(employmentSchema).max(5).default([]),
	minSalary: z
		.object({ amount: z.number().nonnegative(), currency: currencySchema, period: payPeriodSchema })
		.nullable()
		.default(null),
	hideUnknownSalary: z.boolean().default(false),
	excludeCompanies: phrases(100),
});
export type DiscoveryFilters = z.infer<typeof discoveryFiltersSchema>;

/** A new search's filters, read from Preferences: target roles, places, fully remote, and minimum base pay. */
export function defaultDiscoveryFilters(
	profile: Pick<CareerProfileData, "targetRoles" | "locations" | "maxOfficeDays" | "minBase">,
): DiscoveryFilters {
	return discoveryFiltersSchema.parse({
		titles: profile.targetRoles.slice(0, 30),
		locations: profile.locations.slice(0, 20),
		workplace: profile.maxOfficeDays === 0 ? ["remote"] : [],
		minSalary:
			profile.minBase.amount !== null
				? { amount: profile.minBase.amount, currency: profile.minBase.currency, period: profile.minBase.period }
				: null,
	});
}

/** Why a posting was left out. */
export const filterReasonSchema = z.enum([
	"title",
	"excluded",
	"location",
	"workplace",
	"posted",
	"employment",
	"salary",
	"company",
]);
export type FilterReason = z.infer<typeof filterReasonSchema>;

/**
 * What one discovery run did, so a quiet schedule can be told apart from a broken one. The counts add up:
 * `found` = `duplicates` + `rejected` + `readFailures` + `filtered` + `matches`.
 */
export const careerRunReportSchema = z.object({
	/** `partial` ran to the end but some postings could not be read; `failed` produced nothing usable. */
	outcome: z.enum(["success", "partial", "failed"]),
	/** Where a failed run stopped: the search service, reading every posting, or something else. */
	failure: z.enum(["search", "extraction", "unknown"]).nullable(),
	trigger: z.enum(["schedule", "manual"]),
	at: z.string(),
	/** The searches sent to the search service. */
	queries: z.array(z.string()),
	/** The search service used, and the sites its results came from. */
	provider: z.string(),
	sources: z.array(z.string()),
	found: z.number().int().min(0),
	/** Already known, or listed more than once in this run. */
	duplicates: z.number().int().min(0),
	/** Not an open job posting (closed, a listing page, or an unusable address). */
	rejected: z.number().int().min(0),
	/** New roles added to Today. */
	matches: z.number().int().min(0),
	/** Pages that could not be fetched or read this run. */
	readFailures: z.number().int().min(0),
	/** Postings the search's filters left out. Absent from runs before filters existed. */
	filtered: z.number().int().min(0).optional(),
	/** Each source's share: postings found, kept by the filters, and whether it failed or was skipped. */
	bySource: z
		.array(
			z.object({
				source: z.string(),
				found: z.number().int().min(0),
				kept: z.number().int().min(0),
				status: z.enum(["ok", "failed", "skipped"]),
				/** Why it failed or was skipped: "auth", "quota", "unreachable", "needs-key", "country" and the like. */
				reason: z.string().nullable(),
			}),
		)
		.optional(),
});
export type SourceRunReport = NonNullable<z.infer<typeof careerRunReportSchema>["bySource"]>[number];
export type CareerRunReport = z.infer<typeof careerRunReportSchema>;

export const careerScheduleInputSchema = careerScopeSchema.extend({
	kind: z.enum(["discovery", "prepare", "follow-up"]),
	query: z.string().trim().max(500).default(""),
	interviewId: z.string().nullable().default(null),
	/** Prepare only: when the briefing runs relative to the interview. */
	lead: z.enum(["24h", "2h", "morning"]).nullable().default(null),
	enabled: z.boolean().default(true),
	email: z.boolean().default(false),
	nextRunAt: z.coerce.date(),
	timezone: timezoneSchema,
	intervalDays: z.number().int().min(1).max(30).nullable().default(null),
	/** Discovery only, instead of `intervalDays`: a fixed gap between runs. */
	intervalMinutes: careerIntervalMinutesSchema.nullable().default(null),
	/** Discovery only: results one run may retrieve (at least 5); null uses the default. */
	retrievalBudget: z.int32().min(5).nullable().default(null),
	/** Discovery only: where to look; null keeps web search alone, as schedules did before sources existed. */
	sources: discoverySourcesSchema.nullable().default(null),
	/** Discovery only: what to keep; null uses Preferences. */
	filters: discoveryFiltersSchema.nullable().default(null),
	aiProviderId: z.string().min(1).nullable().default(null),
	/** The interface language; a scheduled briefing is written in it. Kept when left out. */
	locale: z.string().min(2).max(20).optional(),
});

// ---- Automation: discovery plus optional document preparation ----

/** Results one discovery run may retrieve. No ceiling of its own: each provider clamps to what its API accepts. */
export const RETRIEVAL_BUDGET = { min: 5, default: 15 } as const;
/** Budgets the schedule sheets offer. Tavily returns at most 20; Exa and Firecrawl up to 100. */
export const RETRIEVAL_BUDGET_CHOICES = [5, 10, 15, 20, 30, 50, 100] as const;
/** Documents generated per day. No ceiling; it only bounds AI spend when the person wants one. */
export const DAILY_LIMIT = { min: 1, default: 10 } as const;
export const DEFAULT_RESUME_PROMPT =
	"Prioritize the experience and skills that best match this role while keeping the resume truthful and concise.";
export const DEFAULT_COVER_LETTER_PROMPT =
	"Write a clear, specific letter that connects my strongest relevant experience to this role without overstating my background.";
const automationPrompt = (fallback: string) => z.string().trim().max(2000).default(fallback);

/** Document preparation for discovered jobs. Discovery itself is a schedule, set up in Career → Schedules. */
export const careerAutomationInputSchema = z.object({
	resumesEnabled: z.boolean().default(false),
	lettersEnabled: z.boolean().default(false),
	baselineResumeId: z.string().min(1).nullable().default(null),
	aiProviderId: z.string().min(1).nullable().default(null),
	dailyLimit: z.int32().min(DAILY_LIMIT.min).default(DAILY_LIMIT.default),
	resumePrompt: automationPrompt(DEFAULT_RESUME_PROMPT),
	coverLetterPrompt: automationPrompt(DEFAULT_COVER_LETTER_PROMPT),
});

export const preparationKindSchema = z.enum(["resume", "letter"]);
export type PreparationKind = z.infer<typeof preparationKindSchema>;
export const preparationStatusSchema = z.enum(["queued", "running", "done", "failed", "canceled"]);
export type PreparationStatus = z.infer<typeof preparationStatusSchema>;

/** Why a step stopped or waits. Words are written by each app. */
export const preparationErrorSchema = z.enum([
	"setting-off",
	"daily-limit",
	"no-baseline",
	"no-description",
	"no-ai",
	"provider",
	"rate-limit",
	"invalid-output",
	"unknown",
]);
export type PreparationError = z.infer<typeof preparationErrorSchema>;

// ---- First-run setup ----

export const setupIntervalSchema = z.enum(["hourly", "3h", "6h", "daily"]);
export type SetupInterval = z.infer<typeof setupIntervalSchema>;

/** The last step of setup: everything the person chose, applied at once. Discovery starts immediately. */
export const careerSetupLaunchSchema = z.object({
	query: z.string().trim().min(3).max(500),
	interval: setupIntervalSchema.default("hourly"),
	retrievalBudget: z.int32().min(RETRIEVAL_BUDGET.min).default(RETRIEVAL_BUDGET.default),
	resumesEnabled: z.boolean().default(false),
	lettersEnabled: z.boolean().default(false),
	/** Extra guidance for each document type; left out keeps what is saved (or the default on a first run). */
	resumePrompt: z.string().trim().max(2000).optional(),
	coverLetterPrompt: z.string().trim().max(2000).optional(),
	aiProviderId: z.string().min(1).nullable().default(null),
	dailyLimit: z.int32().min(DAILY_LIMIT.min).default(DAILY_LIMIT.default),
	timezone: timezoneSchema,
	locale: z.string().min(2).max(20).optional(),
});

// ---- Activity: what the pipeline did, in order ----

/** How long runs, results and events are kept. Short on purpose: this is a recent-history view, not an archive. */
export const ACTIVITY_RETENTION_DAYS = 30;

export const careerEventKindSchema = z.enum([
	"run.finished",
	"job.saved",
	"prep.queued",
	"prep.started",
	"prep.done",
	"prep.retry",
	"prep.deferred",
	"prep.failed",
	"prep.canceled",
	"setting.changed",
]);
export type CareerEventKind = z.infer<typeof careerEventKindSchema>;
export const careerEventLevelSchema = z.enum(["info", "warn", "error"]);
export type CareerEventLevel = z.infer<typeof careerEventLevelSchema>;
/** Small, plain facts only: counts, codes, job titles. Never resume text, keys or provider messages. */
export type CareerEventData = Record<string, string | number | boolean | null>;

/** What happened to one search result in a run. */
export const runItemDecisionSchema = z.enum(["new", "known", "rejected", "unreadable", "invalid", "filtered"]);
export type RunItemDecision = z.infer<typeof runItemDecisionSchema>;
