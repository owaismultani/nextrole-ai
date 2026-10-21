import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/features/overview/page";

export const Route = createFileRoute("/dashboard/overview")({
	component: OverviewPage,
});
