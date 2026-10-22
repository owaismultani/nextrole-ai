import type { OverviewApplication } from "./overview-logic";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { aiProvidersService } from "../ai-providers/service";
import { webAccessService } from "../web-access/credentials";
import { careerAutomation } from "./automation";
import {
	discoveryHealth,
	firstResponsesSince,
	nextActions,
	healthChecks,
	reachedSince,
	stageMap,
	sumReports,
	upcomingInterviews,
} from "./overview-logic";

const DAY = 86_400_000;

/**
 * One read for the dashboard: what needs the person, where each pipeline step stands and why, a live checklist of
 * what must be working, discovery over the window, and automation use. Everything is the person's own; `days` only
 * bounds the window totals.
 */
export async function careerOverview(userId: string, days: number) {
	const now = new Date();
	const since = new Date(now.getTime() - days * DAY);

	const [
		automation,
		preparations,
		applications,
		runRows,
		[schedule],
		[newRoles],
		[unread],
		[savedJobs],
		connection,
		provider,
	] = await Promise.all([
		careerAutomation.get(userId),
		careerAutomation.preparations(userId),
		db
			.select({
				id: tables.application.id,
				company: tables.application.company,
				role: tables.application.role,
				status: tables.application.status,
				activity: tables.application.activity,
				location: tables.application.location,
				followUpAt: tables.application.followUpAt,
				followUpNote: tables.application.followUpNote,
				appliedAt: tables.application.appliedAt,
			})
			.from(tables.application)
			.where(eq(tables.application.userId, userId)),
		// Newest first so a long window keeps the latest runs; flipped below for a trend that reads left to right.
		db
			.select({ id: tables.careerRun.id, at: tables.careerRun.createdAt, report: tables.careerRun.report })
			.from(tables.careerRun)
			.where(and(eq(tables.careerRun.userId, userId), gte(tables.careerRun.createdAt, since)))
			.orderBy(desc(tables.careerRun.createdAt))
			.limit(500),
		db
			.select()
			.from(tables.careerSchedule)
			.where(and(eq(tables.careerSchedule.userId, userId), eq(tables.careerSchedule.kind, "discovery")))
			.orderBy(desc(tables.careerSchedule.enabled), desc(tables.careerSchedule.createdAt))
			.limit(1),
		db
			.select({ total: count() })
			.from(tables.careerOpportunity)
			.where(
				and(
					eq(tables.careerOpportunity.userId, userId),
					isNull(tables.careerOpportunity.dismissedAt),
					isNull(tables.careerOpportunity.trackedApplicationId),
				),
			),
		db
			.select({ total: count() })
			.from(tables.careerNotification)
			.where(
				and(
					eq(tables.careerNotification.userId, userId),
					isNull(tables.careerNotification.readAt),
					sql`${tables.careerNotification.notice}->>'type' in ('followup', 'briefing')`,
				),
			),
		// Jobs discovery saved that are still sitting at Saved, waiting for a decision.
		db
			.select({ total: count() })
			.from(tables.careerOpportunity)
			.innerJoin(tables.application, eq(tables.application.id, tables.careerOpportunity.trackedApplicationId))
			.where(and(eq(tables.careerOpportunity.userId, userId), eq(tables.application.status, "saved"))),
		webAccessService.resolve(userId).catch(() => null),
		aiProvidersService.getDefaultRunnable({ userId }).catch(() => null),
	]);

	const lastRunId = runRows[0]?.id ?? null;
	const runs = runRows.toReversed();
	const reports = runs.map((run) => run.report);
	const lastRun = reports.at(-1) ?? null;
	const health = discoveryHealth(reports);
	const apps = applications as OverviewApplication[];
	const interviews = upcomingInterviews(apps, now);
	const ready = preparations.filter((job) => job.summary === "ready");
	const steps = preparations.flatMap((job) => job.steps);
	const eligible = steps
		.map((step) => step.eligibleAt)
		.filter((value): value is Date => value instanceof Date)
		.sort((a, b) => a.getTime() - b.getTime())[0];
	const scheduleState = schedule
		? { enabled: schedule.enabled, nextRunAt: schedule.nextRunAt, activeRun: null as "queued" | "running" | null }
		: null;
	const activeRun = scheduleState
		? await db
				.select({ status: tables.careerJob.status })
				.from(tables.careerJob)
				.where(
					and(
						eq(tables.careerJob.scheduleId, schedule?.id ?? ""),
						sql`${tables.careerJob.status} in ('queued', 'running')`,
					),
				)
				.limit(1)
		: [];
	if (scheduleState && activeRun[0]) scheduleState.activeRun = activeRun[0].status === "running" ? "running" : "queued";

	const documents = { resumes: automation.resumesEnabled, letters: automation.lettersEnabled };
	const weekAhead = interviews[0];
	const [latestJob] = lastRunId
		? await db
				.select({
					role: tables.careerOpportunity.role,
					company: tables.careerOpportunity.company,
					location: tables.careerOpportunity.location,
				})
				.from(tables.careerOpportunity)
				.where(and(eq(tables.careerOpportunity.userId, userId), eq(tables.careerOpportunity.runId, lastRunId)))
				.orderBy(tables.careerOpportunity.firstSeenAt)
				.limit(1)
		: [];
	// What is ready for the next interview: its briefing, and any practice for the application.
	const prepared = weekAhead
		? await db
				.select({
					kind: sql<string>`${tables.careerArtifact.data}->>'kind'`,
					interviewId: tables.careerArtifact.interviewId,
				})
				.from(tables.careerArtifact)
				.where(
					and(
						eq(tables.careerArtifact.userId, userId),
						eq(tables.careerArtifact.applicationId, weekAhead.applicationId),
						sql`${tables.careerArtifact.data}->>'kind' in ('briefing', 'practice')`,
					),
				)
		: [];
	const actions = nextActions(
		preparations.map((job) => ({
			applicationId: job.applicationId,
			company: job.company,
			role: job.role,
			summary: job.summary,
			steps: job.steps.map((step) => ({ kind: step.kind, status: step.status, stale: step.stale })),
		})),
		apps,
		now,
	);
	const totals = sumReports(reports);

	return {
		windowDays: days,
		needsYou: {
			readyDocuments: ready.length,
			attentionDocuments: preparations.filter((job) => job.summary === "attention").length,
			upcomingInterviews: interviews.length,
			unreadReminders: unread?.total ?? 0,
			newRoles: newRoles?.total ?? 0,
			savedJobs: savedJobs?.total ?? 0,
			discoveryFailing: health.failing && Boolean(schedule?.enabled),
		},
		stages: stageMap({
			now,
			schedule: scheduleState,
			lastRun,
			documents,
			preparation: {
				running: steps.filter((step) => step.status === "running").length,
				queued: steps.filter((step) => step.status === "queued").length,
				deferred: preparations.filter((job) => job.summary === "deferred").length,
				attention: preparations.filter((job) => job.summary === "attention").length,
				ready: ready.length,
				eligibleAt: eligible ?? null,
			},
			appliedInWindow: reachedSince(apps, "applied", since),
		}),
		checks: healthChecks({
			now,
			schedule: scheduleState,
			lastRun,
			repeating: health.repeating,
			searchConnected: Boolean(connection),
			aiConnected: Boolean(provider),
			documents: {
				...documents,
				hasBaseline: Boolean(automation.baselineResumeId),
				used: automation.usage.used,
				limit: automation.usage.limit,
			},
		}),
		discovery: {
			scheduleId: schedule?.id ?? null,
			enabled: schedule?.enabled ?? false,
			lastAttemptedAt: schedule?.lastAttemptedAt ?? null,
			lastSucceededAt: schedule?.lastSucceededAt ?? null,
			nextRunAt: schedule?.enabled ? schedule.nextRunAt : null,
			failing: health.failing && Boolean(schedule?.enabled),
			/** The newest run, so a problem links to it in Search activity. */
			latestRunId: lastRunId,
			repeating: health.repeating,
			totals,
			/** Oldest first, for a trend; at most the latest 30 runs in the window. */
			runs: runs.slice(-30).map((run) => ({
				at: run.at,
				outcome: run.report.outcome,
				found: run.report.found,
				matches: run.report.matches,
				duplicates: run.report.duplicates,
				rejected: run.report.rejected,
				readFailures: run.report.readFailures,
			})),
		},
		automation: {
			resumesEnabled: automation.resumesEnabled,
			lettersEnabled: automation.lettersEnabled,
			used: automation.usage.used,
			limit: automation.usage.limit,
			resetsAt: automation.usage.resetsAt,
			generating: steps.filter((step) => step.status === "running").length,
			deferred: preparations.filter((job) => job.summary === "deferred").length,
			stale: preparations.filter((job) => job.steps.some((step) => step.stale)).length,
		},
		interviews: interviews.slice(0, 5),
		/** What needs a person, most urgent first, with counts for the tabs. */
		actions: {
			counts: {
				ready: actions.filter((action) => action.kind === "ready" || action.kind === "stale").length,
				followUps: actions.filter((action) => action.kind === "followup").length,
				issues: actions.filter((action) => action.kind === "issue").length,
			},
			items: actions.slice(0, 8),
		},
		/** The next interview, and whether you have prepared for it. */
		nextInterview: weekAhead
			? {
					...weekAhead,
					briefing: prepared.some(
						(item) =>
							item.kind === "briefing" && (!weekAhead.interviewId || item.interviewId === weekAhead.interviewId),
					),
					practice: prepared.some((item) => item.kind === "practice"),
				}
			: null,
		/** What happened to applications inside the window. */
		outcomes: {
			submitted: reachedSince(apps, "applied", since),
			firstResponses: firstResponsesSince(apps, since),
			interviews: reachedSince(apps, "interview", since),
			offers: reachedSince(apps, "offer", since),
		},
		/** The most recent search, with its first new job. */
		latestDiscovery:
			lastRun && runRows[0]
				? {
						at: runRows[0].at,
						outcome: lastRun.outcome,
						found: lastRun.found,
						matches: lastRun.matches,
						readFailures: lastRun.readFailures,
						job: latestJob ?? null,
					}
				: null,
	};
}
