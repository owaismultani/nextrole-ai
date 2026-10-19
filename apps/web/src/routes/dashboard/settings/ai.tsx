import { createFileRoute } from "@tanstack/react-router";
import { AiDeveloperSettings } from "@/features/settings/ai/page";

export const Route = createFileRoute("/dashboard/settings/ai")({
	component: AiDeveloperSettings,
});
