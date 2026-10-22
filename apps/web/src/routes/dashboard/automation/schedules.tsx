import { createFileRoute } from "@tanstack/react-router";
import { SchedulesTab } from "@/features/automation/page";

export const Route = createFileRoute("/dashboard/automation/schedules")({
	component: SchedulesTab,
});
