import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { OffersPage } from "@/features/career/offers";

export const Route = createFileRoute("/dashboard/career/offers")({
	validateSearch: z.object({
		a: z.string().min(1).optional().catch(undefined),
		b: z.string().min(1).optional().catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { a, b } = Route.useSearch();
	return <OffersPage a={a} b={b} />;
}
