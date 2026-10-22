import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleSheet } from "@/features/career/schedule-sheet";
import { useScheduleSheet } from "@/features/career/schedule-state";
import { DiscoverProvider } from "@/features/discover/context";
import { SearchHeader } from "@/features/discover/search-header";

export const Route = createFileRoute("/dashboard/discover")({
	// `schedule`: a schedule's id or "new:discovery" opens the search editor, so links from notifications can open it.
	validateSearch: z.object({ schedule: z.string().min(1).optional().catch(undefined) }),
	component: DiscoverLayout,
});

/** Discover: the roles discovery found, and a record of every search. The search itself is edited in the same place Automation edits it. */
function DiscoverLayout() {
	const { schedule } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const matchRoute = useMatchRoute();
	const sheet = useScheduleSheet(
		schedule,
		(next, replace) =>
			void navigate({
				search: (previous: { schedule?: string | undefined }) => ({ ...previous, schedule: next }),
				replace,
			}),
	);
	const activity = Boolean(matchRoute({ to: "/dashboard/discover/activity" }));

	return (
		<DiscoverProvider value={{ deleted: sheet.deleted, onScheduleChange: sheet.onScheduleChange }}>
			<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
				<PageHeader
					title={<Trans>Discover</Trans>}
					description={<Trans>Roles found by your saved search. Nothing is applied for until you choose.</Trans>}
				/>
				<SearchHeader deleted={sheet.deleted} onEdit={sheet.onScheduleChange} />
				<Tabs
					value={activity ? "activity" : "jobs"}
					className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0"
				>
					<TabsList variant="line" aria-label={t`Discover`}>
						<TabsTrigger
							value="jobs"
							nativeButton={false}
							render={<Link to="/dashboard/discover" aria-current={activity ? undefined : "page"} />}
						>
							<Icon name="briefcase" size={18} />
							<Trans>Jobs</Trans>
						</TabsTrigger>
						<TabsTrigger
							value="activity"
							nativeButton={false}
							render={<Link to="/dashboard/discover/activity" aria-current={activity ? "page" : undefined} />}
						>
							<Icon name="list-checks" size={18} />
							<Trans>Search activity</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Outlet />
				<ScheduleSheet schedule={schedule} onScheduleChange={sheet.onScheduleChange} onDelete={sheet.deleteSchedule} />
			</div>
		</DiscoverProvider>
	);
}
