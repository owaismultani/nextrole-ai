import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@reactive-resume/utils/style";
import { decisionLabel } from "./pipeline-words";
import { orpc } from "@/libs/orpc/client";

const TONE = {
	new: "text-accent-text",
	known: "text-ink-3",
	rejected: "text-ink-3",
	unreadable: "text-warn-text",
	invalid: "text-ink-3",
} as const;

/** Every search result of one run and what became of it: the answer to "why wasn't that job found". */
export function RunResults({ runId }: { runId: string }) {
	const { data, isError, isPending } = useQuery(orpc.career.runDetail.queryOptions({ input: { id: runId } }));
	if (isPending) return <p className="text-xs text-ink-3">{t`Loading results…`}</p>;
	if (isError)
		return (
			<p className="text-xs text-danger-text">
				<Trans>Couldn't load this run's results. Runs are kept for 30 days.</Trans>
			</p>
		);
	if (data.items.length === 0)
		return (
			<p className="text-xs text-ink-3">
				<Trans>No results were kept for this run.</Trans>
			</p>
		);
	return (
		<div className="grid gap-1.5">
			<h4 className="text-xs font-semibold text-ink-2">
				<Trans>Every result of this search</Trans>
			</h4>
			<ul className="grid gap-1">
				{data.items.map((item) => (
					<li key={`${item.decision}-${item.url}`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
						<span className={cn("w-32 shrink-0 font-medium", TONE[item.decision])}>{decisionLabel(item.decision)}</span>
						<span className="min-w-0 flex-1 break-words text-ink-2">
							{item.title || item.url}
							{item.host && <span className="text-ink-3"> · {item.host}</span>}
						</span>
					</li>
				))}
			</ul>
			<p className="text-[11px] text-ink-3">
				<Trans>The first 50 results of a run are kept.</Trans>
			</p>
		</div>
	);
}
