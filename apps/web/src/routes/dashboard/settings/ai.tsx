import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsSettings } from "@/features/settings/ai/page";

export const Route = createFileRoute("/dashboard/settings/ai")({
	component: IntegrationsSettings,
});
