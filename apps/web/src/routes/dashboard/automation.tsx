import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { AutomationPage } from "@/features/automation/page";

export const Route = createFileRoute("/dashboard/automation")({
	// `schedule`: a schedule's id or "new" opens the schedule editor, so links from notifications can open it.
	validateSearch: z.object({ schedule: z.string().min(1).optional().catch(undefined) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { schedule } = Route.useSearch();
	return <AutomationPage schedule={schedule} />;
}
