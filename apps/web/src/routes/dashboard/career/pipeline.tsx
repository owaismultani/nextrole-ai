import { createFileRoute, redirect } from "@tanstack/react-router";

// Pipeline became Discover → Search activity; the old address redirects.
export const Route = createFileRoute("/dashboard/career/pipeline")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/discover/activity", replace: true });
	},
});
