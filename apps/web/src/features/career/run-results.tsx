import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@reactive-resume/ui/components/badge";
import { sourceLabel } from "./discovery-sources";
import { decisionLabel } from "./pipeline-words";
import { orpc } from "@/libs/orpc/client";

const TONE = {
	new: "ok",
	known: "neutral",
	rejected: "neutral",
	unreadable: "warn",
	invalid: "neutral",
	filtered: "neutral",
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
		<div className="grid gap-2">
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-start text-xs">
					<thead>
						<tr className="border-y border-line bg-bg text-ink-2">
							{[t`Posting`, t`Source`, t`Decision`].map((heading) => (
								<th
									key={heading}
									scope="col"
									className="px-4 py-3 text-[11px] font-semibold tracking-[0.045em] whitespace-nowrap uppercase"
								>
									{heading}
								</th>
							))}
							<th scope="col" className="px-4 py-3">
								<span className="sr-only">
									<Trans>Actions</Trans>
								</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{data.items.map((item) => (
							<tr key={`${item.decision}-${item.url}`} className="border-b border-line last:border-b-0">
								<td className="px-4 py-3 text-[13px] font-semibold wrap-break-word">{item.title || item.url}</td>
								<td className="px-4 py-3 text-ink-2">
									{/* Job sources and boards by name; a web result by its site. */}
									{item.source && item.source !== "web" ? sourceLabel(item.source) : item.host}
								</td>
								<td className="px-4 py-3">
									<Badge variant={TONE[item.decision]}>{decisionLabel(item.decision)}</Badge>
								</td>
								<td className="px-4 py-3 text-end whitespace-nowrap">
									{item.applicationId ? (
										<Link
											to="/dashboard/applications/$applicationId/{-$tab}"
											params={{ applicationId: item.applicationId }}
											className="font-semibold text-accent-text hover:underline"
										>
											<Trans>Open application</Trans>
										</Link>
									) : (
										item.opportunityId && (
											<Link
												to="/dashboard/discover"
												search={{ job: item.opportunityId }}
												className="font-semibold text-accent-text hover:underline"
											>
												<Trans>View role</Trans>
											</Link>
										)
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="px-4 pb-3 text-[11px] text-ink-3">
				<Trans>The first 50 results of a run are kept.</Trans>
			</p>
		</div>
	);
}
