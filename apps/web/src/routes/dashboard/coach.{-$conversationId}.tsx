import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { CoachPage } from "@/features/career/coach";

export const Route = createFileRoute("/dashboard/coach/{-$conversationId}")({
	// `offers`: saved offer ids to add as context ("Plan what to ask" from Offers).
	validateSearch: z.object({ offers: z.array(z.string()).max(2).optional().catch(undefined) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { conversationId } = Route.useParams();
	const { offers } = Route.useSearch();
	// Not keyed by the conversation: the page keeps a new conversation's chat mounted (and streaming) when the URL moves
	// to its id, and starts a fresh one for any other change.
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Coach</Trans>}
				description={<Trans>Talk through your search, your answers and your offers.</Trans>}
			/>
			<CoachPage conversationId={conversationId} offerIds={offers ?? []} />
		</div>
	);
}
