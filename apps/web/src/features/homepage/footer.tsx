import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { githubUrl } from "./header";
import { Brand } from "./ui";

const licenseUrl = `${githubUrl}/blob/main/LICENSE`;
const reactiveResumeUrl = "https://github.com/reactive-resume/reactive-resume";
const linkClass = "text-nr-ink-2 transition-colors hover:text-nr-ink";

type FooterLink = { label: string; href: string } | { label: string; to: "/ats-checker" | "/dashboard/overview" };

const getColumns = (): { id: string; title: string; links: FooterLink[] }[] => [
	{
		id: "product",
		title: t`Product`,
		links: [
			{ label: t`The crew`, href: "#crew" },
			{ label: t`Tour`, href: "#tour" },
			{ label: t`Pricing`, href: "#free" },
			{ label: t`ATS checker`, to: "/ats-checker" },
			{ label: t`Start free`, to: "/dashboard/overview" },
		],
	},
	{
		id: "resources",
		title: t`Resources`,
		links: [
			{ label: t`Documentation`, href: `${githubUrl}/tree/main/docs` },
			{ label: t`Changelog`, href: `${githubUrl}/blob/main/docs/changelog/index.mdx` },
			{ label: t`Self-hosting`, href: `${githubUrl}/blob/main/docs/self-hosting/docker.mdx` },
			{ label: t`Source code`, href: githubUrl },
		],
	},
	{
		id: "community",
		title: t`Community`,
		links: [
			{ label: t`Discussions`, href: `${githubUrl}/discussions` },
			{ label: t`Translations`, href: `${githubUrl}/blob/main/docs/contributing/translations.mdx` },
			{ label: "Reactive Resume", href: reactiveResumeUrl },
			{ label: t`Report an issue`, href: `${githubUrl}/issues` },
		],
	},
	{
		id: "legal",
		title: t`Legal`,
		links: [{ label: t`MIT License`, href: licenseUrl }],
	},
];

function FooterLinkItem({ link }: { link: FooterLink }): ReactNode {
	if ("to" in link) {
		return (
			<Link to={link.to} className={linkClass}>
				{link.label}
			</Link>
		);
	}
	return (
		<a href={link.href} className={linkClass}>
			{link.label}
		</a>
	);
}

export function LandingFooter() {
	return (
		<footer className="border-nr-line bg-nr-void/80 relative border-t backdrop-blur-md">
			<div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-8 gap-y-10 px-(--gutter) pt-14 pb-12">
				<div className="col-span-2 flex min-w-0 flex-col gap-3.5">
					<Brand />
					<div className="text-nr-ink-3 flex flex-col gap-1 text-[13px]">
						<p>
							<Trans>
								Built on{" "}
								<a href={reactiveResumeUrl} className="text-nr-accent underline underline-offset-[3px]">
									Reactive Resume
								</a>{" "}
								by a community of contributors.
							</Trans>
						</p>
						<p>v{__APP_VERSION__}</p>
					</div>
				</div>
				{getColumns().map((column) => (
					<nav key={column.id} aria-labelledby={`footer-${column.id}`} className="flex flex-col gap-2.5 text-sm">
						<h2
							id={`footer-${column.id}`}
							className="font-landing-mono text-nr-ink-3 mb-1 text-[11px] tracking-[.1em] uppercase"
						>
							{column.title}
						</h2>
						<ul className="flex flex-col gap-2.5">
							{column.links.map((link) => (
								<li key={link.label}>
									<FooterLinkItem link={link} />
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>
		</footer>
	);
}
