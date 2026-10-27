import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import * as tables from "@reactive-resume/db/schema";
import {
	careerIntervalMinutesSchema,
	careerEventKindSchema,
	careerEventLevelSchema,
	careerNoticeSchema,
	careerRunReportSchema,
	careerSourceSchema,
	careerStoryInputSchema,
	discoveryFiltersSchema,
	discoverySourcesSchema,
	preparationErrorSchema,
	runItemDecisionSchema,
	preparationKindSchema,
	preparationStatusSchema,
	savedItemDataSchema,
} from "@reactive-resume/schema/career";

export const careerFactSchema = createSelectSchema(tables.careerFact, {
	source: careerSourceSchema,
	revisions: z.array(z.object({ text: z.string(), at: z.string() })),
}).extend({
	/** The application it's private to, by name; null for shared facts. */
	company: z.string().nullable(),
	/** Stories it backs and saved items that used it. */
	usedBy: z.object({ stories: z.number(), savedItems: z.number() }),
});
export const careerStorySchema = createSelectSchema(tables.careerStory, { data: careerStoryInputSchema });
export const savedItemSchema = createSelectSchema(tables.careerArtifact, {
	data: savedItemDataSchema,
	evidence: z.object({ factIds: z.array(z.string()), storyIds: z.array(z.string()) }),
});
export const careerScheduleSchema = createSelectSchema(tables.careerSchedule, {
	intervalMinutes: careerIntervalMinutesSchema.nullable(),
	lastRun: careerRunReportSchema.nullable(),
	sources: discoverySourcesSchema.nullable(),
	filters: discoveryFiltersSchema.nullable(),
});
export const careerScheduleListItemSchema = careerScheduleSchema.extend({
	/** A run waiting for the next scheduler tick, or in progress. */
	activeRun: z.enum(["queued", "running"]).nullable(),
});
export const careerNotificationSchema = createSelectSchema(tables.careerNotification, {
	notice: careerNoticeSchema,
}).extend({
	/** Written from `notice` when it's read (English for now). */
	title: z.string(),
	body: z.string(),
});
export const careerOpportunitySchema = createSelectSchema(tables.careerOpportunity)
	.omit({ description: true })
	.extend({
		/** Target roles and locations from Preferences that the posting matches, in the user's words. */
		matches: z.array(z.string()),
		/** What the posting doesn't say. */
		unknowns: z.array(z.enum(["salary", "office"])),
	});

export const careerOpportunityDetailSchema = z.object({
	/** The posting's text as read when it was found; empty for a role saved from a search snippet alone. */
	description: z.string(),
	/** The discovery run that first found it, or null when that run is unknown or gone. */
	run: z
		.object({
			id: z.string(),
			at: z.date(),
			trigger: z.enum(["schedule", "manual"]),
			outcome: z.enum(["success", "partial", "failed"]),
		})
		.nullable(),
});

export const careerAutomationSchema = z.object({
	resumesEnabled: z.boolean(),
	lettersEnabled: z.boolean(),
	resumePrompt: z.string(),
	coverLetterPrompt: z.string(),
	baselineResumeId: z.string().nullable(),
	aiProviderId: z.string().nullable(),
	dailyLimit: z.number(),
	usage: z.object({ used: z.number(), limit: z.number(), resetsAt: z.date() }),
	/** The discovery schedule in use, which Career → Schedules edits. */
	discovery: z
		.object({
			scheduleId: z.string(),
			enabled: z.boolean(),
			query: z.string(),
			intervalDays: z.number().nullable(),
			intervalMinutes: careerIntervalMinutesSchema.nullable(),
		})
		.nullable(),
});

export const careerPreparationStepSchema = z.object({
	id: z.string(),
	kind: preparationKindSchema,
	status: preparationStatusSchema,
	error: preparationErrorSchema.nullable(),
	issues: z.array(z.string()),
	manual: z.boolean(),
	generation: z.number(),
	/** What the last regenerate asked this document to focus on, if anything. */
	focus: z.string().nullable(),
	outputId: z.string().nullable(),
	/** The document's History version holding the generation the last regenerate wrote over, if there was one. */
	replacedVersionId: z.string().nullable(),
	eligibleAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	/** The resume this document started from, or null when that was not recorded (older documents). */
	baseline: z.object({ resumeId: z.string(), name: z.string().nullable() }).nullable(),
	stale: z.boolean(),
	edited: z.boolean(),
});

export const careerDocumentOriginSchema = z.object({
	documentId: z.string(),
	kind: preparationKindSchema,
	applicationId: z.string().nullable(),
	/** Where the job's documents stand: the same summary as the application's Documents tab. */
	summary: z.enum(["skipped", "attention", "generating", "deferred", "queued", "ready"]),
	/** The resume it was made from, or null when that was not recorded. */
	baseline: z.object({ resumeId: z.string(), name: z.string().nullable() }).nullable(),
	/** The baseline or the posting changed after it was made. */
	stale: z.boolean(),
	/** It was edited after it was made. */
	edited: z.boolean(),
	madeAt: z.date().nullable(),
});

export const careerPreparationJobSchema = z.object({
	opportunityId: z.string(),
	applicationId: z.string().nullable(),
	company: z.string(),
	role: z.string(),
	steps: z.array(careerPreparationStepSchema),
	summary: z.enum(["skipped", "attention", "generating", "deferred", "queued", "ready"]),
});

const careerRunDocumentSchema = z
	.object({ stepId: z.string(), status: preparationStatusSchema, outputId: z.string().nullable() })
	.nullable();

export const careerRunJobSchema = z.object({
	opportunityId: z.string(),
	role: z.string(),
	company: z.string(),
	url: z.string(),
	applicationId: z.string().nullable(),
	resume: careerRunDocumentSchema,
	letter: careerRunDocumentSchema,
	summary: z.enum(["skipped", "attention", "generating", "deferred", "queued", "ready"]),
});

export const careerRunListSchema = z.object({
	total: z.number(),
	items: z.array(
		z.object({
			id: z.string(),
			createdAt: z.date(),
			report: careerRunReportSchema,
			jobs: z.array(careerRunJobSchema),
		}),
	),
});

export const careerOverviewSchema = z.object({
	windowDays: z.number(),
	needsYou: z.object({
		readyDocuments: z.number(),
		attentionDocuments: z.number(),
		upcomingInterviews: z.number(),
		unreadReminders: z.number(),
		newRoles: z.number(),
		savedJobs: z.number(),
		discoveryFailing: z.boolean(),
	}),
	stages: z.array(
		z.object({
			key: z.enum(["schedule", "search", "read", "filter", "save", "prepare", "review", "apply"]),
			state: z.enum(["ok", "running", "waiting", "warn", "failed", "off", "idle", "yours"]),
			code: z.string(),
			count: z.number().nullable(),
			at: z.date().nullable(),
		}),
	),
	checks: z.array(
		z.object({
			key: z.enum(["schedule", "next-run", "search", "ai", "baseline", "limit", "last-run", "repeating"]),
			status: z.enum(["ok", "warn", "fail", "info"]),
			at: z.date().nullable(),
			value: z.number().nullable(),
		}),
	),
	discovery: z.object({
		scheduleId: z.string().nullable(),
		enabled: z.boolean(),
		lastAttemptedAt: z.date().nullable(),
		lastSucceededAt: z.date().nullable(),
		nextRunAt: z.date().nullable(),
		failing: z.boolean(),
		latestRunId: z.string().nullable(),
		repeating: z.boolean(),
		totals: z.object({
			runs: z.number(),
			failed: z.number(),
			found: z.number(),
			matches: z.number(),
			duplicates: z.number(),
			rejected: z.number(),
			readFailures: z.number(),
		}),
		runs: z.array(
			z.object({
				at: z.date(),
				outcome: z.enum(["success", "partial", "failed"]),
				found: z.number(),
				matches: z.number(),
				duplicates: z.number(),
				rejected: z.number(),
				readFailures: z.number(),
			}),
		),
	}),
	automation: z.object({
		resumesEnabled: z.boolean(),
		lettersEnabled: z.boolean(),
		used: z.number(),
		limit: z.number(),
		resetsAt: z.date(),
		generating: z.number(),
		deferred: z.number(),
		stale: z.number(),
	}),
	interviews: z.array(
		z.object({
			applicationId: z.string(),
			company: z.string(),
			role: z.string(),
			at: z.date(),
			kind: z.string(),
		}),
	),
	actions: z.object({
		counts: z.object({ ready: z.number(), followUps: z.number(), issues: z.number() }),
		items: z.array(
			z.object({
				kind: z.enum(["issue", "followup", "stale", "ready"]),
				applicationId: z.string(),
				company: z.string(),
				role: z.string(),
				location: z.string(),
				code: z.enum(["failed", "overdue", "due", "stale", "ready"]),
				done: z.array(z.enum(["resume", "letter"])),
				failed: z.array(z.enum(["resume", "letter"])),
				appliedDaysAgo: z.number().nullable(),
				followUpInDays: z.number().nullable(),
			}),
		),
	}),
	nextInterview: z
		.object({
			applicationId: z.string(),
			interviewId: z.string().nullable(),
			company: z.string(),
			role: z.string(),
			at: z.date(),
			kind: z.string(),
			durationMinutes: z.number(),
			timezone: z.string(),
			briefing: z.boolean(),
			practice: z.boolean(),
		})
		.nullable(),
	outcomes: z.object({ submitted: z.number(), firstResponses: z.number(), interviews: z.number(), offers: z.number() }),
	latestDiscovery: z
		.object({
			at: z.date(),
			outcome: z.enum(["success", "partial", "failed"]),
			found: z.number(),
			matches: z.number(),
			readFailures: z.number(),
			job: z.object({ role: z.string(), company: z.string(), location: z.string() }).nullable(),
		})
		.nullable(),
});

export const careerSetupStateSchema = z.object({
	step: z.enum(["baseline", "services", "discovery", "done"]),
	skipped: z.boolean(),
	completed: z.boolean(),
	needsSetup: z.boolean(),
	baseline: z
		.object({
			resumeId: z.string(),
			name: z.string(),
			confirmed: z.boolean(),
			changedSinceConfirm: z.boolean(),
			suggestedQuery: z.string(),
		})
		.nullable(),
	services: z.object({ search: z.boolean(), ai: z.boolean() }),
	discovery: z.object({ scheduleId: z.string(), enabled: z.boolean(), query: z.string() }).nullable(),
});

export const careerBaselineReportSchema = z.object({
	resumeId: z.string(),
	name: z.string(),
	checks: z.array(
		z.object({
			key: z.enum([
				"name",
				"email",
				"headline",
				"summary",
				"experience",
				"experience-dates",
				"experience-detail",
				"education",
				"skills",
			]),
			ok: z.boolean(),
			count: z.number(),
			section: z.enum(["basics", "summary", "experience", "education", "skills"]),
		}),
	),
	ats: z.object({
		score: z.number(),
		counts: z.object({ error: z.number(), warning: z.number(), info: z.number() }),
		findings: z.array(
			z.object({ code: z.string(), severity: z.enum(["error", "warning", "info"]), pointer: z.string() }),
		),
	}),
	suggestedQuery: z.string(),
});

export const careerSearchPreviewSchema = z.array(
	z.object({ title: z.string(), url: z.string(), description: z.string() }),
);

export const careerEventSchema = z.object({
	id: z.string(),
	at: z.date(),
	kind: careerEventKindSchema,
	level: careerEventLevelSchema,
	runId: z.string().nullable(),
	opportunityId: z.string().nullable(),
	/** The application of that job, once it has one, so an event can link to it. */
	applicationId: z.string().nullable(),
	data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const careerActivityListSchema = z.object({ total: z.number(), items: z.array(careerEventSchema) });

export const careerRunDetailSchema = z.object({
	id: z.string(),
	createdAt: z.date(),
	report: careerRunReportSchema,
	items: z.array(
		z.object({
			url: z.string(),
			host: z.string(),
			title: z.string(),
			decision: runItemDecisionSchema,
			/** "web", a job source, or a followed board ("greenhouse:acme"); null for runs before sources existed. */
			source: z.string().nullable(),
			/** The role this result is, when it is one; null for results that were not roles. */
			opportunityId: z.string().nullable(),
			/** Its application, when it has been tracked or automation created one. */
			applicationId: z.string().nullable(),
		}),
	),
});

export const careerJourneySchema = z.object({
	opportunityId: z.string(),
	role: z.string(),
	company: z.string(),
	url: z.string(),
	applicationId: z.string().nullable(),
	foundAt: z.date(),
	/** "web" or a job source; `board` is the followed company board it came from. */
	source: z.string(),
	board: z.string().nullable(),
	/** Web roles only: the search connection that found it, and what read its page ("builtin" or the connection). */
	searchedVia: z.string().nullable(),
	readVia: z.string().nullable(),
	run: z.object({ id: z.string(), at: z.date(), query: z.string() }).nullable(),
	events: z.array(careerEventSchema),
});
