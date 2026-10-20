import type { DbOrTx } from "@reactive-resume/db/client";
import type { careerAutomationInputSchema, PreparationError, PreparationKind } from "@reactive-resume/schema/career";
import type z from "zod";
import { ORPCError } from "@orpc/client";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { RETRIEVAL_BUDGET } from "@reactive-resume/schema/career";
import { summarizePreparation } from "@reactive-resume/schema/career-run";
import { aiProvidersService } from "../ai-providers/service";
import { dayKey, jobHash, nextDayStart } from "./prepare-logic";
import { isCareerSchedulingEnabled } from "./runner";
import { trackOpportunityTx } from "./service";

type Automation = typeof tables.careerAutomation.$inferSelect;
type Schedule = typeof tables.careerSchedule.$inferSelect;
type Input = z.infer<typeof careerAutomationInputSchema>;

/** Results one discovery run asks for when its schedule does not say otherwise. */
export const DEFAULT_RETRIEVAL = RETRIEVAL_BUDGET.default;

const preconditionFailed = (message: string, data?: Record<string, unknown>) =>
	new ORPCError("PRECONDITION_FAILED", { message, data: data ?? {} });

/** The local day starts and ends in the user's timezone from Preferences. */
async function timeZoneOf(userId: string) {
	const [owner] = await db
		.select({ timezone: tables.user.timezone })
		.from(tables.user)
		.where(eq(tables.user.id, userId));
	return owner?.timezone ?? "UTC";
}

function usage(automation: Automation | undefined, timeZone: string, now = new Date()) {
	const today = dayKey(now, timeZone);
	return {
		used: automation?.usageDay === today ? automation.usageCount : 0,
		limit: automation?.dailyLimit ?? 10,
		resetsAt: nextDayStart(now, timeZone),
	};
}

export const careerAutomation = {
	get: async (userId: string) => {
		const [automation] = await db
			.select()
			.from(tables.careerAutomation)
			.where(eq(tables.careerAutomation.userId, userId));
		// Discovery is a schedule in Career → Schedules; this is only a read-only pointer to the one in use.
		const [schedule] = await db
			.select()
			.from(tables.careerSchedule)
			.where(and(eq(tables.careerSchedule.userId, userId), eq(tables.careerSchedule.kind, "discovery")))
			.orderBy(desc(tables.careerSchedule.enabled), desc(tables.careerSchedule.createdAt))
			.limit(1);
		return {
			resumesEnabled: automation?.resumesEnabled ?? false,
			lettersEnabled: automation?.lettersEnabled ?? false,
			baselineResumeId: automation?.baselineResumeId ?? null,
			aiProviderId: automation?.aiProviderId ?? null,
			dailyLimit: automation?.dailyLimit ?? 10,
			usage: usage(automation, await timeZoneOf(userId)),
			discovery: schedule
				? {
						scheduleId: schedule.id,
						enabled: schedule.enabled,
						query: schedule.query,
						intervalDays: schedule.intervalDays,
						intervalMinutes: schedule.intervalMinutes,
					}
				: null,
		};
	},

	save: async (userId: string, input: Input) => {
		const anyOn = input.resumesEnabled || input.lettersEnabled;
		if (anyOn && !isCareerSchedulingEnabled())
			throw preconditionFailed("Configure CRON_SECRET on Vercel before enabling automation.");
		if (anyOn) {
			if (!input.baselineResumeId)
				throw preconditionFailed("Choose the resume to use as your baseline.", { missing: "baseline" });
			const [baseline] = await db
				.select({ id: tables.resume.id })
				.from(tables.resume)
				.where(
					and(
						eq(tables.resume.id, input.baselineResumeId),
						eq(tables.resume.userId, userId),
						isNull(tables.resume.trashedAt),
					),
				);
			if (!baseline) throw preconditionFailed("That baseline resume is no longer available.", { missing: "baseline" });
			const provider = input.aiProviderId
				? await aiProvidersService.getRunnableById({ id: input.aiProviderId, userId }).catch(() => null)
				: await aiProvidersService.getDefaultRunnable({ userId }).catch(() => null);
			if (!provider)
				throw preconditionFailed("Connect and test an AI provider in Settings → AI & developer first.", {
					missing: "ai",
				});
		}

		await db.transaction(async (tx) => {
			await tx.insert(tables.careerAutomation).values({ userId }).onConflictDoNothing();
			const [automation] = await tx
				.select()
				.from(tables.careerAutomation)
				.where(eq(tables.careerAutomation.userId, userId))
				.for("update");
			if (!automation) throw new ORPCError("NOT_FOUND");

			// Turning a document type off stops its waiting work, and says so; it never deletes finished documents.
			for (const [kind, was, now] of [
				["resume", automation.resumesEnabled, input.resumesEnabled],
				["letter", automation.lettersEnabled, input.lettersEnabled],
			] as const) {
				if (was && !now)
					await tx
						.update(tables.careerPreparation)
						.set({ status: "canceled", error: "setting-off", lease: null, leaseUntil: null })
						.where(
							and(
								eq(tables.careerPreparation.userId, userId),
								eq(tables.careerPreparation.kind, kind),
								eq(tables.careerPreparation.status, "queued"),
								eq(tables.careerPreparation.manual, false),
							),
						);
			}

			await tx
				.update(tables.careerAutomation)
				.set({
					resumesEnabled: input.resumesEnabled,
					lettersEnabled: input.lettersEnabled,
					baselineResumeId: input.baselineResumeId,
					aiProviderId: input.aiProviderId,
					dailyLimit: input.dailyLimit,
				})
				.where(eq(tables.careerAutomation.id, automation.id));
		});
		return careerAutomation.get(userId);
	},

	/** Each discovered job with its document steps, whether the documents may be out of date, and what was edited. */
	preparations: async (userId: string) => {
		const rows = await db
			.select({
				step: tables.careerPreparation,
				company: tables.application.company,
				role: tables.application.role,
				jobDescription: tables.application.jobDescription,
			})
			.from(tables.careerPreparation)
			.leftJoin(tables.application, eq(tables.application.id, tables.careerPreparation.applicationId))
			.where(eq(tables.careerPreparation.userId, userId))
			.orderBy(desc(tables.careerPreparation.createdAt))
			.limit(200);
		const baselineIds = [
			...new Set(rows.flatMap(({ step }) => (step.baselineResumeId ? [step.baselineResumeId] : []))),
		];
		const resumeOutputs = rows.flatMap(({ step }) => (step.kind === "resume" && step.outputId ? [step.outputId] : []));
		const letterOutputs = rows.flatMap(({ step }) => (step.kind === "letter" && step.outputId ? [step.outputId] : []));
		const [baselines, resumes, letters] = await Promise.all([
			baselineIds.length
				? db
						.select({ id: tables.resume.id, updatedAt: tables.resume.updatedAt })
						.from(tables.resume)
						.where(and(eq(tables.resume.userId, userId), inArray(tables.resume.id, baselineIds)))
				: [],
			resumeOutputs.length
				? db
						.select({ id: tables.resume.id, updatedAt: tables.resume.updatedAt, trashedAt: tables.resume.trashedAt })
						.from(tables.resume)
						.where(and(eq(tables.resume.userId, userId), inArray(tables.resume.id, resumeOutputs)))
				: [],
			letterOutputs.length
				? db
						.select({
							id: tables.coverLetter.id,
							updatedAt: tables.coverLetter.updatedAt,
							trashedAt: tables.coverLetter.trashedAt,
						})
						.from(tables.coverLetter)
						.where(and(eq(tables.coverLetter.userId, userId), inArray(tables.coverLetter.id, letterOutputs)))
				: [],
		]);
		const baselineAt = new Map(baselines.map((row) => [row.id, row.updatedAt.toISOString()]));
		const outputs = new Map([...resumes, ...letters].map((row) => [row.id, row]));

		const jobs = new Map<
			string,
			{
				opportunityId: string;
				applicationId: string | null;
				company: string;
				role: string;
				steps: ReturnType<typeof toStep>[];
			}
		>();
		const toStep = (entry: (typeof rows)[number]) => {
			const { step } = entry;
			const output = step.outputId ? outputs.get(step.outputId) : undefined;
			const done = step.status === "done" && output && !output.trashedAt;
			return {
				id: step.id,
				kind: step.kind as PreparationKind,
				status: step.status as "queued" | "running" | "done" | "failed" | "canceled",
				error: step.error as PreparationError | null,
				issues: step.issues,
				manual: step.manual,
				generation: step.generation,
				outputId: done ? step.outputId : null,
				/** When a waiting step may start again (a daily limit or a retry delay). */
				eligibleAt: step.status === "queued" && step.nextAttemptAt > new Date() ? step.nextAttemptAt : null,
				completedAt: step.completedAt,
				/** The baseline resume or the posting changed after this document was made. */
				stale:
					Boolean(done) &&
					((step.baselineResumeId ? baselineAt.get(step.baselineResumeId) !== step.baselineVersion : false) ||
						(entry.jobDescription ? jobHash(entry.jobDescription) !== step.jobHash : false)),
				/** The document was changed after it was generated, so regenerating makes a new copy beside it. */
				edited: Boolean(done && step.completedAt && output.updatedAt.getTime() - step.completedAt.getTime() > 5_000),
			};
		};
		for (const entry of rows) {
			const job = jobs.get(entry.step.opportunityId) ?? {
				opportunityId: entry.step.opportunityId,
				applicationId: entry.step.applicationId,
				company: entry.company ?? "",
				role: entry.role ?? "",
				steps: [],
			};
			job.steps.push(toStep(entry));
			jobs.set(entry.step.opportunityId, job);
		}
		return [...jobs.values()].map((job) => ({ ...job, summary: summarizePreparation(job.steps) }));
	},

	/**
	 * Discovery runs, newest first, each with the jobs it found and the documents made for them, so a run can be traced
	 * to the right resume and cover letter. Paginated with limit and offset.
	 */
	runs: async (userId: string, input: { limit?: number | undefined; offset?: number | undefined }) => {
		const limit = input.limit ?? 10;
		const offset = input.offset ?? 0;
		const [rows, [counted]] = await Promise.all([
			db
				.select()
				.from(tables.careerRun)
				.where(eq(tables.careerRun.userId, userId))
				.orderBy(desc(tables.careerRun.createdAt), desc(tables.careerRun.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(tables.careerRun)
				.where(eq(tables.careerRun.userId, userId)),
		]);
		const runIds = rows.map((row) => row.id);
		const opportunities = runIds.length
			? await db
					.select({
						id: tables.careerOpportunity.id,
						runId: tables.careerOpportunity.runId,
						role: tables.careerOpportunity.role,
						company: tables.careerOpportunity.company,
						url: tables.careerOpportunity.url,
						trackedApplicationId: tables.careerOpportunity.trackedApplicationId,
					})
					.from(tables.careerOpportunity)
					.where(
						and(
							eq(tables.careerOpportunity.userId, userId),
							inArray(tables.careerOpportunity.runId, runIds),
							// Results that were not postings, or that were dismissed, are not jobs to follow up.
							isNull(tables.careerOpportunity.dismissedAt),
						),
					)
					.orderBy(tables.careerOpportunity.firstSeenAt)
					.limit(runIds.length * 25)
			: [];
		const steps = opportunities.length
			? await db
					.select()
					.from(tables.careerPreparation)
					.where(
						and(
							eq(tables.careerPreparation.userId, userId),
							inArray(
								tables.careerPreparation.opportunityId,
								opportunities.map((row) => row.id),
							),
						),
					)
			: [];
		const resumeIds = steps.flatMap((step) => (step.kind === "resume" && step.outputId ? [step.outputId] : []));
		const letterIds = steps.flatMap((step) => (step.kind === "letter" && step.outputId ? [step.outputId] : []));
		const [resumes, letters] = await Promise.all([
			resumeIds.length
				? db
						.select({ id: tables.resume.id })
						.from(tables.resume)
						.where(
							and(
								eq(tables.resume.userId, userId),
								inArray(tables.resume.id, resumeIds),
								isNull(tables.resume.trashedAt),
							),
						)
				: [],
			letterIds.length
				? db
						.select({ id: tables.coverLetter.id })
						.from(tables.coverLetter)
						.where(
							and(
								eq(tables.coverLetter.userId, userId),
								inArray(tables.coverLetter.id, letterIds),
								isNull(tables.coverLetter.trashedAt),
							),
						)
				: [],
		]);
		const alive = new Set([...resumes, ...letters].map((row) => row.id));
		return {
			total: counted?.total ?? 0,
			items: rows.map((run) => ({
				id: run.id,
				createdAt: run.createdAt,
				report: run.report,
				jobs: opportunities
					.filter((job) => job.runId === run.id)
					.map((job) => {
						const own = steps.filter((step) => step.opportunityId === job.id);
						const document = (kind: PreparationKind) => {
							const step = own.find((item) => item.kind === kind);
							if (!step) return null;
							return {
								stepId: step.id,
								status: step.status as "queued" | "running" | "done" | "failed" | "canceled",
								// Only a document that still exists is linked.
								outputId: step.status === "done" && step.outputId && alive.has(step.outputId) ? step.outputId : null,
							};
						};
						return {
							opportunityId: job.id,
							role: job.role,
							company: job.company,
							url: job.url,
							applicationId: job.trackedApplicationId ?? own[0]?.applicationId ?? null,
							resume: document("resume"),
							letter: document("letter"),
							summary: summarizePreparation(
								own.map((step) => ({
									kind: step.kind as PreparationKind,
									status: step.status as "queued" | "running" | "done" | "failed" | "canceled",
									error: step.error as PreparationError | null,
								})),
							),
						};
					}),
			})),
		};
	},

	/** Explicitly prepares documents for chosen existing jobs; this is the only way the backlog is processed. */
	prepare: async (userId: string, input: { opportunityIds: string[]; resume: boolean; letter: boolean }) => {
		if (!input.resume && !input.letter)
			throw new ORPCError("BAD_REQUEST", { message: "Choose at least one document." });
		const [automation] = await db
			.select()
			.from(tables.careerAutomation)
			.where(eq(tables.careerAutomation.userId, userId));
		if (!automation?.baselineResumeId)
			throw preconditionFailed("Choose a baseline resume in Settings → Automation first.", { missing: "baseline" });
		const kinds: PreparationKind[] = [
			...(input.resume ? (["resume"] as const) : []),
			...(input.letter ? (["letter"] as const) : []),
		];
		return db.transaction(async (tx) => {
			let queued = 0;
			for (const opportunityId of new Set(input.opportunityIds)) {
				const { applicationId } = await trackOpportunityTx(tx, userId, opportunityId);
				for (const kind of kinds) {
					const [existing] = await tx
						.select()
						.from(tables.careerPreparation)
						.where(
							and(
								eq(tables.careerPreparation.userId, userId),
								eq(tables.careerPreparation.opportunityId, opportunityId),
								eq(tables.careerPreparation.kind, kind),
							),
						)
						.for("update");
					if (!existing) {
						await tx
							.insert(tables.careerPreparation)
							.values({ userId, opportunityId, applicationId, kind, manual: true });
						queued++;
					} else if (existing.status === "canceled" || existing.status === "failed") {
						await tx
							.update(tables.careerPreparation)
							.set({
								status: "queued",
								manual: true,
								attempts: 0,
								error: null,
								nextAttemptAt: new Date(),
								applicationId,
							})
							.where(eq(tables.careerPreparation.id, existing.id));
						queued++;
					}
				}
			}
			return { queued };
		});
	},

	/** Tries a failed or canceled step again. It keeps its output and its place in the daily count. */
	retry: async (userId: string, id: string) => {
		const [row] = await db
			.update(tables.careerPreparation)
			.set({
				status: "queued",
				manual: true,
				attempts: 0,
				error: null,
				nextAttemptAt: new Date(),
				lease: null,
				leaseUntil: null,
			})
			.where(
				and(
					eq(tables.careerPreparation.id, id),
					eq(tables.careerPreparation.userId, userId),
					inArray(tables.careerPreparation.status, ["failed", "canceled"]),
				),
			)
			.returning({ id: tables.careerPreparation.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},

	/** Makes a new document from the current baseline and posting. The earlier one, edited or not, is left alone. */
	regenerate: async (userId: string, id: string) => {
		const [row] = await db
			.update(tables.careerPreparation)
			.set({
				status: "queued",
				manual: true,
				generation: sql`${tables.careerPreparation.generation} + 1`,
				attempts: 0,
				counted: false,
				error: null,
				issues: [],
				outputId: null,
				completedAt: null,
				nextAttemptAt: new Date(),
				lease: null,
				leaseUntil: null,
			})
			.where(
				and(
					eq(tables.careerPreparation.id, id),
					eq(tables.careerPreparation.userId, userId),
					inArray(tables.careerPreparation.status, ["done", "failed", "canceled"]),
				),
			)
			.returning({ id: tables.careerPreparation.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},
};

/**
 * Called inside a discovery run's transaction with the roles it just added. Each becomes an application and one step
 * per enabled document type, once: the unique key makes a repeated call a no-op. Existing roles and any backlog are
 * never touched here.
 */
export async function enqueueAutomatedPreparation(tx: DbOrTx, userId: string, opportunityIds: string[]) {
	if (!opportunityIds.length) return 0;
	const [automation] = await tx
		.select()
		.from(tables.careerAutomation)
		.where(eq(tables.careerAutomation.userId, userId));
	const kinds: PreparationKind[] = [
		...(automation?.resumesEnabled ? (["resume"] as const) : []),
		...(automation?.lettersEnabled ? (["letter"] as const) : []),
	];
	if (!kinds.length) return 0;
	for (const opportunityId of opportunityIds) {
		const { applicationId } = await trackOpportunityTx(tx, userId, opportunityId);
		await tx
			.insert(tables.careerPreparation)
			.values(kinds.map((kind) => ({ userId, opportunityId, applicationId, kind })))
			.onConflictDoNothing();
	}
	return opportunityIds.length;
}

/** What a scheduled run should ask the search provider for: the schedule's budget and a recent-results window. */
export function retrievalFor(schedule: Pick<Schedule, "intervalMinutes" | "lastSucceededAt" | "retrievalBudget">) {
	return {
		limit: schedule.retrievalBudget ?? DEFAULT_RETRIEVAL,
		since: freshnessSince(schedule),
	};
}

/**
 * Hourly-style runs ask the provider only for recent results, from the last success back by an overlap (at least two
 * hours, or a whole interval) so results the provider indexed late are still seen. Daily and longer runs search
 * without a date filter, since many postings carry no date at all. Providers return ranked results rather than a
 * complete feed, so this narrows and widens a search; it does not guarantee coverage.
 */
export function freshnessSince(schedule: Pick<Schedule, "intervalMinutes" | "lastSucceededAt">) {
	if (!schedule.intervalMinutes || !schedule.lastSucceededAt) return undefined;
	const overlap = Math.max(2 * 3_600_000, schedule.intervalMinutes * 60_000);
	return new Date(schedule.lastSucceededAt.getTime() - overlap);
}
