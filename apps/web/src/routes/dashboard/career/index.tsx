import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { TodayPage } from "@/features/career/today";

export const Route = createFileRoute("/dashboard/career/")({
	// Notifications written before schedules moved to Automation link here with `schedule`.
	validateSearch: z.object({ schedule: z.string().min(1).optional().catch(undefined) }),
	beforeLoad: ({ search }) => {
		if (search.schedule)
			throw redirect({ to: "/dashboard/automation", search: { schedule: search.schedule }, replace: true });
	},
	component: TodayPage,
});
