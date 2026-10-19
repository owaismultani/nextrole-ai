import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/features/career/knowledge/preferences";

export const Route = createFileRoute("/dashboard/career/knowledge/preferences")({
	component: PreferencesPage,
});
