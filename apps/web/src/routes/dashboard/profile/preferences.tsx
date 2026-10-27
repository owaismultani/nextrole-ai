import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/profile/preferences")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/discover", search: { preferences: true }, replace: true });
	},
});
