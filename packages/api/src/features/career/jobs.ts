import type { SearchOptions } from "../web-access/contracts";
import type { CareerRunReport, careerScheduleInputSchema, RunItemDecision } from "@reactive-resume/schema/career";
import type z from "zod";
import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { sendCareerNotification } from "@reactive-resume/email/transport";
import { env } from "@reactive-resume/env/server";
import { generateId } from "@reactive-resume/utils/string";
import { STALE_AGENT_RUN_TTL_MS } from "../agent/runs";
import { aiProvidersService } from "../ai-providers/service";
import { jobSearchQuery, readOpenPosting, searchJobPostings } from "../applications/posting";
import { webAccessService } from "../web-access/credentials";
import { enqueueAutomatedPreparation, retrievalFor } from "./automation";
import { purgeOldActivity, recordEvent, recordEventIn } from "./events";
import { generateCareer } from "./generate";
import { matchPosting } from "./matching";
import { noticeText } from "./notices";
import { runPreparations } from "./prepare";
import { isCareerSchedulingEnabled } from "./runner";
import { advanceRun, canonicalOpportunityUrl, parseListingTitle, plainSnippet, prepareRunAt } from "./scheduling";
import { careerService, requireCareerApplication } from "./service";

const DISCOVER_URL = "/dashboard/discover";
const AUTOMATION_URL = "/dashboard/automation";
const OVERVIEW_URL = "/dashboard/overview";
const workspaceUrl = (applicationId: string | null, tab?: string) =>
	applicationId ? `/dashboard/applications/${encodeURIComponent(applicationId)}${tab ? `/${tab}` : ""}` : DISCOVER_URL;

function assertRunner() {
	if (!isCareerSchedulingEnabled())
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Configure CRON_SECRET on Vercel before enabling schedules.",
		});
}

export const careerJobs = {
	list: async (userId: string) => {
		const [schedules, active] = await Promise.all([
			db
				.select()
				.from(tables.careerSchedule)
				.where(eq(tables.careerSchedule.userId, userId))
				.orderBy(desc(tables.careerSchedule.createdAt)),
			db
				.select({ scheduleId: tables.careerJob.scheduleId, status: tables.careerJob.status })
				.from(tables.careerJob)
				.where(and(eq(tables.careerJob.userId, userId), inArray(tables.careerJob.status, ["queued", "running"]))),
		]);
		// A running job outranks a queued one for the same schedule.
		const states = new Map<string, "queued" | "running">();
		for (const { scheduleId, status } of active)
			if (status === "running" || !states.has(scheduleId)) states.set(scheduleId, status as "queued" | "running");
		return schedules.map((schedule) => ({ ...schedule, activeRun: states.get(schedule.id) ?? null }));
	},
	save: async (userId: string, input: z.infer<typeof careerScheduleInputSchema> & { id?: string | undefined }) => {
		if (input.enabled) assertRunner();
		const application = await requireCareerApplication({ userId, ...input });
		// A briefing's run time follows its interview, so rescheduling the interview and saving again moves it.
		const interview = application?.activity.find(
			(entry) => entry.type === "interview" && entry.id === input.interviewId,
		);
		if (input.kind === "prepare" && interview?.type === "interview")
			input.nextRunAt = prepareRunAt(new Date(interview.at), input.lead ?? "24h", input.timezone);
		if (input.kind === "discovery" && !input.query)
			throw new ORPCError("BAD_REQUEST", { message: "Supply a public job-search query." });
		if (input.kind === "discovery" && input.enabled && !(await webAccessService.resolve(userId)))
			throw new ORPCError("PRECONDITION_FAILED", {
				message: "Set up a web search connection in Settings → AI & developer first.",
				data: { missing: "search" },
			});
		if (input.retrievalBudget && input.kind !== "discovery")
			throw new ORPCError("BAD_REQUEST", { message: "Only discovery schedules have a results budget." });
		if (input.intervalMinutes && (input.kind !== "discovery" || input.intervalDays))
			throw new ORPCError("BAD_REQUEST", { message: "Choose either hours or days between discovery runs." });
		if (input.kind !== "discovery" && !input.applicationId)
			throw new ORPCError("BAD_REQUEST", { message: "Choose an application." });
		if (input.kind === "prepare" && !input.interviewId)
			throw new ORPCError("BAD_REQUEST", { message: "Choose an interview round." });
		if (input.kind === "prepare" && input.enabled) {
			if (!input.aiProviderId)
				throw new ORPCError("BAD_REQUEST", { message: "Choose a tested AI connection for scheduled preparation." });
			await aiProvidersService.getRunnableById({ userId, id: input.aiProviderId });
		}
		if (input.email) {
			const [owner] = await db
				.select({ verified: tables.user.emailVerified })
				.from(tables.user)
				.where(eq(tables.user.id, userId));
			if (!owner?.verified || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM)
				throw new ORPCError("PRECONDITION_FAILED", {
					message: "Owner email reminders require a verified account email and configured SMTP.",
				});
		}
		const { id, ...values } = input;
		let keepQueuedAt: Date | null = null;
		let previous: typeof tables.careerSchedule.$inferSelect | undefined;
		return db.transaction(async (tx) => {
			if (id) {
				const [owned] = await tx
					.select()
					.from(tables.careerSchedule)
					.where(and(eq(tables.careerSchedule.id, id), eq(tables.careerSchedule.userId, userId)))
					.for("update");
				if (!owned) throw new ORPCError("NOT_FOUND");
				const ran = owned.lastQueuedAt && input.nextRunAt <= owned.lastQueuedAt ? owned.lastQueuedAt : null;
				// A briefing's time comes from its interview: one that already ran for that time stays done when switched
				// back on. Other schedules need a new time.
				if (input.kind === "prepare") keepQueuedAt = ran;
				else if (input.enabled && ran && !input.intervalDays && !input.intervalMinutes)
					throw new ORPCError("BAD_REQUEST", {
						message: "Choose a new run time when rescheduling completed or canceled work.",
					});
				await tx
					.update(tables.careerJob)
					.set({ status: "canceled", lease: null, leaseUntil: null })
					.where(and(eq(tables.careerJob.scheduleId, id), sql`${tables.careerJob.status} in ('queued', 'running')`));
				previous = owned;
			}
			// Discovery on a fixed gap starts at once when it is switched on or its gap changes, not after a first
			// interval; the form has no first-run time for it.
			if (
				input.kind === "discovery" &&
				input.intervalMinutes &&
				input.enabled &&
				(!previous || !previous.enabled || previous.intervalMinutes !== input.intervalMinutes)
			)
				values.nextRunAt = new Date();
			const [row] = id
				? await tx
						.update(tables.careerSchedule)
						.set({ ...values, lastQueuedAt: keepQueuedAt })
						.where(and(eq(tables.careerSchedule.id, id), eq(tables.careerSchedule.userId, userId)))
						.returning()
				: await tx
						.insert(tables.careerSchedule)
						.values({ userId, ...values })
						.returning();
			if (!row) throw new ORPCError("NOT_FOUND");
			return row;
		});
	},
	delete: async (userId: string, id: string) => {
		await db
			.delete(tables.careerSchedule)
			.where(and(eq(tables.careerSchedule.id, id), eq(tables.careerSchedule.userId, userId)));
	},
	/** Queues a discovery run to start on the next scheduler tick (within a minute), leaving the schedule as it is. */
	runNow: async (userId: string, id: string) => {
		assertRunner();
		return await db.transaction(async (tx) => {
			const [schedule] = await tx
				.select()
				.from(tables.careerSchedule)
				.where(and(eq(tables.careerSchedule.id, id), eq(tables.careerSchedule.userId, userId)))
				.for("update");
			if (!schedule) throw new ORPCError("NOT_FOUND");
			if (schedule.kind !== "discovery")
				throw new ORPCError("BAD_REQUEST", { message: "Only discovery schedules can be run on demand." });
			const [active] = await tx
				.select({ id: tables.careerJob.id })
				.from(tables.careerJob)
				.where(and(eq(tables.careerJob.scheduleId, id), inArray(tables.careerJob.status, ["queued", "running"])))
				.limit(1);
			if (active) return { queued: false };
			await tx
				.insert(tables.careerJob)
				.values({ userId, scheduleId: id, dueAt: new Date(), trigger: "manual" })
				.onConflictDoNothing();
			return { queued: true };
		});
	},
	/** Pause or resume a discovery schedule. Resuming picks the next future slot on its own cadence. */
	setEnabled: async (userId: string, id: string, enabled: boolean) => {
		if (enabled) assertRunner();
		return await db.transaction(async (tx) => {
			const [schedule] = await tx
				.select()
				.from(tables.careerSchedule)
				.where(and(eq(tables.careerSchedule.id, id), eq(tables.careerSchedule.userId, userId)))
				.for("update");
			if (!schedule) throw new ORPCError("NOT_FOUND");
			if (schedule.kind !== "discovery")
				throw new ORPCError("BAD_REQUEST", { message: "Only discovery schedules can be paused here." });
			const repeating = Boolean(schedule.intervalDays || schedule.intervalMinutes);
			if (enabled && !repeating && schedule.lastQueuedAt && schedule.nextRunAt <= schedule.lastQueuedAt)
				throw new ORPCError("BAD_REQUEST", {
					message: "Choose a new run time when rescheduling completed or canceled work.",
				});
			if (!enabled)
				await tx
					.update(tables.careerJob)
					.set({ status: "canceled", lease: null, leaseUntil: null })
					.where(and(eq(tables.careerJob.scheduleId, id), inArray(tables.careerJob.status, ["queued", "running"])));
			// A schedule on a fixed gap resumes with one prompt run, never the missed ones. A daily or longer one keeps its
			// local time, so it waits for its next slot.
			const nextRunAt =
				enabled && repeating && schedule.nextRunAt <= new Date()
					? schedule.intervalMinutes
						? new Date()
						: advanceRun(schedule.nextRunAt, schedule)
					: schedule.nextRunAt;
			if (schedule.enabled !== enabled)
				await recordEventIn(tx, { userId, kind: "setting.changed", data: { what: "discovery", on: enabled } });
			const [row] = await tx
				.update(tables.careerSchedule)
				.set({ enabled, nextRunAt })
				.where(eq(tables.careerSchedule.id, id))
				.returning();
			if (!row) throw new ORPCError("NOT_FOUND");
			return row;
		});
	},
	notifications: async (userId: string) => {
		const rows = await db
			.select()
			.from(tables.careerNotification)
			.where(eq(tables.careerNotification.userId, userId))
			.orderBy(desc(tables.careerNotification.createdAt));
		return rows.map((row) => ({ ...row, ...noticeText(row.notice) }));
	},
	markRead: async (userId: string, id: string) => {
		await db
			.update(tables.careerNotification)
			.set({ readAt: new Date() })
			.where(and(eq(tables.careerNotification.id, id), eq(tables.careerNotification.userId, userId)));
	},
	/**
	 * Each role with the preferences its posting matches and what it leaves out; the posting text stays here. Dismissed
	 * roles are listed only on request, so a person can find them again and restore one.
	 */
	opportunities: async (userId: string, dismissed = false) => {
		const [rows, profile] = await Promise.all([
			db
				.select()
				.from(tables.careerOpportunity)
				.where(
					and(
						eq(tables.careerOpportunity.userId, userId),
						dismissed ? isNotNull(tables.careerOpportunity.dismissedAt) : isNull(tables.careerOpportunity.dismissedAt),
					),
				)
				.orderBy(desc(tables.careerOpportunity.lastSeenAt)),
			careerService.profile(userId),
		]);
		return rows.map(({ description, ...row }) => ({ ...row, ...matchPosting({ ...row, description }, profile) }));
	},
	/** One role with its posting text and the discovery run that first found it (null when the run is gone or unknown). */
	opportunity: async (userId: string, id: string) => {
		const [row] = await db
			.select()
			.from(tables.careerOpportunity)
			.where(and(eq(tables.careerOpportunity.id, id), eq(tables.careerOpportunity.userId, userId)));
		if (!row) throw new ORPCError("NOT_FOUND");
		const [run] = row.runId
			? await db
					.select({ id: tables.careerRun.id, at: tables.careerRun.createdAt, report: tables.careerRun.report })
					.from(tables.careerRun)
					.where(and(eq(tables.careerRun.id, row.runId), eq(tables.careerRun.userId, userId)))
			: [];
		return {
			description: row.description,
			run: run ? { id: run.id, at: run.at, trigger: run.report.trigger, outcome: run.report.outcome } : null,
		};
	},
	restoreOpportunity: async (userId: string, id: string) => {
		await db
			.update(tables.careerOpportunity)
			.set({ dismissedAt: null })
			.where(and(eq(tables.careerOpportunity.id, id), eq(tables.careerOpportunity.userId, userId)));
	},
	dismissOpportunity: async (userId: string, id: string) => {
		await db
			.update(tables.careerOpportunity)
			.set({ dismissedAt: new Date() })
			.where(and(eq(tables.careerOpportunity.id, id), eq(tables.careerOpportunity.userId, userId)));
	},
};

type Posting = Awaited<ReturnType<typeof readOpenPosting>>;

type Trigger = CareerRunReport["trigger"];

/** A discovery search that never produced results; carries what was attempted so the schedule can show it. */
class DiscoveryFailure extends Error {
	readonly report: CareerRunReport;
	constructor(report: CareerRunReport, cause: unknown) {
		super("Discovery search failed.", { cause });
		this.report = report;
	}
}

const emptyReport = (trigger: Trigger, at: Date, queries: string[], provider: string): CareerRunReport => ({
	outcome: "success",
	failure: null,
	trigger,
	at: at.toISOString(),
	queries,
	provider,
	sources: [],
	found: 0,
	duplicates: 0,
	rejected: 0,
	matches: 0,
	readFailures: 0,
});

const hostOf = (url: string) => {
	try {
		return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return null;
	}
};

/**
 * A discovery search's hits, each read once: by the built-in reader, then by the web connection (which renders
 * script-built pages). Only one open role's posting is kept as a role; anything else is remembered as not one, so it is
 * never read again. Untracked roles are rechecked weekly so saved descriptions do not remain stale forever.
 *
 * Also tallies what happened to every hit (see `careerRunReportSchema`); `matches` is filled in once roles are saved.
 */
async function discover(userId: string, query: string, trigger: Trigger, startedAt: Date, search?: SearchOptions) {
	const connection = await webAccessService.resolve(userId);
	const signal = AbortSignal.timeout(90_000);
	const queries = [jobSearchQuery(query)];
	const provider = connection?.provider ?? "builtin";
	const hits = await searchJobPostings(query, { userId, connection, signal }, search).catch((error: unknown) => {
		throw new DiscoveryFailure(
			{ ...emptyReport(trigger, startedAt, queries, provider), outcome: "failed", failure: "search" },
			error,
		);
	});
	const found = new Map<string, (typeof hits)[number]>();
	let invalid = 0;
	for (const hit of hits) {
		const url = canonicalOpportunityUrl(hit.url);
		if (!url) invalid++;
		else if (!found.has(url)) found.set(url, hit);
	}
	const known = found.size
		? await db
				.select({
					url: tables.careerOpportunity.url,
					updatedAt: tables.careerOpportunity.updatedAt,
					dismissedAt: tables.careerOpportunity.dismissedAt,
					trackedApplicationId: tables.careerOpportunity.trackedApplicationId,
				})
				.from(tables.careerOpportunity)
				.where(
					and(eq(tables.careerOpportunity.userId, userId), inArray(tables.careerOpportunity.url, [...found.keys()])),
				)
		: [];
	const seen = new Map(known.map((row) => [row.url, row]));
	const results = await Promise.all(
		[...found].map(async ([url, hit]) => {
			const prior = seen.get(url);
			if (
				prior &&
				(prior.dismissedAt || prior.trackedApplicationId || prior.updatedAt.getTime() > Date.now() - 7 * 86_400_000)
			)
				return { url, hit, posting: undefined, existing: true, read: "skipped" as const };
			// A failed read is undefined: skipped this run and tried again on the next, never taken for "not a posting".
			let failed = false;
			const read = (via: typeof connection) =>
				readOpenPosting(url, { userId, connection: via, signal }).catch((): Posting | undefined => {
					failed = true;
					return undefined;
				});
			const builtin = await read(null);
			const posting = builtin || !connection ? builtin : await read(connection);
			// The built-in reader failing is no failure when the connection then read the page.
			if (posting !== undefined) failed = false;
			return { url, hit, posting, existing: Boolean(prior), read: failed ? ("failed" as const) : ("read" as const) };
		}),
	);
	const readFailures = results.filter((result) => result.read === "failed").length;
	const sources = [...new Set(hits.map((hit) => hostOf(hit.url)).filter((host): host is string => Boolean(host)))];
	const report: CareerRunReport = {
		...emptyReport(trigger, startedAt, queries, provider),
		sources: sources.slice(0, 25),
		found: hits.length,
		duplicates:
			hits.length -
			invalid -
			found.size +
			results.filter((result) => result.existing && result.posting !== null && result.read !== "failed").length,
		rejected: invalid + results.filter((result) => result.posting === null).length,
		readFailures,
		// All unreadable: nothing was learned, so say that rather than report a quiet success.
		...(results.length > 0 && readFailures === results.length
			? { outcome: "failed" as const, failure: "extraction" as const }
			: readFailures > 0
				? { outcome: "partial" as const }
				: {}),
	};
	// What became of each result, for the run's detail view. First sighting of each address only, capped.
	const items: { url: string; host: string; title: string; decision: RunItemDecision }[] = [];
	const decide = (result: (typeof results)[number]): RunItemDecision =>
		result.read === "failed" ? "unreadable" : result.posting === null ? "rejected" : result.existing ? "known" : "new";
	for (const result of results)
		items.push({
			url: result.url.slice(0, 1000),
			host: hostOf(result.url) ?? "",
			title: result.hit.title.replace(/\s+/g, " ").trim().slice(0, 200),
			decision: decide(result),
		});
	for (const hit of hits)
		if (!canonicalOpportunityUrl(hit.url))
			items.push({ url: hit.url.slice(0, 1000), host: "", title: hit.title.slice(0, 200), decision: "invalid" });
	return { results, report, items: items.slice(0, 50) };
}

async function enqueue() {
	await db.transaction(async (tx) => {
		const due = await tx
			.select()
			.from(tables.careerSchedule)
			.where(
				and(
					eq(tables.careerSchedule.enabled, true),
					lte(tables.careerSchedule.nextRunAt, new Date()),
					or(
						isNull(tables.careerSchedule.lastQueuedAt),
						sql`${tables.careerSchedule.nextRunAt} > ${tables.careerSchedule.lastQueuedAt}`,
					),
				),
			)
			.orderBy(asc(tables.careerSchedule.nextRunAt))
			.limit(20)
			.for("update", { skipLocked: true });
		for (const schedule of due) {
			// A schedule switched back on for a time that already ran gets a fresh job; finished ones stay as history.
			await tx
				.delete(tables.careerJob)
				.where(
					and(
						eq(tables.careerJob.scheduleId, schedule.id),
						eq(tables.careerJob.dueAt, schedule.nextRunAt),
						sql`${tables.careerJob.status} in ('completed', 'canceled', 'failed')`,
					),
				);
			await tx
				.insert(tables.careerJob)
				.values({ userId: schedule.userId, scheduleId: schedule.id, dueAt: schedule.nextRunAt })
				.onConflictDoNothing();
			// Coalesce missed ticks into one job, rather than charging for an outage's backlog; day intervals keep wall time.
			const nextRunAt = advanceRun(schedule.nextRunAt, schedule);
			await tx
				.update(tables.careerSchedule)
				.set({ lastQueuedAt: schedule.nextRunAt, nextRunAt })
				.where(eq(tables.careerSchedule.id, schedule.id));
		}
	});
}

function claim() {
	return db.transaction(async (tx) => {
		const now = new Date();
		const [job] = await tx
			.select()
			.from(tables.careerJob)
			.where(
				and(
					lte(tables.careerJob.dueAt, now),
					sql`${tables.careerJob.attempts} < 3`,
					or(
						and(
							eq(tables.careerJob.status, "queued"),
							or(isNull(tables.careerJob.leaseUntil), lte(tables.careerJob.leaseUntil, now)),
						),
						and(eq(tables.careerJob.status, "running"), lte(tables.careerJob.leaseUntil, now)),
					),
				),
			)
			.orderBy(asc(tables.careerJob.dueAt))
			.limit(1)
			.for("update", { skipLocked: true });
		if (!job) return null;
		// Publication takes the user mutex before its job lock; never wait for that mutex in reverse order.
		const [owner] = await tx
			.select({ id: tables.user.id })
			.from(tables.user)
			.where(eq(tables.user.id, job.userId))
			.for("no key update", { skipLocked: true });
		if (!owner) return null;
		const [running] = await tx
			.select({ id: tables.careerJob.id })
			.from(tables.careerJob)
			.where(
				and(
					eq(tables.careerJob.userId, job.userId),
					eq(tables.careerJob.status, "running"),
					sql`${tables.careerJob.id} <> ${job.id}`,
					sql`${tables.careerJob.leaseUntil} > ${now}`,
				),
			)
			.limit(1);
		if (running) return null;
		const [claimed] = await tx
			.update(tables.careerJob)
			.set({
				status: "running",
				attempts: job.attempts + 1,
				lease: generateId(),
				leaseUntil: new Date(Date.now() + STALE_AGENT_RUN_TTL_MS + 60_000),
			})
			.where(eq(tables.careerJob.id, job.id))
			.returning();
		return claimed ?? null;
	});
}

async function execute(job: typeof tables.careerJob.$inferSelect) {
	const [schedule] = await db
		.select()
		.from(tables.careerSchedule)
		.where(and(eq(tables.careerSchedule.id, job.scheduleId), eq(tables.careerSchedule.userId, job.userId)));
	// A paused schedule only runs for an explicit Run now.
	if (!schedule || !job.lease || (!schedule.enabled && job.trigger !== "manual")) {
		await db
			.update(tables.careerJob)
			.set({ status: "canceled", lease: null, leaseUntil: null })
			.where(and(eq(tables.careerJob.id, job.id), eq(tables.careerJob.status, "running")));
		return;
	}
	const application = await requireCareerApplication({
		userId: job.userId,
		applicationId: schedule.applicationId,
		interviewId: schedule.interviewId,
	});
	const startedAt = new Date();
	await db
		.update(tables.careerSchedule)
		.set({ lastAttemptedAt: startedAt })
		.where(eq(tables.careerSchedule.id, schedule.id));
	const discovery =
		schedule.kind === "discovery"
			? await discover(
					job.userId,
					schedule.query,
					job.trigger === "manual" ? "manual" : "schedule",
					startedAt,
					retrievalFor(schedule),
				)
			: null;
	const results = discovery?.results ?? [];
	if (schedule.kind === "prepare") {
		if (!application || !schedule.interviewId) throw new Error("Preparation application unavailable.");
		const [saved] = await db
			.select({ id: tables.careerArtifact.id })
			.from(tables.careerArtifact)
			.where(eq(tables.careerArtifact.jobId, job.id));
		if (!saved)
			await generateCareer({
				userId: job.userId,
				applicationId: application.id,
				locale: schedule.locale,
				task: { task: "briefing", interviewId: schedule.interviewId },
				...(schedule.aiProviderId ? { providerId: schedule.aiProviderId } : {}),
				jobId: job.id,
				jobLease: job.lease,
				signal: AbortSignal.timeout(120_000),
			});
	}
	await db.transaction(async (tx) => {
		// Interview edits/deletion lock the application before touching its jobs.
		if (schedule.applicationId) {
			const [owned] = await tx
				.select({ id: tables.application.id })
				.from(tables.application)
				.where(and(eq(tables.application.id, schedule.applicationId), eq(tables.application.userId, job.userId)))
				.for("update");
			if (!owned) return;
		}
		const [current] = await tx
			.select()
			.from(tables.careerJob)
			.where(
				and(
					eq(tables.careerJob.id, job.id),
					eq(tables.careerJob.lease, job.lease ?? ""),
					eq(tables.careerJob.status, "running"),
				),
			)
			.for("update");
		if (!current || !current.leaseUntil || current.leaseUntil < new Date()) return;
		// Each discovery attempt is kept as a run, so its jobs and their documents can be traced back to it.
		const runId = generateId();
		if (discovery)
			await tx
				.insert(tables.careerRun)
				.values({ id: runId, userId: job.userId, scheduleId: schedule.id, report: discovery.report });
		if (discovery?.items.length)
			await tx
				.insert(tables.careerRunItem)
				.values(discovery.items.map((item) => ({ ...item, runId, userId: job.userId })));
		let changed = 0;
		const added: { id: string; role: string; company: string }[] = [];
		for (const { url, hit, posting, existing } of results) {
			// Seen before, or unreadable this run.
			if (posting === undefined) {
				await tx
					.update(tables.careerOpportunity)
					.set({ lastSeenAt: new Date(), updatedAt: sql`${tables.careerOpportunity.updatedAt}` })
					.where(and(eq(tables.careerOpportunity.userId, job.userId), eq(tables.careerOpportunity.url, url)));
				continue;
			}
			// Titles keep their separators ("Role - Company | Board") for parsing; only markup goes.
			const title = parseListingTitle(
				hit.title
					.replace(/[*_`#\\]+/g, "")
					.replace(/\s+/g, " ")
					.trim(),
			);
			const values = {
				userId: job.userId,
				url,
				role: (posting?.page?.role || title.role).slice(0, 200),
				company: (posting?.page?.company || posting?.company || title.company).slice(0, 200),
				location: (posting?.page?.location ?? "").slice(0, 200),
				snippet: plainSnippet(hit.description || posting?.text || ""),
				description: posting?.text ?? "",
				...(discovery ? { runId } : {}),
				// Not a posting: kept out of New roles, and never read again.
				...(posting ? {} : { dismissedAt: new Date() }),
			};
			const [inserted] = await tx
				.insert(tables.careerOpportunity)
				.values(values)
				.onConflictDoUpdate({
					target: [tables.careerOpportunity.userId, tables.careerOpportunity.url],
					set: {
						role: values.role,
						company: values.company,
						location: values.location,
						snippet: values.snippet,
						description: values.description,
						lastSeenAt: new Date(),
						...(posting ? {} : { dismissedAt: new Date() }),
					},
					setWhere: sql`${tables.careerOpportunity.dismissedAt} is null and ${tables.careerOpportunity.trackedApplicationId} is null`,
				})
				.returning();
			if (inserted && posting && !existing) {
				changed++;
				added.push({ id: inserted.id, role: values.role, company: values.company });
			}
		}
		// New roles all wait in one list, so the newest "new roles" notice replaces older unread ones.
		if (schedule.kind === "discovery" && changed)
			await tx
				.update(tables.careerNotification)
				.set({ readAt: new Date() })
				.where(
					and(
						eq(tables.careerNotification.userId, job.userId),
						sql`${tables.careerNotification.notice}->>'type' = 'opportunities'`,
						isNull(tables.careerNotification.readAt),
					),
				);
		if (schedule.kind !== "discovery" || changed)
			await tx
				.insert(tables.careerNotification)
				.values({
					userId: job.userId,
					applicationId: schedule.applicationId,
					key: job.id,
					notice:
						schedule.kind === "discovery"
							? { type: "opportunities", count: changed, query: schedule.query }
							: {
									type: schedule.kind === "prepare" ? "briefing" : "followup",
									company: application?.company ?? "",
									role: application?.role ?? "",
								},
					url: workspaceUrl(schedule.applicationId, schedule.kind === "prepare" ? "prepare" : undefined),
				})
				.onConflictDoNothing();
		// New roles become applications with their requested documents queued, in this same transaction; the documents
		// themselves are made later by the preparation worker, so discovery never waits for AI.
		const queuedKinds =
			schedule.kind === "discovery"
				? await enqueueAutomatedPreparation(
						tx,
						job.userId,
						added.map((item) => item.id),
					)
				: [];
		// A run that read nothing is not a success; partial ones still count, and say so in `lastRun`.
		const report = discovery && { ...discovery.report, matches: changed };
		if (report) await tx.update(tables.careerRun).set({ report }).where(eq(tables.careerRun.id, runId));
		if (report)
			await recordEventIn(tx, [
				{
					userId: job.userId,
					kind: "run.finished",
					level: report.outcome === "failed" ? "error" : report.outcome === "partial" ? "warn" : "info",
					runId,
					data: {
						outcome: report.outcome,
						failure: report.failure,
						trigger: report.trigger,
						found: report.found,
						matches: report.matches,
						duplicates: report.duplicates,
						rejected: report.rejected,
						readFailures: report.readFailures,
					},
				},
				...added.map((item) => ({
					userId: job.userId,
					kind: "job.saved" as const,
					runId,
					opportunityId: item.id,
					data: { role: item.role.slice(0, 120), company: item.company.slice(0, 120) },
				})),
				...added.flatMap((item) =>
					queuedKinds.map((kind) => ({
						userId: job.userId,
						kind: "prep.queued" as const,
						opportunityId: item.id,
						data: { kind, role: item.role.slice(0, 120), company: item.company.slice(0, 120) },
					})),
				),
			]);
		await tx
			.update(tables.careerSchedule)
			.set({
				...(report?.outcome === "failed" ? {} : { lastSucceededAt: new Date() }),
				...(report ? { lastRun: report } : {}),
			})
			.where(eq(tables.careerSchedule.id, schedule.id));
		await tx
			.update(tables.careerJob)
			.set({ status: "completed", lease: null, leaseUntil: null, error: null })
			.where(eq(tables.careerJob.id, job.id));
	});
}

/** Puts a failed discovery run on the schedule, so it shows there instead of only in server logs. */
async function recordFailure(job: typeof tables.careerJob.$inferSelect, error?: unknown) {
	try {
		const [schedule] = await db
			.select({ kind: tables.careerSchedule.kind, query: tables.careerSchedule.query })
			.from(tables.careerSchedule)
			.where(eq(tables.careerSchedule.id, job.scheduleId));
		if (schedule?.kind !== "discovery") return;
		const lastRun =
			error instanceof DiscoveryFailure
				? error.report
				: {
						...emptyReport(
							job.trigger === "manual" ? "manual" : "schedule",
							new Date(),
							[jobSearchQuery(schedule.query)],
							"",
						),
						outcome: "failed" as const,
						failure: "unknown" as const,
					};
		await db.update(tables.careerSchedule).set({ lastRun }).where(eq(tables.careerSchedule.id, job.scheduleId));
		const [failedRun] = await db
			.insert(tables.careerRun)
			.values({ userId: job.userId, scheduleId: job.scheduleId, report: lastRun })
			.returning({ id: tables.careerRun.id });
		await recordEvent({
			userId: job.userId,
			kind: "run.finished",
			level: "error",
			runId: failedRun?.id ?? null,
			data: { outcome: "failed", failure: lastRun.failure, trigger: lastRun.trigger, found: 0, matches: 0 },
		});
	} catch {
		// Reporting must never stop the scheduler.
	}
}

async function sendPendingEmail() {
	// Claim independently of job completion so a crash before SMTP can recover on the next tick.
	for (let i = 0; i < 2; i++) {
		const notification = await db.transaction(async (tx) => {
			const [row] = await tx
				.select({ notification: tables.careerNotification })
				.from(tables.careerNotification)
				.innerJoin(tables.careerJob, eq(tables.careerNotification.key, tables.careerJob.id))
				.innerJoin(tables.careerSchedule, eq(tables.careerJob.scheduleId, tables.careerSchedule.id))
				.where(
					and(
						eq(tables.careerJob.status, "completed"),
						eq(tables.careerSchedule.email, true),
						eq(tables.careerSchedule.enabled, true),
						isNull(tables.careerNotification.emailedAt),
						or(
							isNull(tables.careerNotification.emailAttemptedAt),
							lte(tables.careerNotification.emailAttemptedAt, new Date(Date.now() - 10 * 60_000)),
						),
						sql`not exists (select 1 from career_notification failed where failed.key = 'email-failed:' || ${tables.careerNotification.key} and failed.user_id = ${tables.careerNotification.userId})`,
					),
				)
				.orderBy(asc(tables.careerNotification.createdAt))
				.limit(1)
				.for("update", { skipLocked: true, of: tables.careerNotification });
			if (!row) return null;
			await tx
				.update(tables.careerNotification)
				.set({ emailAttemptedAt: new Date() })
				.where(eq(tables.careerNotification.id, row.notification.id));
			return row.notification;
		});
		if (!notification) break;
		const [owner] = await db
			.select({ email: tables.user.email, verified: tables.user.emailVerified })
			.from(tables.user)
			.where(eq(tables.user.id, notification.userId));
		if (notification && owner?.verified) {
			try {
				const sent = await sendCareerNotification({
					to: owner.email,
					subject: noticeText(notification.notice).title,
					text: "You have a career update in Reactive Resume.",
					url: new URL(notification.url ?? OVERVIEW_URL, env.APP_URL).toString(),
					key: notification.key,
				});
				if (!sent) throw new Error("SMTP unavailable");
				await db
					.update(tables.careerNotification)
					.set({ emailedAt: new Date() })
					.where(eq(tables.careerNotification.id, notification.id));
			} catch {
				await db
					.insert(tables.careerNotification)
					.values({
						userId: notification.userId,
						key: `email-failed:${notification.key}`,
						notice: { type: "email-failed" },
						url: AUTOMATION_URL,
					})
					.onConflictDoNothing();
			}
		}
	}
}

/** One bounded scheduler tick. No work continues after this promise resolves. */
export async function runCareerJobs() {
	const exhausted = await db
		.update(tables.careerJob)
		.set({
			status: "failed",
			lease: null,
			leaseUntil: null,
			error: "The worker stopped repeatedly; review this schedule.",
		})
		.where(
			and(
				eq(tables.careerJob.status, "running"),
				sql`${tables.careerJob.attempts} >= 3`,
				lte(tables.careerJob.leaseUntil, new Date()),
			),
		)
		.returning();
	for (const job of exhausted) {
		await recordFailure(job);
		await db
			.insert(tables.careerNotification)
			.values({
				userId: job.userId,
				key: `failed:${job.id}`,
				notice: { type: "schedule-failed", reason: "stopped" },
				url: `${AUTOMATION_URL}?schedule=${encodeURIComponent(job.scheduleId)}`,
			})
			.onConflictDoNothing();
	}
	await enqueue();
	await purgeOldActivity();
	let processed = 0;
	for (let i = 0; i < 2; i++) {
		const job = await claim();
		if (!job) break;
		try {
			await execute(job);
		} catch (error) {
			await recordFailure(job, error);
			const [failed] = await db
				.update(tables.careerJob)
				.set({
					status: job.attempts >= 3 ? "failed" : "queued",
					lease: null,
					leaseUntil: new Date(Date.now() + 300_000),
					error: "Career work failed. Check the selected provider and application, then review this schedule.",
				})
				.where(
					and(
						eq(tables.careerJob.id, job.id),
						eq(tables.careerJob.lease, job.lease ?? ""),
						eq(tables.careerJob.status, "running"),
					),
				)
				.returning();
			if (failed?.status === "failed")
				await db
					.insert(tables.careerNotification)
					.values({
						userId: job.userId,
						key: `failed:${job.id}`,
						notice: { type: "schedule-failed", reason: "failed" },
						url: `${AUTOMATION_URL}?schedule=${encodeURIComponent(job.scheduleId)}`,
					})
					.onConflictDoNothing();
		}
		processed++;
	}
	// Documents are prepared after discovery has finished and saved, each step bounded on its own.
	await runPreparations().catch(() => 0);
	await sendPendingEmail();
	return { processed };
}
