import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

// /dashboard opens Overview. An older link that carries a Documents filter keeps it and opens the library.
export const Route = createFileRoute("/dashboard/")({
	validateSearch: z.object({
		scope: z.string().optional().catch(undefined),
		type: z.string().optional().catch(undefined),
		q: z.string().optional().catch(undefined),
		tags: z.array(z.string()).optional().catch(undefined),
		public: z.boolean().optional().catch(undefined),
		sort: z.string().optional().catch(undefined),
		view: z.string().optional().catch(undefined),
		letter: z.string().optional().catch(undefined),
	}),
	beforeLoad: ({ search }) => {
		const filtered = Object.values(search).some((value) => value !== undefined);
		if (filtered) throw redirect({ to: "/dashboard/documents", search: search as never, replace: true });
		throw redirect({ to: "/dashboard/overview", replace: true });
	},
});
