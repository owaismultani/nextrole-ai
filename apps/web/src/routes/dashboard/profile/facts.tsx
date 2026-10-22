import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/dashboard/profile/facts")({
	validateSearch: z.object({ highlight: z.string().min(1).optional().catch(undefined) }),
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/dashboard/knowledge/facts", search, replace: true });
	},
});
