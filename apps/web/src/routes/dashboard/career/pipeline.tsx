import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/features/career/pipeline";

export const Route = createFileRoute("/dashboard/career/pipeline")({
	component: PipelinePage,
});
