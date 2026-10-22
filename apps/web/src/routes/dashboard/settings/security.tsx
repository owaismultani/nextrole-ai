import { createFileRoute } from "@tanstack/react-router";
import { SecuritySection } from "@/features/settings/account/security";

export const Route = createFileRoute("/dashboard/settings/security")({
	component: SecuritySection,
});
