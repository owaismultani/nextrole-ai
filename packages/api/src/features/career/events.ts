import type { DbOrTx } from "@reactive-resume/db/client";
import type { CareerEventData, CareerEventKind, CareerEventLevel } from "@reactive-resume/schema/career";
import { eq, lt } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { ACTIVITY_RETENTION_DAYS } from "@reactive-resume/schema/career";

type Event = {
	userId: string;
	kind: CareerEventKind;
	level?: CareerEventLevel;
	runId?: string | null;
	opportunityId?: string | null;
	data?: CareerEventData;
};

/** Writes one event inside the caller's transaction. Plain facts only; never resume text, keys or provider messages. */
export async function recordEventIn(tx: DbOrTx, event: Event | Event[]) {
	const rows = (Array.isArray(event) ? event : [event]).map((item) => ({
		userId: item.userId,
		kind: item.kind,
		level: item.level ?? "info",
		runId: item.runId ?? null,
		opportunityId: item.opportunityId ?? null,
		data: item.data ?? {},
	}));
	if (rows.length) await tx.insert(tables.careerEvent).values(rows);
}

/** Writes an event outside any transaction. Reporting must never break the work it describes, so failures are dropped. */
export async function recordEvent(event: Event) {
	try {
		await recordEventIn(db, event);
	} catch {
		// Activity is a convenience view; the pipeline's own state is the source of truth.
	}
}

/** The role and company of a job, for events that name it. */
export async function jobLabel(opportunityId: string) {
	const [row] = await db
		.select({ role: tables.careerOpportunity.role, company: tables.careerOpportunity.company })
		.from(tables.careerOpportunity)
		.where(eq(tables.careerOpportunity.id, opportunityId));
	return { role: (row?.role ?? "").slice(0, 120), company: (row?.company ?? "").slice(0, 120) };
}

let lastPurge = 0;

/**
 * Drops runs, their results and events older than the retention window. Runs at most once an hour per process; jobs and
 * documents are never touched, only the history of how they came about.
 */
export async function purgeOldActivity(now = Date.now()) {
	if (now - lastPurge < 3_600_000) return;
	lastPurge = now;
	const cutoff = new Date(now - ACTIVITY_RETENTION_DAYS * 86_400_000);
	try {
		await db.delete(tables.careerEvent).where(lt(tables.careerEvent.createdAt, cutoff));
		await db.delete(tables.careerRun).where(lt(tables.careerRun.createdAt, cutoff));
	} catch {
		// Try again next hour.
		lastPurge = 0;
	}
}
