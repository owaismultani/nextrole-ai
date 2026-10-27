import type { ReactNode } from "react";
import { cn } from "@reactive-resume/utils/style";

type SettingsSectionProps = {
	title: ReactNode;
	/** A short line under the title. */
	description?: ReactNode;
	/** Sits at the right of the title, e.g. "New key". */
	action?: ReactNode;
	children: ReactNode;
	className?: string;
	/** An anchor, so a link can open the page on this group. */
	id?: string;
};

/** A settings group: a card with a title and its rows. */
export function SettingsSection({ title, description, action, children, className, id }: SettingsSectionProps) {
	return (
		<section
			id={id}
			className={cn("grid scroll-mt-6 gap-4 rounded-2xl border border-line bg-surface p-6 max-sm:p-4", className)}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="grid gap-0.5">
					<h2 className="font-display text-[17px] leading-6 font-[750] tracking-[-0.035em]">{title}</h2>
					{description && <p className="text-sm text-ink-3">{description}</p>}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

type SettingsRowProps = {
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
};

/** One setting: what it is on the left, its control on the right. */
export function SettingsRow({ title, description, children }: SettingsRowProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 py-2">
			<div className="grid min-w-0 flex-1 gap-0.5">
				<span className="text-sm font-medium">{title}</span>
				{description && <span className="text-[13px] text-ink-3">{description}</span>}
			</div>
			{children}
		</div>
	);
}
