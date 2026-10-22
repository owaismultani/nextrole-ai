import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Fragment } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { useBreakpoint } from "@reactive-resume/ui/hooks/use-breakpoint";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTabs } from "@/components/layout/section-tabs";
import { popTransition } from "@/features/settings/root";

type PageTo =
	| "/dashboard/settings/account"
	| "/dashboard/settings/preferences"
	| "/dashboard/settings/ai"
	| "/dashboard/settings/security"
	| "/dashboard/settings/developer";

// Each page has one job. Automation has its own place in the main navigation. `ai` is Integrations: the address stays
// because the app links to it from everywhere a connection is needed.
const getPages = (): { to: PageTo; label: string }[] => [
	{ to: "/dashboard/settings/account", label: t`Account` },
	{ to: "/dashboard/settings/preferences", label: t`Preferences` },
	{ to: "/dashboard/settings/ai", label: t`Integrations` },
	{ to: "/dashboard/settings/security", label: t`Security` },
	{ to: "/dashboard/settings/developer", label: t`Developer` },
];

// The project's own links: where to read up, see the code, help translate, report a problem or donate.
const getProjectLinks = () => [
	{ href: "https://docs.rxresu.me", label: t`Docs` },
	{ href: "https://github.com/reactive-resume/reactive-resume", label: t`Source` },
	{ href: "https://crowdin.com/project/reactive-resume", label: t`Translate` },
	{ href: "https://github.com/reactive-resume/reactive-resume/issues", label: t`Report a bug` },
	{ href: "https://opencollective.com/reactive-resume/donate", label: t`Donate` },
];

export const Route = createFileRoute("/dashboard/settings")({ component: RouteComponent });

function RouteComponent() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const isPhone = useBreakpoint() === "mobile";
	const isRoot = pathname.replace(/\/$/, "") === "/dashboard/settings";
	const pages = getPages();
	const current = pages.find((page) => pathname.startsWith(page.to));

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			{!isRoot && isPhone && (
				<Link
					to="/dashboard/settings"
					viewTransition={popTransition}
					className="inline-flex h-9 w-fit items-center gap-1 text-sm text-ink-2"
				>
					<Icon name="caret-left" size={20} />
					<Trans>Settings</Trans>
				</Link>
			)}
			{!isRoot && (
				<PageHeader
					title={isPhone && current ? current.label : <Trans>Settings</Trans>}
					description={isPhone ? undefined : <Trans>Manage your account and application preferences.</Trans>}
				/>
			)}
			{!isRoot && !isPhone && (
				<SectionTabs label={t`Settings`} tabs={pages.map((page) => ({ to: page.to, label: page.label }))} />
			)}
			<div className="grid max-w-[860px] gap-5">
				<Outlet />
			</div>
			{!isRoot && (
				<p className="mt-4 border-t border-line pt-5 text-xs leading-[18px] text-ink-3">
					<Trans>Reactive Resume {__APP_VERSION__} · MIT</Trans>
					{" · "}
					{getProjectLinks().map((link, index) => (
						<Fragment key={link.href}>
							{index > 0 && " · "}
							<a className="underline" href={link.href} target="_blank" rel="noopener noreferrer">
								{link.label}
							</a>
						</Fragment>
					))}
				</p>
			)}
		</div>
	);
}
