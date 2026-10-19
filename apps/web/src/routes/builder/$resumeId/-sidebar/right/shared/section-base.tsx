import type { RightSidebarSection } from "@/libs/resume/section";
import { cn } from "@reactive-resume/utils/style";

type Props = React.ComponentProps<"div"> & {
	type: RightSidebarSection;
};

/**
 * A section's content, anchored as `sidebar-{type}`. Its host (a sheet, a dialog or an editor mode) titles it.
 */
export function SectionBase({ type, className, ...props }: Props) {
	return <div id={`sidebar-${type}`} className={cn("space-y-4", className)} {...props} />;
}
