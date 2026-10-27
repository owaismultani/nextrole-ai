import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { interviewSectionSchema, resolveWorkspaceTab, workspaceTabSchema } from "@reactive-resume/schema/career";
import { Workspace } from "@/features/career/workspace/shell";

export const Route = createFileRoute("/dashboard/applications/$applicationId/{-$tab}")({
	// Sheets and dialogs are URL state, so back, forward, reload and notification links all open them.
	validateSearch: z.object({
		// true: the newest conversation about this job; "new": a fresh one; otherwise that conversation's id.
		coach: z
			.union([z.literal(true), z.string().min(1)])
			.optional()
			.catch(undefined),
		edit: z.enum(["interview", "new-interview"]).optional().catch(undefined),
		version: z.string().min(1).optional().catch(undefined),
		// Practise opens with Speak selected ("Rehearse one answer aloud").
		speak: z.boolean().optional().catch(undefined),
		story: z.string().min(1).optional().catch(undefined),
		// Interviews: the part of the round that is open, and the round.
		section: interviewSectionSchema.optional().catch(undefined),
		round: z.string().min(1).optional().catch(undefined),
		// The offer dialog: "new", or the id of an offer whose terms are being corrected.
		offer: z.string().min(1).optional().catch(undefined),
	}),
	// The workspace's tabs were renamed by purpose: an old address keeps working and lands on the same work.
	beforeLoad: ({ params, search }) => {
		const { tab } = params;
		if (!tab || workspaceTabSchema.safeParse(tab).success) return;
		const resolved = resolveWorkspaceTab(tab);
		if (!resolved) return;
		throw redirect({
			to: "/dashboard/applications/$applicationId/{-$tab}",
			params: { applicationId: params.applicationId, tab: resolved.tab },
			search: { ...search, ...(resolved.section && !search.section ? { section: resolved.section } : {}) },
			replace: true,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { applicationId, tab } = Route.useParams();
	const search = Route.useSearch();
	const parsed = workspaceTabSchema.safeParse(tab);
	return <Workspace applicationId={applicationId} tab={parsed.success ? parsed.data : undefined} search={search} />;
}
