import { Trans } from "@lingui/react/macro";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/dashboard/career")({
	component: CareerLayout,
});

/**
 * Career was a container for unrelated pages; each has moved to Discover, Applications, Profile, Coach or Automation.
 * What remains is the reminders page, until Overview shows them too.
 */
function CareerLayout() {
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Reminders</Trans>}
				description={<Trans>What needs you, and your next interview.</Trans>}
			/>
			<Outlet />
		</div>
	);
}
