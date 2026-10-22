import { createFileRoute, redirect } from "@tanstack/react-router";

// Profile was dissolved: its parts live where they are used. This address opens Knowledge.
export const Route = createFileRoute("/dashboard/profile/")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/knowledge/facts", replace: true });
	},
});
