import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import * as tables from "@reactive-resume/db/schema";
import {
	careerIntervalMinutesSchema,
	careerNoticeSchema,
	careerRunReportSchema,
	careerSourceSchema,
	careerStoryInputSchema,
	preparationErrorSchema,
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

export const careerAutomationSchema = z.object({
	resumesEnabled: z.boolean(),
	lettersEnabled: z.boolean(),
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
	outputId: z.string().nullable(),
	eligibleAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	stale: z.boolean(),
	edited: z.boolean(),
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
		discoveryFailing: z.boolean(),
	}),
	funnel: z.array(
		z.object({
			key: z.enum(["discovered", "saved", "documents", "applied", "screening", "interview", "offer"]),
			count: z.number(),
		}),
	),
	discovery: z.object({
		scheduleId: z.string().nullable(),
		enabled: z.boolean(),
		lastAttemptedAt: z.date().nullable(),
		lastSucceededAt: z.date().nullable(),
		nextRunAt: z.date().nullable(),
		failing: z.boolean(),
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
});
