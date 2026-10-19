import { cn } from "@reactive-resume/utils/style";

/** A placeholder at the real size of what's loading, so nothing moves when it arrives. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="skeleton" className={cn("rounded-md bg-sunken", className)} {...props} />;
}

export { Skeleton };
