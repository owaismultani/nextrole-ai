import type { PreparationError } from "@reactive-resume/schema/career";
import type { CareerEventKind, CareerEventLevel } from "@reactive-resume/schema/career";
import type { Locale } from "@reactive-resume/utils/locale";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { letterDraftSystemPrompt } from "@reactive-resume/ai/prompts";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { buildMarkdown } from "@reactive-resume/resume/markdown";
import { generateId } from "@reactive-resume/utils/string";
import { aiProvidersService } from "../ai-providers/service";
import { generateJson } from "../ai/generate-json";
import { getModel } from "../ai/service";
import { applicationService } from "../applications/service";
import { sanitizeCoverLetterHtml } from "../cover-letters/html";
import { coverLetterService } from "../cover-letters/service";
import { resumeService } from "../resume/service";
import { jobLabel, recordEvent } from "./events";

/** A step that fails this many times stops and asks for attention; waits double up to an hour in between. */
const LEASE_MS = 5 * 60_000;
const GENERATION_TIMEOUT_MS = 90_000;

import {
	applyTailoring,
	classifyFailure,
	dayKey,
	jobHash,
	letterOutputSchema,
	MAX_ATTEMPTS,
	MAX_POSTING_CHARS,
	nextDayStart,
	paragraphsToHtml,
	tailoringOutputSchema,
	tailoringPrompt,
} from "./prepare-logic";

export { classifyFailure, dayKey, jobHash, MAX_ATTEMPTS, nextDayStart, retryAfterMs } from "./prepare-logic";

type Row = typeof tables.careerPreparation.$inferSelect;

// ---- Days and the daily limit ----

/**
 * Takes one slot from the day's limit for this step's generation, once. The counter moves in a single conditional
 * UPDATE, so concurrent workers cannot overshoot, and `counted` makes a retry free. The limit counts generated
 * documents (a tailored resume and a cover letter are two) per local day in the schedule's timezone.
 */
export async function reserveSlot(row: Pick<Row, "id" | "userId">, timeZone: string, now = new Date()) {
	const day = dayKey(now, timeZone);
	return await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(tables.careerAutomation)
			.set({
				usageDay: day,
				usageCount: sql`case when ${tables.careerAutomation.usageDay} is not distinct from ${day} then ${tables.careerAutomation.usageCount} + 1 else 1 end`,
			})
			.where(
				and(
					eq(tables.careerAutomation.userId, row.userId),
					sql`(${tables.careerAutomation.usageDay} is distinct from ${day} or ${tables.careerAutomation.usageCount} < ${tables.careerAutomation.dailyLimit})`,
				),
			)
			.returning({ id: tables.careerAutomation.id });
		if (!updated) return { ok: false as const, resetsAt: nextDayStart(now, timeZone) };
		await tx.update(tables.careerPreparation).set({ counted: true }).where(eq(tables.careerPreparation.id, row.id));
		return { ok: true as const };
	});
}

// ---- Claiming and running ----

/** A running step whose worker disappeared and used up its attempts stops asking for more. */
async function failStalled() {
	await db
		.update(tables.careerPreparation)
		.set({ status: "failed", error: "unknown", lease: null, leaseUntil: null })
		.where(
			and(
				eq(tables.careerPreparation.status, "running"),
				lte(tables.careerPreparation.leaseUntil, new Date()),
				sql`${tables.careerPreparation.attempts} >= ${MAX_ATTEMPTS}`,
			),
		);
}

/**
 * Claims the oldest due step, never two at once for one person: a user with a step in progress waits, so a long
 * backlog from one account does not starve the others. Returns null when nothing is due.
 */
export async function claimPreparation() {
	await failStalled();
	return db.transaction(async (tx) => {
		const now = new Date();
		const [candidate] = await tx
			.select()
			.from(tables.careerPreparation)
			.where(
				and(
					or(
						and(eq(tables.careerPreparation.status, "queued"), lte(tables.careerPreparation.nextAttemptAt, now)),
						and(eq(tables.careerPreparation.status, "running"), lte(tables.careerPreparation.leaseUntil, now)),
					),
					// A person with a step in progress waits, so the next claim goes to someone else.
					sql`not exists (select 1 from career_preparation busy where busy.user_id = ${tables.careerPreparation.userId} and busy.status = 'running' and busy.lease_until > ${now} and busy.id <> ${tables.careerPreparation.id})`,
				),
			)
			.orderBy(asc(tables.careerPreparation.nextAttemptAt))
			.limit(1)
			.for("update", { skipLocked: true });
		if (!candidate) return null;
		// Two workers can pick different rows of one user; the per-user lock lets only the first proceed.
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`prep:${candidate.userId}`}))`);
		const [busy] = await tx
			.select({ id: tables.careerPreparation.id })
			.from(tables.careerPreparation)
			.where(
				and(
					eq(tables.careerPreparation.userId, candidate.userId),
					eq(tables.careerPreparation.status, "running"),
					sql`${tables.careerPreparation.id} <> ${candidate.id}`,
					sql`${tables.careerPreparation.leaseUntil} > ${now}`,
				),
			)
			.limit(1);
		if (busy) return null;
		const [claimed] = await tx
			.update(tables.careerPreparation)
			.set({
				status: "running",
				attempts: candidate.attempts + 1,
				lease: generateId(),
				leaseUntil: new Date(now.getTime() + LEASE_MS),
				startedAt: candidate.startedAt ?? now,
			})
			.where(eq(tables.careerPreparation.id, candidate.id))
			.returning();
		return claimed ?? null;
	});
}

/** Ends a step only while the claim is still ours. */
const settle = (row: Row, values: Partial<typeof tables.careerPreparation.$inferInsert>) =>
	db
		.update(tables.careerPreparation)
		.set({ lease: null, leaseUntil: null, ...values })
		.where(
			and(
				eq(tables.careerPreparation.id, row.id),
				eq(tables.careerPreparation.lease, row.lease ?? ""),
				eq(tables.careerPreparation.status, "running"),
			),
		);

class Stop extends Error {
	code: PreparationError;
	constructor(code: PreparationError) {
		super(code);
		this.code = code;
	}
}

/** Records what happened to a step in the activity log, naming the job. Never throws. */
async function emit(
	row: Row,
	kind: CareerEventKind,
	level: CareerEventLevel,
	data: Record<string, string | number | boolean | null>,
) {
	try {
		const label = await jobLabel(row.opportunityId);
		await recordEvent({
			userId: row.userId,
			kind,
			level,
			opportunityId: row.opportunityId,
			data: { kind: row.kind, ...label, ...data },
		});
	} catch {
		// Activity is a convenience view; the step's own state is the source of truth.
	}
}

export async function runPreparation(row: Row) {
	await emit(row, "prep.started", "info", { attempt: row.attempts });
	try {
		await work(row);
	} catch (error) {
		if (error instanceof Stop) {
			await settle(row, { status: "failed", error: error.code });
			await emit(row, "prep.failed", "error", { code: error.code });
			return;
		}
		const { code, retryAt, final } = classifyFailure(error, row.attempts);
		await settle(
			row,
			final ? { status: "failed", error: code } : { status: "queued", error: code, nextAttemptAt: retryAt },
		);
		if (final) await emit(row, "prep.failed", "error", { code, attempts: row.attempts });
		else await emit(row, "prep.retry", "warn", { code, attempt: row.attempts, retryAt: retryAt.toISOString() });
	}
}

async function work(row: Row) {
	const [automation] = await db
		.select()
		.from(tables.careerAutomation)
		.where(eq(tables.careerAutomation.userId, row.userId));
	// An automatic step follows the current toggle; a step a person asked for does not.
	const allowed = row.manual || (row.kind === "resume" ? automation?.resumesEnabled : automation?.lettersEnabled);
	if (!automation || !allowed) {
		await settle(row, { status: "canceled", error: "setting-off" });
		await emit(row, "prep.canceled", "info", { code: "setting-off" });
		return;
	}
	if (!automation.baselineResumeId) throw new Stop("no-baseline");
	if (!row.applicationId) throw new Stop("no-description");
	const [baseline] = await db
		.select()
		.from(tables.resume)
		.where(
			and(
				eq(tables.resume.id, automation.baselineResumeId),
				eq(tables.resume.userId, row.userId),
				isNull(tables.resume.trashedAt),
			),
		);
	if (!baseline) throw new Stop("no-baseline");
	const application = await applicationService.getById({ id: row.applicationId, userId: row.userId }).catch(() => null);
	const description = application?.jobDescription?.trim() ?? "";
	if (!application || !description) throw new Stop("no-description");

	const provider = automation.aiProviderId
		? await aiProvidersService.getRunnableById({ id: automation.aiProviderId, userId: row.userId }).catch(() => null)
		: await aiProvidersService.getDefaultRunnable({ userId: row.userId }).catch(() => null);
	if (!provider) throw new Stop("no-ai");

	if (!row.counted) {
		const [owner] = await db
			.select({ timezone: tables.user.timezone })
			.from(tables.user)
			.where(eq(tables.user.id, row.userId));
		const slot = await reserveSlot(row, owner?.timezone ?? "UTC");
		if (!slot.ok) {
			// Waiting is not an attempt; the step comes back after the limit resets.
			await settle(row, {
				status: "queued",
				error: "daily-limit",
				attempts: Math.max(0, row.attempts - 1),
				nextAttemptAt: slot.resetsAt,
			});
			await emit(row, "prep.deferred", "info", { code: "daily-limit", until: slot.resetsAt.toISOString() });
			return;
		}
	}

	const model = getModel({
		provider: provider.provider,
		model: provider.model,
		apiKey: provider.apiKey,
		...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
	});
	const signal = AbortSignal.timeout(GENERATION_TIMEOUT_MS);
	const job = { role: application.role, company: application.company, description };

	const outcome =
		row.kind === "resume"
			? await prepareResume({
					row,
					model,
					signal,
					baseline,
					job,
					applicationId: application.id,
					instruction: automation.resumePrompt,
				})
			: await prepareLetter({
					row,
					model,
					signal,
					baseline,
					job,
					applicationId: application.id,
					instruction: automation.coverLetterPrompt,
				});

	await settle(row, {
		status: "done",
		error: null,
		outputId: outcome.outputId,
		issues: outcome.issues,
		baselineResumeId: baseline.id,
		baselineVersion: baseline.updatedAt.toISOString(),
		jobHash: jobHash(description),
		completedAt: new Date(),
	});
	await emit(row, "prep.done", "info", { gaps: outcome.issues.length });
}

type Step = {
	row: Row;
	model: ReturnType<typeof getModel>;
	signal: AbortSignal;
	baseline: typeof tables.resume.$inferSelect;
	job: { role: string; company: string; description: string };
	applicationId: string;
	instruction: string;
};

/** A separate tailored copy, linked to the application. The baseline is only read. */
async function prepareResume({ row, model, signal, baseline, job, applicationId, instruction }: Step) {
	const outputId = row.outputId ?? generateId();
	if (!row.outputId)
		await db.update(tables.careerPreparation).set({ outputId }).where(eq(tables.careerPreparation.id, row.id));
	const existing = await resumeService.getById({ id: outputId, userId: row.userId }).catch(() => null);
	if (existing) return { outputId, issues: row.issues };

	const proposal = await generateJson(
		model,
		{ prompt: tailoringPrompt(baseline.data, job, instruction) },
		tailoringOutputSchema,
		signal,
	);
	const { data, issues } = applyTailoring(baseline.data, proposal);
	const name = `Tailored — ${job.company} · ${job.role}`.slice(0, 60);
	await resumeService.create({
		id: outputId,
		userId: row.userId,
		name,
		tags: [...new Set([...baseline.tags, "tailored", "auto"])],
		data,
		locale: baseline.data.metadata.page.locale as Locale,
	});
	await db
		.update(tables.resume)
		.set({ applicationId })
		.where(and(eq(tables.resume.id, outputId), eq(tables.resume.userId, row.userId)));
	const application = await applicationService.getById({ id: applicationId, userId: row.userId });
	// Never replace a resume the person already linked.
	if (!application.resumeId)
		await applicationService.update({ id: applicationId, userId: row.userId, resumeId: outputId });
	return { outputId, issues };
}

/** A letter written from the baseline, the posting and the person's own facts; it does not need the tailored resume. */
async function prepareLetter({ row, model, signal, baseline, job, applicationId, instruction }: Step) {
	const name = `Cover letter — ${job.company} · ${job.role}`.slice(0, 60);
	if (row.outputId) {
		const [kept] = await db
			.select({ id: tables.coverLetter.id })
			.from(tables.coverLetter)
			.where(and(eq(tables.coverLetter.id, row.outputId), eq(tables.coverLetter.userId, row.userId)));
		if (kept) return { outputId: kept.id, issues: row.issues };
	}
	// A crash after creating the letter but before recording it: find the letter this claim made.
	const [made] = await db
		.select({ id: tables.coverLetter.id })
		.from(tables.coverLetter)
		.where(
			and(
				eq(tables.coverLetter.userId, row.userId),
				eq(tables.coverLetter.sourceApplicationId, applicationId),
				eq(tables.coverLetter.name, name),
				row.startedAt ? sql`${tables.coverLetter.createdAt} >= ${row.startedAt}` : sql`false`,
				isNull(tables.coverLetter.trashedAt),
			),
		)
		.limit(1);
	if (made) {
		await db.update(tables.careerPreparation).set({ outputId: made.id }).where(eq(tables.careerPreparation.id, row.id));
		return { outputId: made.id, issues: row.issues };
	}

	const facts = await db
		.select({ text: tables.careerFact.text })
		.from(tables.careerFact)
		.where(
			and(
				eq(tables.careerFact.userId, row.userId),
				eq(tables.careerFact.status, "active"),
				or(isNull(tables.careerFact.applicationId), eq(tables.careerFact.applicationId, applicationId)),
			),
		)
		.limit(30);
	const prompt = [
		'Write the body of a cover letter for this job. Return ONLY JSON: {"body":"plain paragraphs separated by blank lines","missing":["things a good letter needs that the resume and facts do not say"]}.',
		"Use only the resume and the facts below for anything personal. Do not invent motivations, achievements, numbers or knowledge about the employer beyond the posting. When something is missing, leave it out and list it in `missing`.",
		`## The job\n${job.role} at ${job.company}`,
		`<<<POSTING_START>>>\n${job.description.slice(0, MAX_POSTING_CHARS)}\n<<<POSTING_END>>>`,
		`<<<RESUME_START>>>\n${buildMarkdown(baseline.data)}\n<<<RESUME_END>>>`,
		facts.length
			? `<<<FACTS_START>>>\n${facts.map((fact) => `- ${fact.text.slice(0, 300)}`).join("\n")}\n<<<FACTS_END>>>`
			: "",
		`<<<ADDITIONAL_INSTRUCTION_START>>>\n${instruction}\n<<<ADDITIONAL_INSTRUCTION_END>>>`,
	]
		.filter(Boolean)
		.join("\n\n");
	const letter = await generateJson(model, { system: letterDraftSystemPrompt, prompt }, letterOutputSchema, signal);
	const created = await coverLetterService.create({
		userId: row.userId,
		name,
		applicationId,
		resumeId: baseline.id,
		content: sanitizeCoverLetterHtml(paragraphsToHtml(letter.body)),
	});
	await db
		.update(tables.careerPreparation)
		.set({ outputId: created.id })
		.where(eq(tables.careerPreparation.id, row.id));
	return { outputId: created.id, issues: letter.missing.map((item) => `Not in your resume or facts: ${item}`) };
}

/** One tick's worth: a bounded number of steps, each for a different person, run side by side. */
export async function runPreparations(limit = 2) {
	const claimed: Row[] = [];
	for (let i = 0; i < limit; i++) {
		const row = await claimPreparation();
		if (!row) break;
		claimed.push(row);
	}
	await Promise.allSettled(claimed.map((row) => runPreparation(row)));
	return claimed.length;
}
