import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";

export type SectionTab = {
	to: LinkProps["to"];
	/** The path that makes this tab current, when it differs from `to` (a tab whose address has optional parts). */
	match?: string;
	label: ReactNode;
	/** A count shown after the label. */
	count?: number | undefined;
	/** Where the tab goes when it carries a search, for example a link that preserves a filter. */
	search?: LinkProps["search"];
};

type SectionTabsProps = { label: string; tabs: SectionTab[] };

/**
 * The underlined tabs under a page header: each is a link, so the address says which one is open, and the row scrolls
 * sideways on a narrow screen. Current is decided by the route, not by local state.
 */
export function SectionTabs({ label, tabs }: SectionTabsProps) {
	const matchRoute = useMatchRoute();
	const current = tabs.find((tab) => matchRoute({ to: tab.match ?? tab.to, fuzzy: true }));
	return (
		<Tabs
			value={current ? String(current.match ?? current.to) : ""}
			className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0"
		>
			<TabsList variant="line" aria-label={label}>
				{tabs.map((tab) => {
					const value = String(tab.match ?? tab.to);
					return (
						<TabsTrigger
							key={value}
							value={value}
							nativeButton={false}
							render={<Link to={tab.to} search={tab.search} aria-current={current === tab ? "page" : undefined} />}
						>
							{tab.label}
							{tab.count !== undefined && <span className="font-mono text-xs text-ink-3">{tab.count}</span>}
						</TabsTrigger>
					);
				})}
			</TabsList>
		</Tabs>
	);
}
