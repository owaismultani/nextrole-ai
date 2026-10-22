import type { CareerEventData, CareerEventKind, CareerEventLevel } from "@reactive-resume/schema/career";
import { ORPCError } from "@orpc/client";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";

const toEvent = (row: typeof tables.careerEvent.$inferSelect) => ({
	id: row.id,
	at: row.createdAt,
	kind: row.kind as CareerEventKind,
	level: row.level as CareerEventLevel,
	runId: row.runId,
	opportunityId: row.opportunityId,
	data: row.data as CareerEventData,
});

export const careerActivity = {
	/** The pipeline's recent history, newest first. `problems` keeps only warnings and errors. */
	list: async (
		userId: string,
		input: { limit?: number | undefined; offset?: number | undefined; problems?: boolean | undefined },
	) => {
		const where = and(
			eq(tables.careerEvent.userId, userId),
			input.problems ? inArray(tables.careerEvent.level, ["warn", "error"]) : undefined,
		);
		const [rows, [counted]] = await Promise.all([
			db
				.select()
				.from(tables.careerEvent)
				.where(where)
				.orderBy(desc(tables.careerEvent.createdAt), desc(tables.careerEvent.id))
				.limit(input.limit ?? 20)
				.offset(input.offset ?? 0),
			db.select({ total: count() }).from(tables.careerEvent).where(where),
		]);
		return { total: counted?.total ?? 0, items: rows.map(toEvent) };
	},

	/** Every search result of one run and what became of it. */
	runDetail: async (userId: string, runId: string) => {
		const [run] = await db
			.select()
			.from(tables.careerRun)
			.where(and(eq(tables.careerRun.id, runId), eq(tables.careerRun.userId, userId)));
		if (!run) throw new ORPCError("NOT_FOUND");
		const items = await db
			.select()
			.from(tables.careerRunItem)
			.where(and(eq(tables.careerRunItem.runId, runId), eq(tables.careerRunItem.userId, userId)))
			.orderBy(asc(tables.careerRunItem.decision), asc(tables.careerRunItem.host));
		return {
			id: run.id,
			createdAt: run.createdAt,
			report: run.report,
			items: items.map((item) => ({
				url: item.url,
				host: item.host,
				title: item.title,
				decision: item.decision as "new" | "known" | "rejected" | "unreadable" | "invalid",
			})),
		};
	},

	/** One job's story: the run that found it, then every step taken for it, oldest first. */
	journey: async (userId: string, opportunityId: string) => {
		const [job] = await db
			.select()
			.from(tables.careerOpportunity)
			.where(and(eq(tables.careerOpportunity.id, opportunityId), eq(tables.careerOpportunity.userId, userId)));
		if (!job) throw new ORPCError("NOT_FOUND");
		const [events, run] = await Promise.all([
			db
				.select()
				.from(tables.careerEvent)
				.where(and(eq(tables.careerEvent.opportunityId, opportunityId), eq(tables.careerEvent.userId, userId)))
				.orderBy(asc(tables.careerEvent.createdAt), asc(tables.careerEvent.id)),
			job.runId
				? db
						.select({ id: tables.careerRun.id, at: tables.careerRun.createdAt, report: tables.careerRun.report })
						.from(tables.careerRun)
						.where(and(eq(tables.careerRun.id, job.runId), eq(tables.careerRun.userId, userId)))
				: [],
		]);
		return {
			opportunityId: job.id,
			role: job.role,
			company: job.company,
			url: job.url,
			applicationId: job.trackedApplicationId,
			foundAt: job.firstSeenAt,
			run: run[0] ? { id: run[0].id, at: run[0].at, query: run[0].report.queries[0] ?? "" } : null,
			events: events.map(toEvent),
		};
	},
};
