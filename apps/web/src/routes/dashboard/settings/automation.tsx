import { createFileRoute, redirect } from "@tanstack/react-router";

// Automation moved out of Settings into the main navigation; the old address redirects.
export const Route = createFileRoute("/dashboard/settings/automation")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/automation", replace: true });
	},
});
