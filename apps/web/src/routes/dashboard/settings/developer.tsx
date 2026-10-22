import { createFileRoute } from "@tanstack/react-router";
import { DeveloperSettings } from "@/features/settings/ai/page";

export const Route = createFileRoute("/dashboard/settings/developer")({
	component: DeveloperSettings,
});
