import { createFileRoute, redirect } from "@tanstack/react-router";

// Automation opens on Discovery; a link that carries a schedule keeps it.
export const Route = createFileRoute("/dashboard/automation/")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/dashboard/automation/discovery", search: { schedule: search.schedule }, replace: true });
	},
});
