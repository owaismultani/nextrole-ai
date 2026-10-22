import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

// Coach became a top-level page; the old address redirects and keeps the conversation and any offers.
export const Route = createFileRoute("/dashboard/career/coach/{-$conversationId}")({
	validateSearch: z.object({ offers: z.array(z.string()).max(2).optional().catch(undefined) }),
	beforeLoad: ({ params, search }) => {
		throw redirect({
			to: "/dashboard/coach/{-$conversationId}",
			params: { conversationId: params.conversationId },
			search,
			replace: true,
		});
	},
});
