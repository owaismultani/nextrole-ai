import type { OverviewApplication } from "./overview-logic";
import { and, asc, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { careerAutomation } from "./automation";
import { discoveryHealth, reachedSince, sumReports, upcomingInterviews } from "./overview-logic";

const DAY = 86_400_000;

/**
 * One read for the dashboard: what needs the person, how far jobs get from discovery to offer, how discovery is doing,
 * and what automation is using. Everything is the person's own; `days` only bounds the funnel and the discovery trend.
 */
export async function careerOverview(userId: string, days: number) {
	const now = new Date();
	const since = new Date(now.getTime() - days * DAY);

	const [automation, preparations, applications, runs, [schedule], [newRoles], [unread]] = await Promise.all([
		careerAutomation.get(userId),
		careerAutomation.preparations(userId),
		db
			.select({
				id: tables.application.id,
				company: tables.application.company,
				role: tables.application.role,
				status: tables.application.status,
				activity: tables.application.activity,
			})
			.from(tables.application)
			.where(eq(tables.application.userId, userId)),
		db
			.select({ at: tables.careerRun.createdAt, report: tables.careerRun.report })
			.from(tables.careerRun)
			.where(and(eq(tables.careerRun.userId, userId), gte(tables.careerRun.createdAt, since)))
			.orderBy(asc(tables.careerRun.createdAt))
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
	]);

	const reports = runs.map((run) => run.report);
	const health = discoveryHealth(reports);
	const apps = applications as OverviewApplication[];
	const interviews = upcomingInterviews(apps, now);
	const ready = preparations.filter((job) => job.summary === "ready");
	const readyInWindow = ready.filter((job) =>
		job.steps.some((step) => step.completedAt && step.completedAt.getTime() >= since.getTime()),
	).length;
	const totals = sumReports(reports);

	return {
		windowDays: days,
		needsYou: {
			readyDocuments: ready.length,
			attentionDocuments: preparations.filter((job) => job.summary === "attention").length,
			upcomingInterviews: interviews.length,
			unreadReminders: unread?.total ?? 0,
			newRoles: newRoles?.total ?? 0,
			discoveryFailing: health.failing,
		},
		/** From finding a job to an offer; each step counts jobs that reached it inside the window. */
		funnel: [
			{ key: "discovered" as const, count: totals.matches },
			{ key: "saved" as const, count: reachedSince(apps, "saved", since) },
			{ key: "documents" as const, count: readyInWindow },
			{ key: "applied" as const, count: reachedSince(apps, "applied", since) },
			{ key: "screening" as const, count: reachedSince(apps, "screening", since) },
			{ key: "interview" as const, count: reachedSince(apps, "interview", since) },
			{ key: "offer" as const, count: reachedSince(apps, "offer", since) },
		],
		discovery: {
			scheduleId: schedule?.id ?? null,
			enabled: schedule?.enabled ?? false,
			lastAttemptedAt: schedule?.lastAttemptedAt ?? null,
			lastSucceededAt: schedule?.lastSucceededAt ?? null,
			nextRunAt: schedule?.enabled ? schedule.nextRunAt : null,
			failing: health.failing,
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
			deferred: preparations.filter((job) => job.summary === "deferred").length,
			stale: preparations.filter((job) => job.steps.some((step) => step.stale)).length,
		},
		interviews: interviews.slice(0, 5),
	};
}
