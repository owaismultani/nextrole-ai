import { createFileRoute } from "@tanstack/react-router";
import { AutomationSettings } from "@/features/settings/automation/page";

export const Route = createFileRoute("/dashboard/settings/automation")({
	component: AutomationSettings,
});
