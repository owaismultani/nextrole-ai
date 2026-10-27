import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import z from "zod";
import { Icon } from "@reactive-resume/ui/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { OffersPage } from "@/features/career/offers";

export const Route = createFileRoute("/dashboard/applications/offers")({
	validateSearch: z.object({
		a: z.string().min(1).optional().catch(undefined),
		b: z.string().min(1).optional().catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { a, b } = Route.useSearch();
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				back={
					<Link to="/dashboard/applications" className="inline-flex items-center gap-1 text-sm text-ink-2">
						<Icon name="caret-left" size={18} />
						<Trans>Applications</Trans>
					</Link>
				}
				title={<Trans>Offers</Trans>}
				description={<Trans>Compare saved offers side by side. Add an offer from its application.</Trans>}
			/>
			<OffersPage a={a} b={b} />
		</div>
	);
}
