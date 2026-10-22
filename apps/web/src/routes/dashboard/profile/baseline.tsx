import { createFileRoute } from "@tanstack/react-router";
import { BaselinePage } from "@/features/profile/baseline";

export const Route = createFileRoute("/dashboard/profile/baseline")({
	component: BaselinePage,
});
