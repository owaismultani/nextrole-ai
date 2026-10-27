import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

// Career was split up: reminders and tasks are in Overview. Notifications written before schedules moved to Automation
// link here with `schedule`, so those land on the schedule.
export const Route = createFileRoute("/dashboard/career/")({
	validateSearch: z.object({ schedule: z.string().min(1).optional().catch(undefined) }),
	beforeLoad: ({ search }) => {
		if (search.schedule)
			throw redirect({ to: "/dashboard/automation", search: { schedule: search.schedule }, replace: true });
		throw redirect({ to: "/dashboard/overview", replace: true });
	},
});
