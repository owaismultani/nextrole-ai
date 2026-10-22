import type {
	CareerNotice,
	CareerProfileData,
	CareerRunReport,
	CareerSource,
	CareerStoryData,
	CareerWorkspace,
	SavedItemData,
} from "@reactive-resume/schema/career";
import * as pg from "drizzle-orm/pg-core";
import { generateId } from "@reactive-resume/utils/string";
import { aiProvider } from "./agent";
import { application } from "./applications";
import { user } from "./auth";
import { resume } from "./resume";

const owned = () => ({
	id: pg
		.text("id")
		.primaryKey()
		.$defaultFn(() => generateId()),
	userId: pg
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
const applicationId = () => pg.text("application_id").references(() => application.id, { onDelete: "cascade" });

export const careerProfile = pg.pgTable("career_profile", {
	userId: pg
		.text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	data: pg.jsonb("data").notNull().$type<CareerProfileData>(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
export const careerFact = pg.pgTable(
	"career_fact",
	{
		...owned(),
		applicationId: applicationId(),
		text: pg.text("text").notNull(),
		category: pg.text("category").notNull(),
		source: pg.jsonb("source").notNull().$type<CareerSource>(),
		sourceKey: pg.text("source_key").notNull(),
		status: pg.text("status").notNull().default("active"),
		revisions: pg.jsonb("revisions").notNull().$type<Array<{ text: string; at: string }>>().default([]),
	},
	(t) => [pg.index().on(t.userId, t.applicationId, t.status), pg.uniqueIndex().on(t.userId, t.sourceKey)],
);
export const careerStory = pg.pgTable(
	"career_story",
	{
		...owned(),
		applicationId: applicationId(),
		data: pg.jsonb("data").notNull().$type<CareerStoryData>(),
	},
	(t) => [pg.index().on(t.userId, t.applicationId)],
);
export const careerArtifact = pg.pgTable(
	"career_artifact",
	{
		...owned(),
		applicationId: applicationId(),
		interviewId: pg.text("interview_id"),
		title: pg.text("title").notNull(),
		data: pg.jsonb("data").notNull().$type<SavedItemData>(),
		/** What the coach read to write it: switched-on facts and stories. */
		evidence: pg.jsonb("evidence").notNull().$type<{ factIds: string[]; storyIds: string[] }>(),
		jobId: pg.text("job_id").references(() => careerJob.id, { onDelete: "set null" }),
		inputVersion: pg.text("input_version").notNull(),
	},
	(t) => [pg.index().on(t.userId, t.applicationId, t.createdAt), pg.uniqueIndex().on(t.jobId)],
);
export const careerSchedule = pg.pgTable(
	"career_schedule",
	{
		...owned(),
		applicationId: applicationId(),
		interviewId: pg.text("interview_id"),
		kind: pg.text("kind").notNull(),
		query: pg.text("query").notNull().default(""),
		/** Prepare only: 24h, 2h or morning (08:00 on the interview day). */
		lead: pg.text("lead"),
		/** The interface language when it was saved, so a scheduled briefing is written in it. */
		locale: pg.text("locale").notNull().default("en-US"),
		timezone: pg.text("timezone").notNull().default("UTC"),
		enabled: pg.boolean("enabled").notNull().default(false),
		email: pg.boolean("email").notNull().default(false),
		nextRunAt: pg.timestamp("next_run_at", { withTimezone: true }).notNull(),
		lastQueuedAt: pg.timestamp("last_queued_at", { withTimezone: true }),
		intervalDays: pg.integer("interval_days"),
		/** Hourly-style discovery: a fixed gap in minutes. Mutually exclusive with `intervalDays`, which keeps wall time. */
		intervalMinutes: pg.integer("interval_minutes").$type<60 | 180 | 360>(),
		lastAttemptedAt: pg.timestamp("last_attempted_at", { withTimezone: true }),
		lastSucceededAt: pg.timestamp("last_succeeded_at", { withTimezone: true }),
		/** Discovery only: what the latest run did. */
		lastRun: pg.jsonb("last_run").$type<CareerRunReport>(),
		/** Discovery only: results one run may retrieve from the search provider; null uses the default. */
		retrievalBudget: pg.integer("retrieval_budget"),
		aiProviderId: pg.text("ai_provider_id").references(() => aiProvider.id, { onDelete: "set null" }),
	},
	(t) => [pg.index().on(t.enabled, t.nextRunAt)],
);
/** One discovery attempt and what it found, kept so runs can be reviewed and traced to the jobs and documents they led to. */
export const careerRun = pg.pgTable(
	"career_run",
	{
		...owned(),
		scheduleId: pg
			.text("schedule_id")
			.notNull()
			.references(() => careerSchedule.id, { onDelete: "cascade" }),
		report: pg.jsonb("report").notNull().$type<CareerRunReport>(),
	},
	(t) => [pg.index().on(t.userId, t.createdAt.desc(), t.id.desc()), pg.index().on(t.scheduleId, t.createdAt.desc())],
);
export const careerJob = pg.pgTable(
	"career_job",
	{
		...owned(),
		scheduleId: pg
			.text("schedule_id")
			.notNull()
			.references(() => careerSchedule.id, { onDelete: "cascade" }),
		dueAt: pg.timestamp("due_at", { withTimezone: true }).notNull(),
		status: pg.text("status").notNull().default("queued"),
		attempts: pg.integer("attempts").notNull().default(0),
		lease: pg.text("lease"),
		leaseUntil: pg.timestamp("lease_until", { withTimezone: true }),
		error: pg.text("error"),
		/** `manual` jobs (Run now) also run for a paused schedule. */
		trigger: pg.text("trigger").notNull().default("schedule"),
	},
	(t) => [pg.uniqueIndex().on(t.scheduleId, t.dueAt), pg.index().on(t.status, t.leaseUntil)],
);
export const careerNotification = pg.pgTable(
	"career_notification",
	{
		...owned(),
		applicationId: applicationId(),
		key: pg.text("key").notNull(),
		/** What happened; its words are written when it's read. */
		notice: pg.jsonb("notice").notNull().$type<CareerNotice>(),
		url: pg.text("url"),
		readAt: pg.timestamp("read_at", { withTimezone: true }),
		emailedAt: pg.timestamp("emailed_at", { withTimezone: true }),
		emailAttemptedAt: pg.timestamp("email_attempted_at", { withTimezone: true }),
	},
	(t) => [pg.uniqueIndex().on(t.userId, t.key), pg.index().on(t.userId, t.createdAt)],
);

export const careerOpportunity = pg.pgTable(
	"career_opportunity",
	{
		...owned(),
		url: pg.text("url").notNull(),
		/** Read from the posting page (its JobPosting data when it has some, else its title). */
		role: pg.text("role").notNull().default(""),
		company: pg.text("company").notNull().default(""),
		location: pg.text("location").notNull().default(""),
		snippet: pg.text("snippet").notNull(),
		/** The posting's text, saved with the application when it's tracked. */
		description: pg.text("description").notNull().default(""),
		firstSeenAt: pg.timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: pg.timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
		dismissedAt: pg.timestamp("dismissed_at", { withTimezone: true }),
		/** The discovery run that first found this role. */
		runId: pg.text("run_id").references(() => careerRun.id, { onDelete: "set null" }),
		/** Set when tracked in Applications; a tracked role never returns in later runs. */
		trackedApplicationId: pg.text("tracked_application_id").references(() => application.id, { onDelete: "set null" }),
	},
	(t) => [pg.uniqueIndex().on(t.userId, t.url)],
);

/** One application's live workspace state: answers, checklist ticks, questions to ask. */
export const careerWorkspace = pg.pgTable("career_workspace", {
	applicationId: pg
		.text("application_id")
		.primaryKey()
		.references(() => application.id, { onDelete: "cascade" }),
	userId: pg
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	data: pg.jsonb("data").notNull().$type<CareerWorkspace>(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const careerTranscript = pg.pgTable(
	"career_transcript",
	{
		...owned(),
		applicationId: applicationId(),
		original: pg.text("original").notNull(),
		edited: pg.text("edited").notNull(),
		model: pg.text("model").notNull(),
	},
	(t) => [pg.index().on(t.userId, t.applicationId)],
);

/**
 * A user's document-preparation settings. Discovery itself is an ordinary `career_schedule`, edited in Career →
 * Schedules, so there is one source of truth for its query, cadence and on/off state; this row adds what to prepare
 * for the jobs it finds, and the limits.
 */
export const careerAutomation = pg.pgTable(
	"career_automation",
	{
		...owned(),
		resumesEnabled: pg.boolean("resumes_enabled").notNull().default(false),
		lettersEnabled: pg.boolean("letters_enabled").notNull().default(false),
		resumePrompt: pg
			.text("resume_prompt")
			.notNull()
			.default(
				"Prioritize the experience and skills that best match this role while keeping the resume truthful and concise.",
			),
		coverLetterPrompt: pg
			.text("cover_letter_prompt")
			.notNull()
			.default(
				"Write a clear, specific letter that connects my strongest relevant experience to this role without overstating my background.",
			),
		baselineResumeId: pg.text("baseline_resume_id").references(() => resume.id, { onDelete: "set null" }),
		aiProviderId: pg.text("ai_provider_id").references(() => aiProvider.id, { onDelete: "set null" }),
		/** Documents generated per day, counted per document on its first attempt; retries are free. */
		dailyLimit: pg.integer("daily_limit").notNull().default(10),
		/** The local day (in the user's timezone) `usage_count` belongs to. */
		usageDay: pg.text("usage_day"),
		usageCount: pg.integer("usage_count").notNull().default(0),
	},
	(t) => [pg.uniqueIndex().on(t.userId)],
);

/**
 * One document to prepare for one discovered job: a row per requested kind, so what was asked for, what finished and
 * what was canceled is explicit. Outputs are ordinary resumes and cover letters linked to the application.
 */
export const careerPreparation = pg.pgTable(
	"career_preparation",
	{
		...owned(),
		opportunityId: pg
			.text("opportunity_id")
			.notNull()
			.references(() => careerOpportunity.id, { onDelete: "cascade" }),
		applicationId: applicationId(),
		kind: pg.text("kind").notNull(),
		/** True when a person asked for this document: it then runs even if the automatic toggle is off. */
		manual: pg.boolean("manual").notNull().default(false),
		status: pg.text("status").notNull().default("queued"),
		/** Bumped by an explicit regenerate; each generation writes a new document and never overwrites an edited one. */
		generation: pg.integer("generation").notNull().default(1),
		attempts: pg.integer("attempts").notNull().default(0),
		nextAttemptAt: pg.timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
		lease: pg.text("lease"),
		leaseUntil: pg.timestamp("lease_until", { withTimezone: true }),
		/** True once this generation has taken a slot from the daily limit, so retries do not take another. */
		counted: pg.boolean("counted").notNull().default(false),
		error: pg.text("error"),
		/** Things to check before using the document (information the posting or resume did not provide). */
		issues: pg.jsonb("issues").notNull().$type<string[]>().default([]),
		/** The resume or cover letter produced; chosen before it is created so a retry reuses it. */
		outputId: pg.text("output_id"),
		baselineResumeId: pg.text("baseline_resume_id"),
		/** The baseline's `updated_at` when it was read, to tell later when the document may be out of date. */
		baselineVersion: pg.text("baseline_version"),
		jobHash: pg.text("job_hash"),
		startedAt: pg.timestamp("started_at", { withTimezone: true }),
		completedAt: pg.timestamp("completed_at", { withTimezone: true }),
	},
	(t) => [
		pg.uniqueIndex().on(t.userId, t.opportunityId, t.kind),
		pg.index().on(t.status, t.nextAttemptAt),
		pg.index().on(t.userId, t.status),
	],
);

/** Where a person is in first-run setup. Skipping or finishing it is remembered so the guide is not shown again. */
export const careerSetup = pg.pgTable("career_setup", {
	userId: pg
		.text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	/** The resume the person confirmed as their baseline, and its `updated_at` when they did. */
	baselineResumeId: pg.text("baseline_resume_id").references(() => resume.id, { onDelete: "set null" }),
	baselineConfirmedAt: pg.timestamp("baseline_confirmed_at", { withTimezone: true }),
	baselineVersion: pg.text("baseline_version"),
	skippedAt: pg.timestamp("skipped_at", { withTimezone: true }),
	completedAt: pg.timestamp("completed_at", { withTimezone: true }),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
