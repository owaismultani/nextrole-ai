import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { SegmentedControl, SegmentedControlItem } from "@reactive-resume/ui/components/segmented-control";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { cn } from "@reactive-resume/utils/style";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerTime } from "@/features/career/shared";
import { orpc } from "@/libs/orpc/client";

type Overview = RouterOutput["career"]["overview"];
type Days = 7 | 30 | 90;

const FUNNEL_LABELS = {
	discovered: () => t`Found`,
	saved: () => t`Saved`,
	documents: () => t`Documents ready`,
	applied: () => t`Applied`,
	screening: () => t`Screening`,
	interview: () => t`Interview`,
	offer: () => t`Offer`,
} satisfies Record<Overview["funnel"][number]["key"], () => string>;

/** Overview: what needs you, how far jobs get, how discovery and automation are doing, and what is coming up. */
export function OverviewPage() {
	const [days, setDays] = useState<Days>(30);
	const { data, isError, refetch, isFetching } = useQuery({
		...orpc.career.overview.queryOptions({ input: { days } }),
		placeholderData: (previous) => previous,
	});
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1180px] flex-col gap-6 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Overview</Trans>}
				description={<Trans>Your job search from discovery to offer, and what needs you now.</Trans>}
				actions={
					<SegmentedControl
						aria-label={t`Time window`}
						value={String(days)}
						onValueChange={(next) => setDays(Number(next) as Days)}
					>
						<SegmentedControlItem value="7">{t`7 days`}</SegmentedControlItem>
						<SegmentedControlItem value="30">{t`30 days`}</SegmentedControlItem>
						<SegmentedControlItem value="90">{t`90 days`}</SegmentedControlItem>
					</SegmentedControl>
				}
			/>
			{isError ? (
				<p className="text-sm text-danger-text">
					<Trans>Couldn't load the overview.</Trans>{" "}
					<button type="button" className="underline" onClick={() => void refetch()}>
						<Trans>Try again</Trans>
					</button>
				</p>
			) : !data ? (
				<Skeleton className="h-64 rounded-xl" />
			) : (
				<div className={cn("grid gap-6", isFetching && "opacity-80")}>
					<NeedsYou data={data} />
					<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
						<Funnel data={data} />
						<DiscoveryHealth data={data} />
					</div>
					<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
						<AutomationUse data={data} />
						<UpcomingInterviews data={data} />
					</div>
					<p className="text-xs text-ink-3">
						<Trans>
							For response rates, time to first reply and tailored vs base resume results, see{" "}
							<Link to="/dashboard/applications" search={{ view: "insights" }} className="underline">
								Applications → Insights
							</Link>
							.
						</Trans>
					</p>
				</div>
			)}
		</div>
	);
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn("grid gap-3 rounded-xl border border-line bg-surface p-4", className)}>
			<h2 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
			{children}
		</section>
	);
}

// ---- Needs you ----

type Tile = {
	count: number;
	label: string;
	to: "/dashboard/career" | "/dashboard/career/pipeline" | "/dashboard/applications";
	bad?: boolean;
};

function NeedsYou({ data }: { data: Overview }) {
	const { needsYou: n } = data;
	const tiles: Tile[] = [
		{ count: n.readyDocuments, label: t`Documents ready for review`, to: "/dashboard/career/pipeline" },
		{ count: n.attentionDocuments, label: t`Documents need attention`, to: "/dashboard/career/pipeline", bad: true },
		{ count: n.upcomingInterviews, label: t`Interviews in the next 7 days`, to: "/dashboard/applications" },
		{ count: n.unreadReminders, label: t`Reminders and briefings`, to: "/dashboard/career" },
		{ count: n.newRoles, label: t`New roles to review`, to: "/dashboard/career" },
	];
	const open = tiles.filter((tile) => tile.count > 0);
	return (
		<section aria-labelledby="needs-you" className="grid gap-3">
			<h2 id="needs-you" className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
				<Trans>Needs you now</Trans>
			</h2>
			{n.discoveryFailing && (
				<Link
					to="/dashboard/career/pipeline"
					className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger-text"
				>
					<Icon name="warning-circle" size={18} className="shrink-0" />
					<Trans>The last discovery run failed. Open Pipeline to see why.</Trans>
				</Link>
			)}
			{open.length === 0 && !n.discoveryFailing ? (
				<p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-2">
					<Trans>You are up to date. Nothing is waiting for you.</Trans>
				</p>
			) : (
				<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{open.map((tile) => (
						<li key={tile.label}>
							<Link
								to={tile.to}
								className="grid h-full gap-1 rounded-xl border border-line bg-surface p-3.5 transition-colors duration-quick hover:bg-hover"
							>
								<span className={cn("text-2xl font-semibold tabular-nums", tile.bad ? "text-danger-text" : "text-ink")}>
									{tile.count}
								</span>
								<span className="text-[13px] text-ink-2">{tile.label}</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

// ---- Funnel ----

function Funnel({ data }: { data: Overview }) {
	const max = Math.max(1, ...data.funnel.map((step) => step.count));
	const note = (index: number) => {
		const step = data.funnel[index];
		const before = index > 0 ? data.funnel[index - 1] : undefined;
		return before && before.count > 0 && step && index >= 3
			? `${Math.round((step.count / before.count) * 100)}%`
			: null;
	};
	return (
		<Card title={t`Pipeline, last ${data.windowDays} days`}>
			<ol className="grid gap-2">
				{data.funnel.map((step, index) => (
					<li key={step.key} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
						<span className="text-ink-2">{FUNNEL_LABELS[step.key]()}</span>
						<span className="h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
							<span
								className="block h-full rounded-full bg-accent"
								style={{ width: `${Math.max(step.count > 0 ? 3 : 0, (step.count / max) * 100)}%` }}
							/>
						</span>
						<span className="flex min-w-14 items-baseline justify-end gap-1.5 tabular-nums">
							<b className="font-semibold">{step.count}</b>
							{note(index) && <span className="text-xs text-ink-3">{note(index)}</span>}
						</span>
					</li>
				))}
			</ol>
			<p className="text-xs text-ink-3">
				<Trans>
					Each step counts jobs that reached it in this window, so later steps can include jobs found earlier. The
					percentage is the share of the step before it.
				</Trans>
			</p>
		</Card>
	);
}

// ---- Discovery health ----

function DiscoveryHealth({ data }: { data: Overview }) {
	const { when } = useCareerTime();
	const { discovery: d } = data;
	const max = Math.max(1, ...d.runs.map((run) => run.found));
	return (
		<Card title={t`Discovery`}>
			{!d.scheduleId ? (
				<p className="text-sm text-ink-2">
					<Trans>No discovery schedule yet.</Trans>{" "}
					<Link to="/dashboard/career" className="underline">
						<Trans>Set one up in Career</Trans>
					</Link>
				</p>
			) : (
				<>
					<dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
						<Fact label={t`State`} value={d.enabled ? t`On` : t`Paused`} />
						<Fact label={t`Last success`} value={d.lastSucceededAt ? when(d.lastSucceededAt) : t`Never`} />
						<Fact label={t`Next run`} value={d.nextRunAt ? when(d.nextRunAt) : t`Paused`} />
					</dl>
					{d.runs.length > 0 ? (
						<div
							role="img"
							aria-label={t`New jobs found per run, oldest to newest`}
							className="flex h-16 items-end gap-[3px]"
						>
							{d.runs.map((run) => (
								<span
									key={`${run.at.toISOString()}`}
									title={`${when(run.at)}: ${run.matches} new of ${run.found}`}
									className={cn(
										"min-w-[3px] flex-1 rounded-sm",
										run.outcome === "failed" ? "bg-danger" : run.matches > 0 ? "bg-accent" : "bg-line-2",
									)}
									style={{ height: `${Math.max(8, (run.found / max) * 100)}%` }}
								/>
							))}
						</div>
					) : (
						<p className="text-sm text-ink-3">
							<Trans>No runs in this window.</Trans>
						</p>
					)}
					<dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs sm:grid-cols-6">
						<Fact label={t`Runs`} value={String(d.totals.runs)} />
						<Fact label={t`New`} value={String(d.totals.matches)} />
						<Fact label={t`Duplicates`} value={String(d.totals.duplicates)} />
						<Fact label={t`Rejected`} value={String(d.totals.rejected)} />
						<Fact label={t`Read failures`} value={String(d.totals.readFailures)} />
						<Fact label={t`Failed runs`} value={String(d.totals.failed)} />
					</dl>
					{d.failing && (
						<p className="rounded-md bg-danger-soft px-2.5 py-2 text-[13px] text-danger-text">
							<Trans>The latest run failed. Open Pipeline for the reason.</Trans>
						</p>
					)}
					{d.repeating && (
						<p className="rounded-md bg-warn-soft px-2.5 py-2 text-[13px] text-warn-text">
							<Trans>
								The last five runs found nothing new but kept seeing jobs you already have. Scheduling is working; try
								changing what you look for.
							</Trans>
						</p>
					)}
					<Link to="/dashboard/career/pipeline" className="w-fit text-[13px] underline">
						<Trans>Open Pipeline</Trans>
					</Link>
				</>
			)}
		</Card>
	);
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid gap-px">
			<dt className="text-ink-3">{label}</dt>
			<dd className="text-[13px] font-semibold">{value}</dd>
		</div>
	);
}

// ---- Automation ----

function AutomationUse({ data }: { data: Overview }) {
	const { when } = useCareerTime();
	const { automation: a } = data;
	const off = !a.resumesEnabled && !a.lettersEnabled;
	const pct = Math.min(100, Math.round((a.used / Math.max(1, a.limit)) * 100));
	return (
		<Card title={t`Document automation`}>
			<p className="text-sm text-ink-2">
				{off
					? t`Automatic documents are off.`
					: [a.resumesEnabled ? t`Tailored resumes on` : null, a.lettersEnabled ? t`Cover letters on` : null]
							.filter(Boolean)
							.join(" · ")}
			</p>
			<div className="grid gap-1.5">
				<div className="flex items-baseline justify-between text-[13px]">
					<span className="font-semibold tabular-nums">{t`${a.used} of ${a.limit} documents today`}</span>
					<span className="text-xs text-ink-3">{t`Resets ${when(a.resetsAt)}`}</span>
				</div>
				<span
					role="progressbar"
					aria-valuenow={a.used}
					aria-valuemin={0}
					aria-valuemax={a.limit}
					aria-label={t`Documents generated today`}
					className="h-2.5 overflow-hidden rounded-full bg-sunken"
				>
					<span
						className={cn("block h-full rounded-full", pct >= 100 ? "bg-warn-text" : "bg-accent")}
						style={{ width: `${pct}%` }}
					/>
				</span>
			</div>
			{(a.deferred > 0 || a.stale > 0) && (
				<ul className="grid gap-1 text-[13px] text-ink-2">
					{a.deferred > 0 && <li>{t`${a.deferred} waiting for the daily limit to reset`}</li>}
					{a.stale > 0 && <li>{t`${a.stale} out of date after your resume or a posting changed`}</li>}
				</ul>
			)}
			<Link to="/dashboard/settings/automation" className="w-fit text-[13px] underline">
				<Trans>Automation settings</Trans>
			</Link>
		</Card>
	);
}

// ---- Upcoming ----

function UpcomingInterviews({ data }: { data: Overview }) {
	const { when } = useCareerTime();
	return (
		<Card title={t`Interviews in the next 7 days`}>
			{data.interviews.length === 0 ? (
				<p className="text-sm text-ink-3">
					<Trans>No interviews coming up.</Trans>
				</p>
			) : (
				<ul className="grid gap-2">
					{data.interviews.map((interview) => (
						<li key={`${interview.applicationId}-${interview.at.toISOString()}`}>
							<Link
								to="/dashboard/applications/$applicationId"
								params={{ applicationId: interview.applicationId }}
								className="grid gap-0.5 rounded-lg px-1 py-1 hover:bg-hover"
							>
								<span className="text-sm font-medium">
									{[interview.company, interview.role].filter(Boolean).join(" · ")}
								</span>
								<span className="text-xs text-ink-3">{when(interview.at)}</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
