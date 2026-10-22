import { createFileRoute } from "@tanstack/react-router";
import { DetailsPage } from "@/features/profile/details";

export const Route = createFileRoute("/dashboard/profile/details")({
	component: DetailsPage,
});
