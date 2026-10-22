import { toast } from "@reactive-resume/ui/components/toast";
import { useCareerTime } from "./shared";
import { getOrpcErrorMessage } from "@/libs/error-message";

/** 0 for today, -1 for yesterday, 1 for tomorrow (in the Preferences timezone), otherwise null. */
export function useDayOffset() {
	const { format } = useCareerTime();
	return (value: Date | string, now: Date) => {
		const key = (date: Date | string) => format(date, { dateStyle: "short" });
		const day = key(value);
		for (const offset of [0, -1, 1]) if (key(new Date(now.getTime() + offset * 86_400_000)) === day) return offset;
		return null;
	};
}

type SectionHeadingProps = { id: string; title: string; count: number | undefined; note?: string };

/** "Needs you 3": 17/600 with a mono count, and an optional note on the right. */
export function SectionHeading({ id, title, count, note }: SectionHeadingProps) {
	return (
		<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
			<h2 id={id} className="text-[17px] font-semibold">
				{title}
			</h2>
			{count !== undefined && <span className="font-mono text-xs font-medium text-ink-3">{count}</span>}
			{note && <span className="ms-auto text-xs text-ink-3">{note}</span>}
		</div>
	);
}

/** An error toast with the server's own message when it has a safe one. */
export const failed = (error: unknown, fallback: string) =>
	toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback, allowServerMessage: true }) });
