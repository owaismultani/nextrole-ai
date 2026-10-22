import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryTab } from "@/features/automation/page";

export const Route = createFileRoute("/dashboard/automation/discovery")({
	component: DiscoveryTab,
});
