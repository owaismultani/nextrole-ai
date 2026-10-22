import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

// Offers moved into Applications; the old address redirects and keeps the compared pair.
export const Route = createFileRoute("/dashboard/career/offers")({
	validateSearch: z.object({
		a: z.string().min(1).optional().catch(undefined),
		b: z.string().min(1).optional().catch(undefined),
	}),
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/dashboard/applications/offers", search, replace: true });
	},
});
