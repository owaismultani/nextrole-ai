import { ORPCError } from "@orpc/client";
import z from "zod";
import { protectedProcedure } from "../../context";
import { jobSourcesDto } from "../../dto/job-sources";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { resolveCompany } from "./boards";
import { jobSourceKeys } from "./credentials";
import { SourceError } from "./http";
import { searchJobs } from "./service";

const keyErrors = {
	FORBIDDEN: { message: "This source's key is managed by the server.", status: 403 },
	PRECONDITION_FAILED: { message: "Credential encryption is not configured.", status: 412 },
};

export const jobSourcesRouter = {
	status: protectedProcedure
		.route({
			method: "GET",
			path: "/integrations/job-sources",
			tags: ["Integrations"],
			operationId: "getJobSourceKeys",
			summary: "List keyed job sources and whether a key is in place",
		})
		.input(z.object({}).optional())
		.output(jobSourcesDto.status.output)
		.handler(({ context }) => jobSourceKeys.status(context.user.id)),
	saveKey: protectedProcedure
		.route({
			method: "PUT",
			path: "/integrations/job-sources/{source}",
			tags: ["Integrations"],
			operationId: "saveJobSourceKey",
			summary: "Save a personal key for a job source",
		})
		.errors(keyErrors)
		.input(jobSourcesDto.saveKey.input)
		.output(jobSourcesDto.saveKey.output)
		.handler(({ context, input }) => jobSourceKeys.save(context.user.id, input.source, input.fields)),
	deleteKey: protectedProcedure
		.route({
			method: "DELETE",
			path: "/integrations/job-sources/{source}",
			tags: ["Integrations"],
			operationId: "deleteJobSourceKey",
			summary: "Remove a personal job source key",
		})
		.input(jobSourcesDto.deleteKey.input)
		.output(jobSourcesDto.deleteKey.output)
		.handler(({ context, input }) => jobSourceKeys.delete(context.user.id, input.source)),
	search: protectedProcedure
		.use(aiRequestRateLimit)
		.route({
			method: "POST",
			path: "/career/job-search",
			tags: ["Career"],
			operationId: "searchJobs",
			summary: "Search job sources with filters",
			description:
				"Runs one search across the chosen job sources, followed company boards and web search, and applies the filters. Returns kept roles first, then those the filters left out with the reason, plus each source's outcome. Nothing is saved.",
		})
		.input(jobSourcesDto.search.input)
		.output(jobSourcesDto.search.output)
		.handler(({ context, input, signal }) => searchJobs(context.user.id, input, signal)),
	resolveCompany: protectedProcedure
		.use(aiRequestRateLimit)
		.route({
			method: "POST",
			path: "/career/companies/resolve",
			tags: ["Career"],
			operationId: "resolveCompanyBoard",
			summary: "Find the company job board behind a careers address",
			description:
				"Reads a careers page or posting address on Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workable or Workday, checks its board answers, and returns the board to follow with its open-role count.",
		})
		.errors({ NOT_FOUND: { message: "No supported company job board at that address.", status: 404 } })
		.input(jobSourcesDto.resolveCompany.input)
		.output(jobSourcesDto.resolveCompany.output)
		.handler(async ({ input, signal }) => {
			const notFound = () =>
				new ORPCError("NOT_FOUND", { message: "No supported company job board at that address.", status: 404 });
			try {
				const company = await resolveCompany(
					input.url,
					AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(30_000)]),
				);
				if (!company) throw notFound();
				return company;
			} catch (error) {
				if (error instanceof SourceError) throw notFound();
				throw error;
			}
		}),
};
