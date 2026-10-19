import { createFileRoute } from "@tanstack/react-router";
import { PreferencesSettings } from "@/features/settings/preferences";

export const Route = createFileRoute("/dashboard/settings/preferences")({
	component: PreferencesSettings,
});
