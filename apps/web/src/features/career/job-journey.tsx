import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@reactive-resume/utils/style";
import { foundVia } from "./discovery-sources";
import { describeEvent } from "./pipeline-words";
import { useCareerTime } from "./shared";
import { orpc } from "@/libs/orpc/client";

/** One job's story, oldest first: the search that found it, then each step taken for it, ending with your turn. */
export function JobJourney({ opportunityId }: { opportunityId: string }) {
	const { when } = useCareerTime();
	const { data, isError, isPending } = useQuery(orpc.career.journey.queryOptions({ input: { id: opportunityId } }));
	if (isPending) return <p className="text-xs text-ink-3">{t`Loading…`}</p>;
	if (isError)
		return (
			<p className="text-xs text-danger-text">
				<Trans>Couldn't load this job's history. It is kept for 30 days.</Trans>
			</p>
		);
	return (
		<ol className="grid gap-1.5 border-s border-line ps-3 text-xs">
			<li className="text-ink-2">
				{data.run
					? t`${when(data.foundAt)} · Found by the search "${data.run.query}" via ${foundVia(data)}`
					: t`${when(data.foundAt)} · Found by discovery via ${foundVia(data)}`}
			</li>
			{data.events.map((event) => (
				<li
					key={event.id}
					className={cn(
						event.level === "error" ? "text-danger-text" : event.level === "warn" ? "text-warn-text" : "text-ink-2",
					)}
				>
					{when(event.at)} · {describeEvent(event, when)}
				</li>
			))}
			<li className="font-medium text-ink">
				<Trans>Your turn: review the drafts, then apply yourself.</Trans>
			</li>
		</ol>
	);
}
