import type * as React from "react";
import { cn } from "@reactive-resume/utils/style";

type SwapProps = {
	/** False shows `from`, true shows `to`. */
	swapped: boolean;
	from: React.ReactNode;
	to: React.ReactNode;
	className?: string;
};

/**
 * Two states in one spot, such as Copy → Copied. Both stay laid out in one grid cell, so the size never jumps; the
 * incoming one fades and scales up from 80% out of a 2px blur over 200ms, the outgoing one leaves in 140ms.
 * Spacing between an icon and its label is inherited from the parent's `gap`.
 */
function Swap({ swapped, from, to, className }: SwapProps) {
	const layer = (shown: boolean) =>
		cn(
			"col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit] transition-[opacity,scale,filter] ease-enter",
			shown ? "duration-standard" : "scale-[0.8] opacity-0 blur-[2px] duration-[calc(var(--d2)*0.7)]",
		);

	return (
		<span data-slot="swap" className={cn("inline-grid gap-[inherit]", className)}>
			<span aria-hidden={swapped || undefined} className={layer(!swapped)}>
				{from}
			</span>
			<span aria-hidden={!swapped || undefined} className={layer(swapped)}>
				{to}
			</span>
		</span>
	);
}

export { Swap };
