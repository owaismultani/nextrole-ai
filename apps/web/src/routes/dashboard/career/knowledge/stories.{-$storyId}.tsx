import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { StoriesPage } from "@/features/career/knowledge/stories";

export const Route = createFileRoute("/dashboard/career/knowledge/stories/{-$storyId}")({
	// `edit`: the story editor; with no story id it's a new story.
	validateSearch: z.object({ edit: z.boolean().optional().catch(undefined) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { storyId } = Route.useParams();
	const { edit } = Route.useSearch();
	return <StoriesPage storyId={storyId} edit={edit ?? false} />;
}
