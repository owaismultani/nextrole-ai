import z from "zod";
import {
	careerAutomationInputSchema,
	careerFactInputSchema,
	careerProfileDataSchema,
	careerScheduleInputSchema,
	careerSetupLaunchSchema,
	careerScopeSchema,
	careerStoryInputSchema,
	careerWorkspaceSchema,
	generateTaskSchema,
} from "@reactive-resume/schema/career";
import { protectedProcedure } from "../../context";
import {
	careerAutomationSchema,
	careerFactSchema,
	careerBaselineReportSchema,
	careerOverviewSchema,
	careerSearchPreviewSchema,
	careerSetupStateSchema,
	careerPreparationJobSchema,
	careerRunListSchema,
	careerNotificationSchema,
	careerOpportunitySchema,
	careerScheduleListItemSchema,
	careerScheduleSchema,
	careerStorySchema,
	savedItemSchema,
} from "../../dto/career";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { paginationShape } from "../../pagination";
import { careerAutomation } from "./automation";
import { generateCareer } from "./generate";
import { careerJobs } from "./jobs";
import { careerOverview } from "./overview";
import { careerService } from "./service";
import { careerSetup } from "./setup";
import { careerVoiceRouter } from "./voice";

const id = z.object({ id: z.string().min(1) });
const applicationInput = z.object({ applicationId: z.string().min(1) });
const savedItemOutput = savedItemSchema.extend({
	application: z.object({ company: z.string(), role: z.string() }).nullable(),
	outdated: z.boolean(),
});

export const careerRouter = {
	voice: careerVoiceRouter,
	schedules: protectedProcedure
		.route({
			method: "GET",
			path: "/career/schedules",
			tags: ["Career"],
			operationId: "listCareerSchedules",
			summary: "List career schedules",
		})
		.input(z.object({}))
		.output(z.array(careerScheduleListItemSchema))
		.handler(({ context }) => careerJobs.list(context.user.id)),
	saveSchedule: protectedProcedure
		.route({
			method: "POST",
			path: "/career/schedules",
			tags: ["Career"],
			operationId: "saveCareerSchedule",
			summary: "Save a career schedule",
		})
		.input(careerScheduleInputSchema.extend({ id: z.string().optional() }))
		.output(careerScheduleSchema)
		.handler(({ context, input }) => careerJobs.save(context.user.id, input)),
	runSchedule: protectedProcedure
		.route({
			method: "POST",
			path: "/career/schedules/{id}/run",
			tags: ["Career"],
			operationId: "runCareerSchedule",
			summary: "Run a discovery schedule now",
			description:
				"Queues one discovery run that starts on the next scheduler tick, even if the schedule is paused. The schedule's own timing is unchanged. Returns queued: false when a run is already queued or running.",
		})
		.input(id)
		.output(z.object({ queued: z.boolean() }))
		.handler(({ context, input }) => careerJobs.runNow(context.user.id, input.id)),
	setScheduleEnabled: protectedProcedure
		.route({
			method: "POST",
			path: "/career/schedules/{id}/enabled",
			tags: ["Career"],
			operationId: "setCareerScheduleEnabled",
			summary: "Pause or resume a discovery schedule",
			description:
				"Pausing cancels queued runs and keeps the schedule's settings. Resuming continues on the schedule's cadence from its next future run.",
		})
		.input(id.extend({ enabled: z.boolean() }))
		.output(careerScheduleSchema)
		.handler(({ context, input }) => careerJobs.setEnabled(context.user.id, input.id, input.enabled)),
	automation: protectedProcedure
		.route({
			method: "GET",
			path: "/career/automation",
			tags: ["Career"],
			operationId: "getCareerAutomation",
			summary: "Get automation settings",
			description:
				"Discovery (its query, interval and on/off state live on the discovery schedule), automatic document preparation, the baseline resume, the daily generation limit and today's use of it.",
		})
		.input(z.object({}))
		.output(careerAutomationSchema)
		.handler(({ context }) => careerAutomation.get(context.user.id)),
	saveAutomation: protectedProcedure
		.route({
			method: "PUT",
			path: "/career/automation",
			tags: ["Career"],
			operationId: "saveCareerAutomation",
			summary: "Save automation settings",
			description:
				"Turning discovery on queues the first run at once. Turning a document type off cancels its waiting automatic work; finished documents stay. Turning one on affects future discoveries only.",
		})
		.input(careerAutomationInputSchema)
		.output(careerAutomationSchema)
		.handler(({ context, input }) => careerAutomation.save(context.user.id, input)),
	setup: protectedProcedure
		.route({
			method: "GET",
			path: "/career/setup",
			tags: ["Career"],
			operationId: "getCareerSetup",
			summary: "Get first-run setup state",
			description:
				"Where guided setup stands: the confirmed baseline resume, whether a search and an AI connection exist, and the discovery schedule. Derived from what is configured.",
		})
		.input(z.object({}))
		.output(careerSetupStateSchema)
		.handler(({ context }) => careerSetup.get(context.user.id)),
	validateBaseline: protectedProcedure
		.route({
			method: "POST",
			path: "/career/setup/baseline/check",
			tags: ["Career"],
			operationId: "checkCareerBaseline",
			summary: "Check a resume as a baseline",
			description:
				"Completeness checks (contact, summary, dated and detailed experience, education, skills) plus the ATS score. Warnings never block confirming.",
		})
		.input(z.object({ resumeId: z.string().min(1) }))
		.output(careerBaselineReportSchema)
		.handler(({ context, input }) => careerSetup.validateBaseline(context.user.id, input.resumeId)),
	confirmBaseline: protectedProcedure
		.route({
			method: "POST",
			path: "/career/setup/baseline",
			tags: ["Career"],
			operationId: "confirmCareerBaseline",
			summary: "Confirm the baseline resume",
			description:
				"Records the person's choice of baseline resume. Automation tailors documents from it and never changes it.",
		})
		.input(z.object({ resumeId: z.string().min(1) }))
		.output(careerSetupStateSchema)
		.handler(({ context, input }) => careerSetup.confirmBaseline(context.user.id, input.resumeId)),
	previewSearch: protectedProcedure
		.use(aiRequestRateLimit)
		.route({
			method: "POST",
			path: "/career/setup/preview",
			tags: ["Career"],
			operationId: "previewCareerSearch",
			summary: "Preview a discovery search",
			description:
				"Runs the search once with the person's search connection and returns up to eight results. Nothing is saved.",
		})
		.input(z.object({ query: z.string().trim().min(3).max(500) }))
		.output(careerSearchPreviewSchema)
		.handler(({ context, input }) => careerSetup.previewSearch(context.user.id, input.query)),
	skipSetup: protectedProcedure
		.route({
			method: "POST",
			path: "/career/setup/skip",
			tags: ["Career"],
			operationId: "skipCareerSetup",
			summary: "Skip guided setup",
		})
		.input(z.object({}))
		.output(careerSetupStateSchema)
		.handler(({ context }) => careerSetup.skip(context.user.id)),
	launchSetup: protectedProcedure
		.route({
			method: "POST",
			path: "/career/setup/launch",
			tags: ["Career"],
			operationId: "launchCareerSetup",
			summary: "Finish guided setup and start discovery",
			description:
				"Saves document settings and the discovery schedule (reusing an existing one), starts the first search at once and marks setup done. Requires a confirmed baseline.",
		})
		.input(careerSetupLaunchSchema)
		.output(careerSetupStateSchema)
		.handler(({ context, input }) => careerSetup.launch(context.user.id, input)),
	overview: protectedProcedure
		.route({
			method: "GET",
			path: "/career/overview",
			tags: ["Career"],
			operationId: "getCareerOverview",
			summary: "Get the job-search overview",
			description:
				"One read for the dashboard: what needs attention, a funnel from discovered jobs to offers, discovery health over the window, automation use and upcoming interviews. `days` (7, 30 or 90) bounds the funnel and the discovery trend.",
		})
		.input(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }))
		.output(careerOverviewSchema)
		.handler(({ context, input }) => careerOverview(context.user.id, input.days)),
	runs: protectedProcedure
		.route({
			method: "GET",
			path: "/career/runs",
			tags: ["Career"],
			operationId: "listCareerRuns",
			summary: "List discovery runs",
			description:
				"Discovery runs, newest first, with what each found and the jobs it led to, including the resume and cover letter made for each. Paginated with limit (default 10) and offset.",
		})
		.input(z.object(paginationShape))
		.output(careerRunListSchema)
		.handler(({ context, input }) => careerAutomation.runs(context.user.id, input)),
	preparations: protectedProcedure
		.route({
			method: "GET",
			path: "/career/preparations",
			tags: ["Career"],
			operationId: "listCareerPreparations",
			summary: "List document preparation",
		})
		.input(z.object({}))
		.output(z.array(careerPreparationJobSchema))
		.handler(({ context }) => careerAutomation.preparations(context.user.id)),
	prepareDocuments: protectedProcedure
		.route({
			method: "POST",
			path: "/career/preparations",
			tags: ["Career"],
			operationId: "prepareCareerDocuments",
			summary: "Prepare documents for chosen jobs",
			description:
				"Queues a tailored resume and/or cover letter for existing discovered jobs, using the baseline resume. This is the only way existing jobs are processed.",
		})
		.input(
			z.object({ opportunityIds: z.array(z.string().min(1)).min(1).max(25), resume: z.boolean(), letter: z.boolean() }),
		)
		.output(z.object({ queued: z.number() }))
		.handler(({ context, input }) => careerAutomation.prepare(context.user.id, input)),
	retryPreparation: protectedProcedure
		.route({
			method: "POST",
			path: "/career/preparations/{id}/retry",
			tags: ["Career"],
			operationId: "retryCareerPreparation",
			summary: "Retry a document step",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerAutomation.retry(context.user.id, input.id)),
	regeneratePreparation: protectedProcedure
		.route({
			method: "POST",
			path: "/career/preparations/{id}/regenerate",
			tags: ["Career"],
			operationId: "regenerateCareerPreparation",
			summary: "Regenerate a document",
			description: "Makes a new document from the current baseline and posting. The earlier one is never overwritten.",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerAutomation.regenerate(context.user.id, input.id)),
	deleteSchedule: protectedProcedure
		.route({
			method: "DELETE",
			path: "/career/schedules/{id}",
			tags: ["Career"],
			operationId: "deleteCareerSchedule",
			summary: "Delete a career schedule",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerJobs.delete(context.user.id, input.id)),
	notifications: protectedProcedure
		.route({
			method: "GET",
			path: "/career/notifications",
			tags: ["Career"],
			operationId: "listCareerNotifications",
			summary: "List career notifications",
		})
		.input(z.object({}))
		.output(z.array(careerNotificationSchema))
		.handler(({ context }) => careerJobs.notifications(context.user.id)),
	markNotificationRead: protectedProcedure
		.route({
			method: "POST",
			path: "/career/notifications/{id}/read",
			tags: ["Career"],
			operationId: "readCareerNotification",
			summary: "Mark a career notification as read",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerJobs.markRead(context.user.id, input.id)),
	opportunities: protectedProcedure
		.route({
			method: "GET",
			path: "/career/opportunities",
			tags: ["Career"],
			operationId: "listCareerOpportunities",
			summary: "List discovered opportunities",
		})
		.input(z.object({}))
		.output(z.array(careerOpportunitySchema))
		.handler(({ context }) => careerJobs.opportunities(context.user.id)),
	dismissOpportunity: protectedProcedure
		.route({
			method: "DELETE",
			path: "/career/opportunities/{id}",
			tags: ["Career"],
			operationId: "dismissCareerOpportunity",
			summary: "Dismiss a discovered opportunity",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerJobs.dismissOpportunity(context.user.id, input.id)),
	trackOpportunity: protectedProcedure
		.route({
			method: "POST",
			path: "/career/opportunities/{id}/track",
			tags: ["Career"],
			operationId: "trackCareerOpportunity",
			summary: "Track a discovered opportunity",
			description: "Creates an application at Saved with the posting link, summary and the preferences it matched.",
		})
		.input(id)
		.output(applicationInput)
		.handler(({ context, input }) => careerService.trackOpportunity(context.user.id, input.id)),
	profile: protectedProcedure
		.route({
			method: "GET",
			path: "/career/profile",
			tags: ["Career"],
			operationId: "getCareerProfile",
			summary: "Get career preferences",
		})
		.input(z.object({}).optional())
		.output(careerProfileDataSchema)
		.handler(({ context }) => careerService.profile(context.user.id)),
	saveProfile: protectedProcedure
		.route({
			method: "PUT",
			path: "/career/profile",
			tags: ["Career"],
			operationId: "saveCareerProfile",
			summary: "Save career preferences",
		})
		.input(careerProfileDataSchema)
		.output(careerProfileDataSchema)
		.handler(({ context, input }) => careerService.saveProfile(context.user.id, input)),
	facts: protectedProcedure
		.route({
			method: "GET",
			path: "/career/facts",
			tags: ["Career"],
			operationId: "listCareerFacts",
			summary: "List career facts",
		})
		.input(
			careerScopeSchema.extend({
				query: z.string().max(500).optional(),
				all: z.boolean().optional().describe("Every fact, shared and private to any application."),
			}),
		)
		.output(z.array(careerFactSchema))
		.handler(({ context, input }) => careerService.facts({ userId: context.user.id, ...input })),
	saveFact: protectedProcedure
		.route({
			method: "POST",
			path: "/career/facts",
			tags: ["Career"],
			operationId: "saveCareerFact",
			summary: "Save a career fact",
		})
		.input(careerFactInputSchema)
		.output(careerFactSchema.omit({ usedBy: true, company: true }).nullable())
		.handler(({ context, input }) => careerService.saveFact(context.user.id, input)),
	updateFact: protectedProcedure
		.route({
			method: "PATCH",
			path: "/career/facts/{id}",
			tags: ["Career"],
			operationId: "updateCareerFact",
			summary: "Update a career fact",
		})
		.input(
			id.extend({
				text: z.string().trim().min(1).max(2000).optional(),
				status: z.enum(["active", "excluded"]).optional(),
				share: z.boolean().optional(),
			}),
		)
		.output(z.void())
		.handler(async ({ context, input }) => {
			await careerService.updateFact(context.user.id, input);
		}),
	forgetFact: protectedProcedure
		.route({
			method: "DELETE",
			path: "/career/facts/{id}",
			tags: ["Career"],
			operationId: "forgetCareerFact",
			summary: "Forget a career fact",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerService.forgetFact(context.user.id, input.id)),
	stories: protectedProcedure
		.route({
			method: "GET",
			path: "/career/stories",
			tags: ["Career"],
			operationId: "listCareerStories",
			summary: "List career stories",
		})
		.input(careerScopeSchema)
		.output(z.array(careerStorySchema))
		.handler(({ context, input }) => careerService.stories({ userId: context.user.id, ...input })),
	saveStory: protectedProcedure
		.route({
			method: "POST",
			path: "/career/stories",
			tags: ["Career"],
			operationId: "saveCareerStory",
			summary: "Save a career story",
		})
		.input(careerStoryInputSchema.extend({ id: z.string().optional() }))
		.output(careerStorySchema)
		.handler(({ context, input: { id, ...input } }) => careerService.saveStory(context.user.id, input, id)),
	deleteStory: protectedProcedure
		.route({
			method: "DELETE",
			path: "/career/stories/{id}",
			tags: ["Career"],
			operationId: "deleteCareerStory",
			summary: "Delete a career story",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerService.deleteStory(context.user.id, input.id)),
	savedItems: protectedProcedure
		.route({
			method: "GET",
			path: "/career/saved",
			tags: ["Career"],
			operationId: "listCareerSavedItems",
			summary: "List saved career work",
		})
		.input(
			z.object({
				applicationId: z.string().min(1).optional(),
				kind: z.enum(["fit", "briefing", "practice", "debrief", "answers", "reply", "offer"]).optional(),
			}),
		)
		.output(z.array(savedItemOutput))
		.handler(({ context, input }) => careerService.savedItems({ userId: context.user.id, ...input })),
	deleteSavedItem: protectedProcedure
		.route({
			method: "DELETE",
			path: "/career/saved/{id}",
			tags: ["Career"],
			operationId: "deleteCareerSavedItem",
			summary: "Delete saved career work",
		})
		.input(id)
		.output(z.void())
		.handler(({ context, input }) => careerService.deleteSavedItem(context.user.id, input.id)),
	generate: protectedProcedure
		.use(aiRequestRateLimit)
		.route({
			method: "POST",
			path: "/career/generate",
			tags: ["Career"],
			operationId: "generateCareerWork",
			summary: "Generate AI work for an application",
			description:
				"Asks the default AI connection for one structured piece of work for an application (fit check, briefing, practice feedback, debrief review, employer message, answer draft). Everything but answer drafts is saved.",
		})
		.input(applicationInput.extend({ locale: z.string().max(20).default("en-US"), task: generateTaskSchema }))
		.output(
			z.object({
				item: savedItemSchema.nullable(),
				answer: z.object({ text: z.string(), factIds: z.array(z.string()) }).nullable(),
			}),
		)
		.handler(({ context, input, signal }) =>
			generateCareer({ userId: context.user.id, ...input, ...(signal ? { signal } : {}) }),
		),
	applyReply: protectedProcedure
		.route({
			method: "POST",
			path: "/career/saved/{id}/apply",
			tags: ["Career"],
			operationId: "applyCareerReply",
			summary: "Apply suggested changes from a message",
		})
		.input(id.extend({ changes: z.array(z.number().int().min(0)).max(4) }))
		.output(z.void())
		.handler(({ context, input }) => careerService.applyReply(context.user.id, input.id, input.changes)),
	workspace: protectedProcedure
		.route({
			method: "GET",
			path: "/career/workspace/{applicationId}",
			tags: ["Career"],
			operationId: "getCareerWorkspace",
			summary: "Get an application workspace",
		})
		.input(applicationInput)
		.output(careerWorkspaceSchema)
		.handler(({ context, input }) => careerService.workspace(context.user.id, input.applicationId)),
	saveWorkspace: protectedProcedure
		.route({
			method: "PATCH",
			path: "/career/workspace/{applicationId}",
			tags: ["Career"],
			operationId: "saveCareerWorkspace",
			summary: "Save an application workspace",
		})
		.input(
			applicationInput
				.extend(careerWorkspaceSchema.partial().shape)
				.extend({ expected: careerWorkspaceSchema.partial() }),
		)
		.output(careerWorkspaceSchema)
		.handler(({ context, input: { applicationId, expected, ...patch } }) =>
			careerService.saveWorkspace(context.user.id, applicationId, patch, expected),
		),
	submitApplication: protectedProcedure
		.route({
			method: "POST",
			path: "/career/workspace/{applicationId}/submit",
			tags: ["Career"],
			operationId: "submitCareerApplication",
			summary: "Mark an application as submitted",
		})
		.input(
			applicationInput.extend({
				answers: careerWorkspaceSchema.shape.answers,
				expectedAnswers: careerWorkspaceSchema.shape.answers,
			}),
		)
		.output(z.void())
		.handler(({ context, input }) =>
			careerService.submitApplication(context.user.id, input.applicationId, input.answers, input.expectedAnswers),
		),
	snapshotAnswers: protectedProcedure
		.route({
			method: "POST",
			path: "/career/workspace/{applicationId}/answers",
			tags: ["Career"],
			operationId: "snapshotCareerAnswers",
			summary: "Save the answers sent with an application",
			description: "Saves the workspace's answers as sent, after the application is marked as applied.",
		})
		.input(applicationInput)
		.output(z.void())
		.handler(({ context, input }) => careerService.snapshotAnswers(context.user.id, input.applicationId)),
};
