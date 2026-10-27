import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/knowledge/")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/knowledge/facts", replace: true });
	},
});
