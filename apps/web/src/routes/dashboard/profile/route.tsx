import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { m } from "motion/react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { PageHeader } from "@/components/layout/page-header";
import { D2, EASE } from "@/libs/motion";
import { orpc } from "@/libs/orpc/client";

export const Route = createFileRoute("/dashboard/profile")({
	component: ProfileLayout,
});

type Section = {
	to:
		| "/dashboard/profile/details"
		| "/dashboard/profile/preferences"
		| "/dashboard/profile/facts"
		| "/dashboard/profile/stories/{-$storyId}"
		| "/dashboard/profile/baseline";
	match: string;
	icon: IconName;
	label: string;
	count?: number | undefined;
};

/** Profile: who you are to the app. A sticky subnav at md and up, a segmented row above on phones. */
function ProfileLayout() {
	const matchRoute = useMatchRoute();
	const facts = useQuery(orpc.career.facts.queryOptions({ input: { applicationId: null, all: true } }));
	const stories = useQuery(orpc.career.stories.queryOptions({ input: { applicationId: null } }));
	const sections: Section[] = [
		{
			to: "/dashboard/profile/details",
			match: "/dashboard/profile/details",
			icon: "user-circle",
			label: t`Candidate details`,
		},
		{
			to: "/dashboard/profile/preferences",
			match: "/dashboard/profile/preferences",
			icon: "sliders-horizontal",
			label: t({
				message: "Job preferences",
				context: "Career preferences: the roles, places, pay and ways of working you want",
			}),
		},
		{
			to: "/dashboard/profile/facts",
			match: "/dashboard/profile/facts",
			icon: "list-checks",
			label: t`Facts`,
			count: facts.data?.filter((fact) => fact.status !== "forgotten").length,
		},
		{
			to: "/dashboard/profile/stories/{-$storyId}",
			match: "/dashboard/profile/stories",
			icon: "book-open",
			label: t`Stories`,
			count: stories.data?.length,
		},
		{
			to: "/dashboard/profile/baseline",
			match: "/dashboard/profile/baseline",
			icon: "file-text",
			label: t`Baseline resume`,
		},
	];

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Profile</Trans>}
				description={<Trans>What the app knows about you, and what it may use when it writes for you.</Trans>}
			/>
			<div className="grid min-w-0 items-start gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-7">
				<aside className="grid gap-5 [view-transition-name:profile-nav] md:sticky md:top-6">
					<nav
						aria-label={t`Profile`}
						className="flex gap-0.5 rounded-[9px] bg-sunken p-[3px] md:grid md:bg-transparent md:p-0"
					>
						{sections.map((section) => {
							const selected = Boolean(matchRoute({ to: section.match, fuzzy: true }));
							return (
								<Link
									key={section.to}
									to={section.to}
									aria-current={selected ? "page" : undefined}
									className={cn(
										"touch-target relative flex h-[30px] flex-1 items-center justify-center gap-2.5 rounded-sm px-3 text-[13px] font-medium transition-colors duration-quick md:h-9 md:justify-start md:rounded-lg md:text-sm",
										selected ? "text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
									)}
								>
									{selected && (
										<m.span
											layoutId="profile-section"
											transition={{ duration: D2, ease: EASE }}
											className="absolute inset-0 rounded-sm bg-raised shadow-e1 md:rounded-lg md:bg-sunken md:shadow-none"
										/>
									)}
									<Icon name={section.icon} size={18} className="relative hidden md:block" />
									<span className="relative md:flex-1">{section.label}</span>
									{section.count !== undefined && (
										<span className="relative hidden font-mono text-xs text-ink-3 md:inline">{section.count}</span>
									)}
								</Link>
							);
						})}
					</nav>
					<p className="hidden px-2.5 text-xs leading-[17px] text-ink-3 md:block">
						<Trans>
							Your facts, stories and preferences are the Knowledge the coach and your tailored documents draw on.
							Enabled ones can be sent to your AI connection when you use coaching tools or scheduled interview
							preparation. In chat, the Knowledge switch controls what is added to each message.
						</Trans>
					</p>
				</aside>
				<div className="min-w-0">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
