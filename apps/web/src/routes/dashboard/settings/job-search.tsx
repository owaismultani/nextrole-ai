import { createFileRoute, redirect } from "@tanstack/react-router";

// Settings became three pages in 6.0; the old address redirects (through 6.0.x).
export const Route = createFileRoute("/dashboard/settings/job-search")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/settings/ai", replace: true });
	},
});
