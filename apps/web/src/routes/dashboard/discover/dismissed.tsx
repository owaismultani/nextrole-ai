import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { useDiscover } from "@/features/discover/context";
import { JobsPage } from "@/features/discover/jobs";

const searchSchema = z.object({
	q: z.string().default("").catch(""),
	source: z.string().default("").catch(""),
	match: z.boolean().default(false).catch(false),
	job: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/discover/dismissed")({
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
			mode="dismissed"
			search={search}
			onSearch={(patch) =>
				void navigate({ search: (previous: typeof search) => ({ ...previous, ...patch }), replace: true })
			}
			onOpenSchedule={onScheduleChange}
			deleted={deleted}
		/>
	);
}
