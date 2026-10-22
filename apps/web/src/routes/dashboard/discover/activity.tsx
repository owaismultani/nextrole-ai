import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { SearchActivityPage } from "@/features/discover/activity";

export const Route = createFileRoute("/dashboard/discover/activity")({
	// `run`: one discovery run to show first, linked from a role.
	validateSearch: z.object({ run: z.string().min(1).optional().catch(undefined) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { run } = Route.useSearch();
	return <SearchActivityPage run={run} />;
}
