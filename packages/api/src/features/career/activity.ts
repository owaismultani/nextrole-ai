import type {
	CareerEventData,
	CareerEventKind,
	CareerEventLevel,
	RunItemDecision,
} from "@reactive-resume/schema/career";
import { ORPCError } from "@orpc/client";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as tables from "@reactive-resume/db/schema";
import { canonicalOpportunityUrl } from "./scheduling";

const toEvent = (row: typeof tables.careerEvent.$inferSelect, applicationId: string | null = null) => ({
	id: row.id,
	at: row.createdAt,
	kind: row.kind as CareerEventKind,
	level: row.level as CareerEventLevel,
	runId: row.runId,
	opportunityId: row.opportunityId,
	applicationId,
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
				.select({ event: tables.careerEvent, applicationId: tables.careerOpportunity.trackedApplicationId })
				.from(tables.careerEvent)
				.leftJoin(tables.careerOpportunity, eq(tables.careerOpportunity.id, tables.careerEvent.opportunityId))
				.where(where)
				.orderBy(desc(tables.careerEvent.createdAt), desc(tables.careerEvent.id))
				.limit(input.limit ?? 20)
				.offset(input.offset ?? 0),
			db.select({ total: count() }).from(tables.careerEvent).where(where),
		]);
		return { total: counted?.total ?? 0, items: rows.map(({ event, applicationId }) => toEvent(event, applicationId)) };
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
		// A result that became a role (or was already one) points at it, and at its application when tracked.
		const canonical = items.map((item) => canonicalOpportunityUrl(item.url));
		const urls = [...new Set(canonical.filter((url): url is string => Boolean(url)))];
		const roles = urls.length
			? await db
					.select({
						id: tables.careerOpportunity.id,
						url: tables.careerOpportunity.url,
						applicationId: tables.careerOpportunity.trackedApplicationId,
					})
					.from(tables.careerOpportunity)
					.where(and(eq(tables.careerOpportunity.userId, userId), inArray(tables.careerOpportunity.url, urls)))
			: [];
		const byUrl = new Map(roles.map((role) => [role.url, role]));
		return {
			id: run.id,
			createdAt: run.createdAt,
			report: run.report,
			items: items.map((item, index) => {
				const role = byUrl.get(canonical[index] ?? "");
				return {
					url: item.url,
					host: item.host,
					title: item.title,
					decision: item.decision as RunItemDecision,
					source: item.source,
					opportunityId: role?.id ?? null,
					applicationId: role?.applicationId ?? null,
				};
			}),
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
			source: job.source,
			board: job.board,
			searchedVia: job.searchedVia,
			readVia: job.readVia,
			run: run[0] ? { id: run[0].id, at: run[0].at, query: run[0].report.queries[0] ?? "" } : null,
			events: events.map((event) => toEvent(event, job.trackedApplicationId)),
		};
	},

	/** The journey of the job an application was made from, or null when it was added by hand. */
	applicationJourney: async (userId: string, applicationId: string) => {
		const [tracked] = await db
			.select({ id: tables.careerOpportunity.id })
			.from(tables.careerOpportunity)
			.where(
				and(
					eq(tables.careerOpportunity.userId, userId),
					eq(tables.careerOpportunity.trackedApplicationId, applicationId),
				),
			)
			.limit(1);
		// Documents made before the role was linked still point back at it.
		const [prepared] = tracked
			? []
			: await db
					.select({ id: tables.careerPreparation.opportunityId })
					.from(tables.careerPreparation)
					.where(
						and(eq(tables.careerPreparation.userId, userId), eq(tables.careerPreparation.applicationId, applicationId)),
					)
					.limit(1);
		const opportunityId = tracked?.id ?? prepared?.id;
		return opportunityId ? careerActivity.journey(userId, opportunityId) : null;
	},
};
