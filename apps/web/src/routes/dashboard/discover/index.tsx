import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { useDiscover } from "@/features/discover/context";
import { JobsPage } from "@/features/discover/jobs";

const searchSchema = z.object({
	q: z.string().default("").catch(""),
	source: z.string().default("").catch(""),
	match: z.boolean().default(false).catch(false),
	// The selected role, so a link (from a run's results or a notification) opens it.
	job: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/discover/")({
	validateSearch: searchSchema,
	search: { middlewares: [stripSearchParams({ q: "", source: "", match: false })] },
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();
	const { deleted, onScheduleChange } = useDiscover();
	const navigate = useNavigate({ from: Route.fullPath });
	return (
		<JobsPage
			mode="open"
			search={search}
			onSearch={(patch) =>
				void navigate({ search: (previous: typeof search) => ({ ...previous, ...patch }), replace: true })
			}
			onOpenSchedule={onScheduleChange}
			deleted={deleted}
		/>
	);
}
