import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesPage } from "@/features/career/knowledge/preferences";
import { ScheduleSheet } from "@/features/career/schedule-sheet";
import { useScheduleSheet } from "@/features/career/schedule-state";
import { DiscoverProvider } from "@/features/discover/context";
import { SearchHeader } from "@/features/discover/search-header";

export const Route = createFileRoute("/dashboard/discover")({
	// `schedule`: a schedule's id or "new:discovery" opens the search editor, so links from notifications can open it.
	validateSearch: z.object({
		schedule: z.string().min(1).optional().catch(undefined),
		// Opens the job preferences panel, so links (and the old Profile address) can open it.
		preferences: z.boolean().optional().catch(undefined),
	}),
	component: DiscoverLayout,
});

/** Discover: the roles discovery found, and a record of every search. The search itself is edited in the same place Automation edits it. */
function DiscoverLayout() {
	const { schedule, preferences } = Route.useSearch();
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
	const dismissed = Boolean(matchRoute({ to: "/dashboard/discover/dismissed" }));

	return (
		<DiscoverProvider value={{ deleted: sheet.deleted, onScheduleChange: sheet.onScheduleChange }}>
			<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
				<PageHeader
					actions={
						<Button
							variant="secondary"
							onClick={() =>
								void navigate({ search: (previous: object) => ({ ...previous, preferences: true }), replace: true })
							}
						>
							<Icon name="sliders-horizontal" size={18} />
							<Trans>Job preferences</Trans>
						</Button>
					}
					title={<Trans>Discover</Trans>}
					description={<Trans>Find your next role. Every opportunity stays connected to its source.</Trans>}
				/>
				<SearchHeader deleted={sheet.deleted} onEdit={sheet.onScheduleChange} />
				<Tabs
					value={activity ? "activity" : dismissed ? "dismissed" : "jobs"}
					className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0"
				>
					<TabsList variant="line" aria-label={t`Discover`}>
						<TabsTrigger
							value="jobs"
							nativeButton={false}
							render={<Link to="/dashboard/discover" aria-current={activity || dismissed ? undefined : "page"} />}
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
						<TabsTrigger
							value="dismissed"
							nativeButton={false}
							render={<Link to="/dashboard/discover/dismissed" aria-current={dismissed ? "page" : undefined} />}
						>
							<Icon name="eye-slash" size={18} />
							<Trans>Dismissed</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Outlet />
				<Sheet
					open={preferences === true}
					onOpenChange={(next) =>
						!next &&
						void navigate({ search: (previous: object) => ({ ...previous, preferences: undefined }), replace: true })
					}
				>
					<SheetContent side="right" showCloseButton={false} className="gap-0 data-[side=right]:sm:max-w-[560px]">
						<div className="flex items-center gap-3 border-b border-line ps-[22px] pe-3 pt-[18px] pb-3.5">
							<div className="grid min-w-0 flex-1 gap-0.5">
								<SheetTitle>
									<Trans>Job preferences</Trans>
								</SheetTitle>
								<p className="text-xs text-ink-3">
									<Trans>
										The roles, places, pay and ways of working you want. Used to check roles and offers; saved as you
										type.
									</Trans>
								</p>
							</div>
							<SheetClose aria-label={t`Close`} render={<Button variant="ghost" size="icon" className="text-ink-2" />}>
								<Icon name="x" />
							</SheetClose>
						</div>
						<div className="overflow-y-auto px-[22px] py-5">
							<PreferencesPage inPanel />
						</div>
					</SheetContent>
				</Sheet>
				<ScheduleSheet schedule={schedule} onScheduleChange={sheet.onScheduleChange} onDelete={sheet.deleteSchedule} />
			</div>
		</DiscoverProvider>
	);
}
