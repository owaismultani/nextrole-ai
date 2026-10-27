import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/career/knowledge/preferences")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/discover", search: { preferences: true }, replace: true });
	},
});
