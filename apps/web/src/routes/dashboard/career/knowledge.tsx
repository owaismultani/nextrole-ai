import { createFileRoute, redirect } from "@tanstack/react-router";

// Knowledge moved into Profile; the section addresses below it redirect too.
export const Route = createFileRoute("/dashboard/career/knowledge")({
	beforeLoad: ({ location }) => {
		if (location.pathname.replace(/\/$/, "") === "/dashboard/career/knowledge")
			throw redirect({ to: "/dashboard/knowledge/facts", replace: true });
	},
});
