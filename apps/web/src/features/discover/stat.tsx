import type { ReactNode } from "react";
import { cn } from "@reactive-resume/utils/style";

type StatTileProps = { value: ReactNode; label: ReactNode; bad?: boolean };

/** One labelled figure: a large number or short value over what it counts. */
export function StatTile({ value, label, bad }: StatTileProps) {
	return (
		<div className="rounded-xl border border-line bg-surface p-5">
			<div
				className={cn(
					"font-display text-[26px] leading-[1.3] font-[750] tracking-[-0.05em] tabular-nums",
					bad && "text-danger-text",
				)}
			>
				{value}
			</div>
			<div className="mt-1.5 text-xs text-ink-2">{label}</div>
		</div>
	);
}
