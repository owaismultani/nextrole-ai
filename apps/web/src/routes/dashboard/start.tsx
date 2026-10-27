import { createFileRoute } from "@tanstack/react-router";
import { SetupPage } from "@/features/setup/page";

export const Route = createFileRoute("/dashboard/start")({
	component: SetupPage,
});
