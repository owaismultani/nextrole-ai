import type { ActivityEvent } from "./pipeline-words";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { describeEvent } from "./pipeline-words";
import { Eyebrow, useCareerTime } from "./shared";
import { orpc } from "@/libs/orpc/client";

const PAGE_SIZE = 20;

/**
 * Career → Pipeline: a plain-language log of what the pipeline did, newest first, kept for 30 days. Filter to problems
 * to see only what needs a look.
 */
export function ActivityFeed({ className }: { className?: string }) {
	const { when } = useCareerTime();
	const [page, setPage] = useState(0);
	const [problems, setProblems] = useState(false);
	const { data, isFetching, refetch } = useQuery({
		...orpc.career.activity.queryOptions({ input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, problems } }),
		placeholderData: (previous) => previous,
		refetchInterval: 30_000,
	});
	const total = data?.total ?? 0;
	const last = Math.min(total, (page + 1) * PAGE_SIZE);
	return (
		<section
			aria-labelledby="activity"
			className={cn("overflow-hidden rounded-xl border border-line bg-surface", className)}
		>
			<div className="flex flex-wrap items-center gap-2 ps-4 pe-3 pt-3.5 pb-2.5">
				<Eyebrow className="flex-1">
					<span id="activity">
						<Trans>Activity</Trans>
					</span>
				</Eyebrow>
				<Button
					variant={problems ? "secondary" : "ghost"}
					size="sm"
					aria-pressed={problems}
					onClick={() => {
						setProblems(!problems);
						setPage(0);
					}}
				>
					<Trans>Only problems</Trans>
				</Button>
				<Button variant="ghost" size="sm" loading={isFetching} onClick={() => void refetch()}>
					<Trans>Refresh</Trans>
				</Button>
			</div>
			<p className="px-4 pb-2 text-xs text-ink-3">
				<Trans>What happened behind the scenes, kept for 30 days.</Trans>
			</p>
			{data && data.items.length === 0 ? (
				<p className="px-4 pb-4 text-[13px] text-ink-3">
					{problems ? (
						<Trans>No problems. Everything has been running smoothly.</Trans>
					) : (
						<Trans>Nothing yet. Activity appears here after the first run.</Trans>
					)}
				</p>
			) : (
				<ol className="grid gap-px px-4 pb-3">
					{data?.items.map((event) => (
						<Row key={event.id} event={event} when={when} />
					))}
				</ol>
			)}
			{total > PAGE_SIZE && (
				<nav aria-label={t`Activity pages`} className="flex items-center gap-2 px-4 pb-4">
					<span className="me-auto text-xs text-ink-3">{t`${page * PAGE_SIZE + 1}–${last} of ${total}`}</span>
					<Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
						<Trans>Newer</Trans>
					</Button>
					<Button variant="secondary" size="sm" disabled={last >= total} onClick={() => setPage(page + 1)}>
						<Trans>Older</Trans>
					</Button>
				</nav>
			)}
		</section>
	);
}

function Row({ event, when }: { event: ActivityEvent; when: (value: Date | string) => string }) {
	const tone = event.level === "error" ? "text-danger-text" : event.level === "warn" ? "text-warn-text" : "text-ink-3";
	return (
		<li className="flex items-start gap-2.5 border-t border-line py-2 text-[13px] first:border-t-0">
			<Icon
				name={event.level === "error" ? "warning-circle" : event.level === "warn" ? "warning" : "check-circle"}
				size={16}
				className={cn("mt-0.5 shrink-0", tone)}
			/>
			<span className="min-w-0 flex-1 break-words text-ink">{describeEvent(event, when)}</span>
			<time dateTime={event.at.toISOString()} className="shrink-0 text-xs text-ink-3">
				{when(event.at)}
			</time>
		</li>
	);
}
