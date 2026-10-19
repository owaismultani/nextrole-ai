import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { AtsCheckerPage } from "@/features/ats-checker/page";
import { getAtsCheckerMeta } from "@/libs/seo";

export const Route = createFileRoute("/_home/ats-checker")({
	component: RouteComponent,
	// Back from signing up with a checked file to import.
	validateSearch: z.object({ import: z.coerce.boolean().optional().catch(undefined) }),
	head: () => {
		const { title, description } = getAtsCheckerMeta();
		return { meta: [{ title }, { name: "description", content: description }] };
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const { import: importPending } = Route.useSearch();

	return <AtsCheckerPage signedIn={Boolean(session)} importPending={importPending === true} />;
}
