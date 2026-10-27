import { createFileRoute } from "@tanstack/react-router";
import { DocumentsTab } from "@/features/automation/page";

export const Route = createFileRoute("/dashboard/automation/documents")({
	component: DocumentsTab,
});
