import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/profile/baseline")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/documents", search: { scope: "baseline" }, replace: true });
	},
});
