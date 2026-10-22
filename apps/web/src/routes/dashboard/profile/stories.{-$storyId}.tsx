import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/dashboard/profile/stories/{-$storyId}")({
	validateSearch: z.object({ edit: z.boolean().optional().catch(undefined) }),
	beforeLoad: ({ params, search }) => {
		throw redirect({ to: "/dashboard/knowledge/stories/{-$storyId}", params, search, replace: true });
	},
});
