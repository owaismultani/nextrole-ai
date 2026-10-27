import type { careerSetupLaunchSchema, SetupInterval } from "@reactive-resume/schema/career";
import type z from "zod";
import { ORPCError } from "@orpc/client";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { lintResumeForAts } from "@reactive-resume/resume/ats";
import { checkBaseline, suggestQuery } from "@reactive-resume/schema/baseline-check";
import {
	careerScheduleInputSchema,
	defaultDiscoveryFilters,
	discoverySourcesSchema,
} from "@reactive-resume/schema/career";
import { aiProvidersService } from "../ai-providers/service";
import { searchJobs } from "../job-sources/service";
import { webAccessService } from "../web-access/credentials";
import { careerAutomation } from "./automation";
import { careerJobs } from "./jobs";
import { careerService } from "./service";

type Launch = z.infer<typeof careerSetupLaunchSchema>;

/** Hours keep a fixed gap; daily keeps its local time, as everywhere else. */
const CADENCE: Record<SetupInterval, { intervalDays: number | null; intervalMinutes: 60 | 180 | 360 | null }> = {
	hourly: { intervalDays: null, intervalMinutes: 60 },
	"3h": { intervalDays: null, intervalMinutes: 180 },
	"6h": { intervalDays: null, intervalMinutes: 360 },
	daily: { intervalDays: 1, intervalMinutes: null },
};

async function ownedResume(userId: string, resumeId: string) {
	const [row] = await db
		.select({
			id: tables.resume.id,
			name: tables.resume.name,
			data: tables.resume.data,
			updatedAt: tables.resume.updatedAt,
		})
		.from(tables.resume)
		.where(and(eq(tables.resume.id, resumeId), eq(tables.resume.userId, userId), isNull(tables.resume.trashedAt)));
	if (!row) throw new ORPCError("NOT_FOUND");
	return row;
}

export const careerSetup = {
	/** Where first-run setup stands, derived from what is actually configured so it cannot drift from reality. */
	get: async (userId: string) => {
		const [[setup], connection, provider, [schedule], [anyApplication]] = await Promise.all([
			db.select().from(tables.careerSetup).where(eq(tables.careerSetup.userId, userId)),
			webAccessService.resolve(userId).catch(() => null),
			aiProvidersService.getDefaultRunnable({ userId }).catch(() => null),
			db
				.select()
				.from(tables.careerSchedule)
				.where(and(eq(tables.careerSchedule.userId, userId), eq(tables.careerSchedule.kind, "discovery")))
				.orderBy(desc(tables.careerSchedule.enabled), desc(tables.careerSchedule.createdAt))
				.limit(1),
			db
				.select({ id: tables.application.id })
				.from(tables.application)
				.where(eq(tables.application.userId, userId))
				.limit(1),
		]);
		const baseline = setup?.baselineResumeId
			? await ownedResume(userId, setup.baselineResumeId).catch(() => null)
			: null;
		const confirmed = Boolean(baseline && setup?.baselineConfirmedAt);
		const search = Boolean(connection);
		const completed = Boolean(setup?.completedAt);
		// Web search and AI are optional: free job sources need no setup, so a confirmed baseline goes straight on.
		const step = completed ? ("done" as const) : !confirmed ? ("baseline" as const) : ("discovery" as const);
		return {
			step,
			skipped: Boolean(setup?.skippedAt),
			completed,
			/** Guide a person who has not set anything up; someone with a schedule or applications already has. */
			needsSetup: !completed && !setup?.skippedAt && !schedule && !anyApplication,
			baseline: baseline
				? {
						resumeId: baseline.id,
						name: baseline.name,
						confirmed,
						/** Edited after it was confirmed. */
						changedSinceConfirm: Boolean(
							setup?.baselineVersion && setup.baselineVersion !== baseline.updatedAt.toISOString(),
						),
						suggestedQuery: suggestQuery(baseline.data),
					}
				: null,
			services: { search, ai: Boolean(provider) },
			discovery: schedule ? { scheduleId: schedule.id, enabled: schedule.enabled, query: schedule.query } : null,
		};
	},

	/** Completeness and ATS checks for a resume, shown before it is confirmed as the baseline. */
	validateBaseline: async (userId: string, resumeId: string) => {
		const resume = await ownedResume(userId, resumeId);
		const lint = lintResumeForAts(resume.data);
		return {
			resumeId: resume.id,
			name: resume.name,
			checks: checkBaseline(resume.data),
			ats: {
				score: lint.score,
				counts: lint.counts,
				findings: lint.findings.slice(0, 8).map((finding) => ({
					code: String(finding.code),
					severity: finding.severity,
					pointer: finding.pointer,
				})),
			},
			suggestedQuery: suggestQuery(resume.data),
		};
	},

	/** The person's explicit "this is my baseline". It is also the baseline automation tailors from. */
	confirmBaseline: async (userId: string, resumeId: string) => {
		const resume = await ownedResume(userId, resumeId);
		const now = new Date();
		await db.transaction(async (tx) => {
			await tx
				.insert(tables.careerSetup)
				.values({
					userId,
					baselineResumeId: resume.id,
					baselineConfirmedAt: now,
					baselineVersion: resume.updatedAt.toISOString(),
				})
				.onConflictDoUpdate({
					target: tables.careerSetup.userId,
					set: {
						baselineResumeId: resume.id,
						baselineConfirmedAt: now,
						baselineVersion: resume.updatedAt.toISOString(),
					},
				});
			await tx
				.insert(tables.careerAutomation)
				.values({ userId, baselineResumeId: resume.id })
				.onConflictDoUpdate({
					target: tables.careerAutomation.userId,
					set: { baselineResumeId: resume.id },
				});
		});
		return careerSetup.get(userId);
	},

	/**
	 * Runs the search once across the sources a new search starts with (web search when connected, and the free job
	 * sources), filtered by Preferences, and shows what came back, saving nothing.
	 */
	previewSearch: async (userId: string, query: string) => {
		try {
			const { results, bySource } = await searchJobs(
				userId,
				{
					query,
					sources: discoverySourcesSchema.parse({}),
					filters: defaultDiscoveryFilters(await careerService.profile(userId)),
				},
				AbortSignal.timeout(45_000),
			);
			// Every source that ran failed: say the search didn't work rather than show an empty list.
			const ran = bySource.filter((source) => source.status !== "skipped");
			if (!results.length && ran.length && ran.every((source) => source.status === "failed")) throw new Error("failed");
			return results
				.filter((result) => !result.filteredBy)
				.slice(0, 8)
				.map((result) => ({
					title: [result.title, result.company].filter(Boolean).join(" · ").slice(0, 200),
					url: result.url,
					description: [result.location, result.source].filter(Boolean).join(" · ").slice(0, 240),
				}));
		} catch {
			// Provider errors can echo credentials; say only that the search did not work.
			throw new ORPCError("BAD_GATEWAY", { message: "The search could not run. Check the connection and try again." });
		}
	},

	skip: async (userId: string) => {
		await db
			.insert(tables.careerSetup)
			.values({ userId, skippedAt: new Date() })
			.onConflictDoUpdate({ target: tables.careerSetup.userId, set: { skippedAt: new Date() } });
		return careerSetup.get(userId);
	},

	/**
	 * Applies the whole setup: document settings, then the discovery schedule (reusing the person's existing one so
	 * nothing runs twice), then marks setup done. Discovery runs at once.
	 */
	launch: async (userId: string, input: Launch) => {
		const current = await careerSetup.get(userId);
		if (!current.baseline?.confirmed)
			throw new ORPCError("PRECONDITION_FAILED", {
				message: "Confirm your baseline resume first.",
				data: { missing: "baseline" },
			});
		// Keep any prompts the person already customised; setup only decides what is on, the baseline and the limit.
		const existing = await careerAutomation.get(userId);
		await careerAutomation.save(userId, {
			resumePrompt: input.resumePrompt ?? existing.resumePrompt,
			coverLetterPrompt: input.coverLetterPrompt ?? existing.coverLetterPrompt,
			resumesEnabled: input.resumesEnabled,
			lettersEnabled: input.lettersEnabled,
			baselineResumeId: current.baseline.resumeId,
			aiProviderId: input.aiProviderId,
			dailyLimit: input.dailyLimit,
		});
		// A new search starts with web search and the free job sources; an existing one keeps what it was set to.
		const [existingSchedule] = current.discovery
			? await db
					.select({ sources: tables.careerSchedule.sources, filters: tables.careerSchedule.filters })
					.from(tables.careerSchedule)
					.where(eq(tables.careerSchedule.id, current.discovery.scheduleId))
			: [];
		await careerJobs.save(userId, {
			...careerScheduleInputSchema.parse({
				kind: "discovery",
				query: input.query,
				sources: existingSchedule?.sources ?? discoverySourcesSchema.parse({}),
				filters: existingSchedule?.filters ?? null,
				enabled: true,
				timezone: input.timezone,
				...(input.locale ? { locale: input.locale } : {}),
				nextRunAt: new Date(),
				retrievalBudget: input.retrievalBudget,
				...CADENCE[input.interval],
			}),
			...(current.discovery ? { id: current.discovery.scheduleId } : {}),
		});
		await db
			.insert(tables.careerSetup)
			.values({ userId, completedAt: new Date() })
			.onConflictDoUpdate({ target: tables.careerSetup.userId, set: { completedAt: new Date() } });
		return careerSetup.get(userId);
	},
};
