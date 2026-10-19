import { createFileRoute, redirect } from "@tanstack/react-router";
import { orpc } from "@/libs/orpc/client";

// A conversation opens on its document, with the assistant showing it; without the document, Documents.
export const Route = createFileRoute("/agent/$threadId")({
	loader: async ({ params, context }) => {
		const detail = await context.queryClient
			.fetchQuery(orpc.agent.threads.get.queryOptions({ input: { id: params.threadId } }))
			.catch(() => null);
		const document = detail?.document;
		if (document?.kind === "letter")
			throw redirect({
				to: "/builder/letter/$coverLetterId",
				params: { coverLetterId: document.id },
				search: { assistant: params.threadId },
				replace: true,
			});
		if (document?.kind === "resume")
			throw redirect({
				to: "/builder/$resumeId",
				params: { resumeId: document.id },
				search: { assistant: params.threadId },
				replace: true,
			});
		throw redirect({ to: "/dashboard", replace: true });
	},
});
