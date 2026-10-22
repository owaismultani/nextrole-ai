import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { toast } from "@reactive-resume/ui/components/toast";
import { useBreakpoint } from "@reactive-resume/ui/hooks/use-breakpoint";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { CareerLoadError } from "../career/load-state";
import { failed, useDayOffset } from "../career/section";
import { CollapseRow, FilterChip, InfoChip, Swap, useCareerTime, useNow, withUndo } from "../career/shared";
import { orpc } from "@/libs/orpc/client";

type Opportunity = RouterOutput["career"]["opportunities"][number];

type JobStatus = "new" | "tracked" | "dismissed";
type JobsSearch = { status: JobStatus; q: string; source: string; match: boolean; job: string | undefined };

type Tracked = Record<string, { applicationId: string; undoable: boolean }>;

const companyOf = (row: Opportunity) => row.company || hostOf(row.url);
const hostOf = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

type JobsPageProps = {
	search: JobsSearch;
	onSearch: (patch: Partial<JobsSearch>) => void;
	/** Opens the saved search in the shared editor. */
	onOpenSchedule: (schedule: string) => void;
	deleted: string[];
};

/**
 * Discover → Jobs: the roles discovery found. An untracked role can be tracked or dismissed; a tracked one opens its
 * application (never a second one); a dismissed one can be restored. Selecting a role shows its posting and where it
 * came from.
 */
export function JobsPage({ search, onSearch, onOpenSchedule, deleted }: JobsPageProps) {
	const now = useNow();
	const queryClient = useQueryClient();
	const breakpoint = useBreakpoint();
	const split = breakpoint === "desktop" || breakpoint === "wide";
	const { day } = useCareerTime();
	const dayOffset = useDayOffset();
	const open = useQuery(orpc.career.opportunities.queryOptions({ input: {} }));
	const dismissedQuery = useQuery(orpc.career.opportunities.queryOptions({ input: { dismissed: true } }));
	const schedules = useQuery(orpc.career.schedules.queryOptions({ input: {} }));
	const [hidden, setHidden] = useState<string[]>([]);
	const [tracked, setTracked] = useState<Tracked>({});
	const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.career.opportunities.key() });

	// Callbacks live on the hooks, not on mutate(), so each of several quick calls gets its own.
	const track = useMutation({
		...orpc.career.trackOpportunity.mutationOptions(),
		onSuccess: ({ applicationId }, { id }) => {
			setTracked((current) => ({ ...current, [id]: { applicationId, undoable: true } }));
			window.setTimeout(
				() =>
					setTracked((current) => {
						const entry = current[id];
						return entry ? { ...current, [id]: { ...entry, undoable: false } } : current;
					}),
				10_000,
			);
			const row = open.data?.find((item) => item.id === id);
			toast.add({ description: row ? t`Saved ${companyOf(row)} to Applications` : t`Saved to Applications` });
		},
		onError: (error) => failed(error, t`Couldn't save this role to Applications.`),
	});
	const untrack = useMutation({
		...orpc.applications.delete.mutationOptions(),
		onSuccess: async (_data, { id: applicationId }) => {
			// The role is back once the list knows it's untracked; dropping it from `tracked` first would flicker.
			await invalidate();
			setTracked((current) =>
				Object.fromEntries(Object.entries(current).filter(([, entry]) => entry.applicationId !== applicationId)),
			);
		},
		onError: (error) => failed(error, t`Couldn't remove it from Applications.`),
	});
	const dismiss = useMutation({
		...orpc.career.dismissOpportunity.mutationOptions(),
		onError: (error, { id }) => {
			setHidden((current) => current.filter((item) => item !== id));
			failed(error, t`Couldn't hide this role.`);
		},
	});
	const restore = useMutation({
		...orpc.career.restoreOpportunity.mutationOptions(),
		onSuccess: () => toast.add({ description: t`Role restored` }),
		onError: (error) => failed(error, t`Couldn't restore this role.`),
	});

	const onDismiss = (row: Opportunity) => {
		setHidden((current) => [...current, row.id]);
		withUndo({
			description: t`Hidden from Discover`,
			commit: () => dismiss.mutate({ id: row.id }),
			onUndo: () => setHidden((current) => current.filter((id) => id !== row.id)),
		});
	};

	const isError = open.isError || dismissedQuery.isError || schedules.isError;
	const rows = open.data;
	const dismissedRows = dismissedQuery.data;
	const stillNew = (row: Opportunity) => !row.trackedApplicationId || Boolean(tracked[row.id]);
	const byStatus: Record<JobStatus, Opportunity[]> = {
		new: (rows ?? []).filter((row) => !hidden.includes(row.id) && stillNew(row)),
		tracked: (rows ?? []).filter((row) => row.trackedApplicationId && !tracked[row.id]),
		dismissed: dismissedRows ?? [],
	};
	const needle = search.q.trim().toLowerCase();
	const sources = [...new Set([...(rows ?? []), ...(dismissedRows ?? [])].map((row) => hostOf(row.url)))].sort();
	const visible = byStatus[search.status]
		.filter(
			(row) =>
				(!needle || [row.role, row.company, row.location, row.snippet].join(" ").toLowerCase().includes(needle)) &&
				(!search.source || hostOf(row.url) === search.source) &&
				(!search.match || row.matches.length > 0),
		)
		.sort(
			(a, b) =>
				b.matches.length - a.matches.length || new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
		);
	const selected = visible.find((row) => row.id === search.job) ?? (split ? visible[0] : undefined);
	const discovery = schedules.data?.filter((row) => row.kind === "discovery" && !deleted.includes(row.id)) ?? [];
	const active = discovery.find((row) => row.enabled) ?? discovery[0];

	const found = (row: Opportunity) => {
		const offset = dayOffset(row.firstSeenAt, now);
		return offset === 0 ? t`Found today` : offset === -1 ? t`Found yesterday` : t`Found ${day(row.firstSeenAt)}`;
	};

	const statuses: { key: JobStatus; label: string; count: number | undefined }[] = [
		{ key: "new", label: t`New`, count: rows ? byStatus.new.filter((row) => !tracked[row.id]).length : undefined },
		{ key: "tracked", label: t`In Applications`, count: rows ? byStatus.tracked.length : undefined },
		{ key: "dismissed", label: t`Not for me`, count: dismissedRows?.length },
	];

	const detail = selected && (
		<Preview
			row={selected}
			found={found(selected)}
			tracked={tracked[selected.id]}
			trackPending={track.isPending && track.variables?.id === selected.id}
			restorePending={restore.isPending && restore.variables?.id === selected.id}
			onTrack={() => track.mutate({ id: selected.id })}
			onUndo={(applicationId) => untrack.mutate({ id: applicationId })}
			onDismiss={() => onDismiss(selected)}
			onRestore={() => restore.mutate({ id: selected.id })}
		/>
	);

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<div role="group" aria-label={t`Show`} className="flex flex-wrap gap-1.5">
					{statuses.map((status) => (
						<FilterChip
							key={status.key}
							pressed={search.status === status.key}
							onClick={() => onSearch({ status: status.key, job: undefined })}
						>
							{status.label}
							{status.count !== undefined && <span className="ms-1.5 font-mono opacity-70">{status.count}</span>}
						</FilterChip>
					))}
				</div>
				<div className="ms-auto flex flex-wrap items-center gap-2">
					<Input
						type="search"
						aria-label={t`Search roles`}
						placeholder={t`Search roles`}
						value={search.q}
						onChange={(event) => onSearch({ q: event.target.value })}
						className="h-8 w-48"
					/>
					{sources.length > 1 && (
						<NativeSelect
							aria-label={t`Source`}
							value={search.source}
							onChange={(event) => onSearch({ source: event.target.value, job: undefined })}
							className="h-8 w-40"
						>
							<option value="">{t`All sources`}</option>
							{sources.map((source) => (
								<option key={source} value={source}>
									{source}
								</option>
							))}
						</NativeSelect>
					)}
					<FilterChip pressed={search.match} onClick={() => onSearch({ match: !search.match, job: undefined })}>
						<Trans>Matches my preferences</Trans>
					</FilterChip>
				</div>
			</div>

			{isError ? (
				<CareerLoadError
					onRetry={() => {
						void open.refetch();
						void dismissedQuery.refetch();
						void schedules.refetch();
					}}
				/>
			) : !rows || !dismissedRows || !schedules.data ? (
				<Skeleton className="h-52 rounded-xl" />
			) : (
				<div className={cn("grid items-start gap-5", split && "lg:grid-cols-[minmax(0,1fr)_420px]")}>
					<div className="min-w-0">
						{visible.length === 0 ? (
							<Empty
								status={search.status}
								filtered={byStatus[search.status].length > 0}
								active={active}
								onOpenSchedule={onOpenSchedule}
								onClear={() => onSearch({ q: "", source: "", match: false })}
							/>
						) : (
							<ul className="grid gap-2" aria-label={t`Roles`}>
								<AnimatePresence initial={false}>
									{visible.map((row) => (
										<CollapseRow key={row.id} role="listitem">
											<JobCard
												row={row}
												found={found(row)}
												selected={selected?.id === row.id}
												tracked={Boolean(row.trackedApplicationId)}
												onSelect={() => onSearch({ job: row.id })}
											/>
										</CollapseRow>
									))}
								</AnimatePresence>
							</ul>
						)}
					</div>
					{split && detail && <aside className="sticky top-6 min-w-0">{detail}</aside>}
				</div>
			)}

			{!split && (
				<Sheet open={Boolean(search.job && detail)} onOpenChange={(next) => !next && onSearch({ job: undefined })}>
					<SheetContent side="bottom" showCloseButton={false} className="max-h-[90svh] gap-0">
						<div className="flex items-center gap-3 border-b border-line ps-[22px] pe-3 pt-[18px] pb-3.5">
							<SheetTitle className="flex-1">
								<Trans>Role</Trans>
							</SheetTitle>
							<SheetClose aria-label={t`Close`} render={<Button variant="ghost" size="icon" className="text-ink-2" />}>
								<Icon name="x" />
							</SheetClose>
						</div>
						<div className="overflow-y-auto px-[22px] py-5">{detail}</div>
					</SheetContent>
				</Sheet>
			)}
		</div>
	);
}

type EmptyProps = {
	status: JobStatus;
	/** Roles exist in this view but the filters hide them all. */
	filtered: boolean;
	active: { id: string; enabled: boolean } | undefined;
	onOpenSchedule: (schedule: string) => void;
	onClear: () => void;
};

function Empty({ status, filtered, active, onOpenSchedule, onClear }: EmptyProps) {
	if (filtered)
		return (
			<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-2 p-7 text-center">
				<p className="text-sm text-ink-2">
					<Trans>No roles match these filters.</Trans>
				</p>
				<Button variant="secondary" size="sm" onClick={onClear}>
					<Trans>Clear filters</Trans>
				</Button>
			</div>
		);
	if (status === "tracked")
		return (
			<p className="rounded-xl border border-dashed border-line-2 p-6 text-center text-sm text-ink-2">
				<Trans>Roles you track appear here with a link to their application.</Trans>
			</p>
		);
	if (status === "dismissed")
		return (
			<p className="rounded-xl border border-dashed border-line-2 p-6 text-center text-sm text-ink-2">
				<Trans>Roles you mark "Not for me" are kept here, and you can restore them.</Trans>
			</p>
		);
	if (!active)
		return (
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-2 px-4 py-3.5">
				<p className="text-sm text-ink-2">
					<Trans>Get new roles here every morning</Trans>
				</p>
				<Button variant="secondary" size="sm" onClick={() => onOpenSchedule("new:discovery")}>
					<Icon name="globe-simple" size={18} />
					<Trans>Set up discovery</Trans>
				</Button>
			</div>
		);
	return (
		<p className="flex flex-wrap items-center gap-x-1 rounded-xl border border-dashed border-line-2 p-6 text-sm text-ink-2">
			{active.enabled ? (
				<Trans>No new roles yet. Discovery looks again on its schedule.</Trans>
			) : (
				<>
					<Trans>No new roles. Discovery is paused.</Trans>
					<Button
						variant="link"
						className="text-sm text-ink-2 underline underline-offset-3"
						onClick={() => onOpenSchedule(active.id)}
					>
						<Trans>Open the search</Trans>
					</Button>
				</>
			)}
		</p>
	);
}

type JobCardProps = { row: Opportunity; found: string; selected: boolean; tracked: boolean; onSelect: () => void };

function JobCard({ row, found, selected, tracked, onSelect }: JobCardProps) {
	const company = companyOf(row);
	const unknownLabels = { salary: t`Salary not listed`, office: t`Office days not stated` };
	return (
		<button
			type="button"
			data-role-card
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"flex w-full flex-col gap-2 rounded-xl border bg-surface p-4 text-start transition-colors duration-quick hover:bg-hover",
				selected ? "border-ink" : "border-line",
			)}
		>
			<span className="flex items-start gap-3">
				<span
					aria-hidden="true"
					className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-sunken text-sm font-semibold text-ink-2"
				>
					{getInitials(company).slice(0, 1)}
				</span>
				<span className="grid min-w-0 flex-1 gap-0.5">
					<span className="text-[15px] font-semibold">{row.role}</span>
					<span className="text-[13px] text-ink-3">{[company, row.location, found].filter(Boolean).join(" · ")}</span>
				</span>
				{tracked && (
					<span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-text">
						<Icon name="check-circle" size={16} />
						<Trans>In Applications</Trans>
					</span>
				)}
			</span>
			{row.matches.length + row.unknowns.length > 0 && (
				<span className="flex flex-wrap gap-1.5">
					{row.matches.map((match) => (
						<InfoChip key={match} tone="match">
							{match}
						</InfoChip>
					))}
					{row.unknowns.map((unknown) => (
						<InfoChip key={unknown} tone="unknown">
							{unknownLabels[unknown]}
						</InfoChip>
					))}
				</span>
			)}
		</button>
	);
}

type PreviewProps = {
	row: Opportunity;
	found: string;
	tracked: Tracked[string] | undefined;
	trackPending: boolean;
	restorePending: boolean;
	onTrack: () => void;
	onUndo: (applicationId: string) => void;
	onDismiss: () => void;
	onRestore: () => void;
};

/** One role: its posting, where it was found, what it matches and leaves out, and the single action that fits it. */
function Preview({
	row,
	found,
	tracked,
	trackPending,
	restorePending,
	onTrack,
	onUndo,
	onDismiss,
	onRestore,
}: PreviewProps) {
	const { when } = useCareerTime();
	const detail = useQuery(orpc.career.opportunity.queryOptions({ input: { id: row.id } }));
	// An explicit request: the only way an existing role gets a tailored resume and letter.
	const prepare = useMutation(orpc.career.prepareDocuments.mutationOptions());
	const company = companyOf(row);
	const applicationId = tracked?.applicationId ?? row.trackedApplicationId;
	const dismissed = Boolean(row.dismissedAt);
	const unknownLabels = { salary: t`Salary not listed`, office: t`Office days not stated` };
	const posting = detail.data?.description || row.snippet;
	const run = detail.data?.run;

	return (
		<article aria-labelledby={`preview-${row.id}`} className="grid gap-4 rounded-xl border border-line bg-surface p-5">
			<header className="grid gap-1">
				<h2 id={`preview-${row.id}`} className="font-display text-[22px] leading-7 font-medium">
					{row.role}
				</h2>
				<p className="text-[13px] text-ink-3">{[company, row.location, found].filter(Boolean).join(" · ")}</p>
			</header>

			<Swap id={dismissed ? "dismissed" : applicationId ? "tracked" : "new"}>
				{dismissed ? (
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="secondary" loading={restorePending} onClick={onRestore}>
							<Icon name="arrow-counter-clockwise" size={18} />
							<Trans>Restore</Trans>
						</Button>
						<PostingLink url={row.url} />
					</div>
				) : applicationId ? (
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Button
								nativeButton={false}
								render={<Link to="/dashboard/applications/$applicationId/{-$tab}" params={{ applicationId }} />}
							>
								<Trans>Open application</Trans>
								<Icon name="arrow-right" size={18} className="rtl:-scale-x-100" />
							</Button>
							<PostingLink url={row.url} />
						</div>
						{tracked?.undoable && (
							<p className="flex items-center gap-2 text-[13px] text-accent-text">
								<Icon name="check-circle" size={18} className="shrink-0" />
								<span className="me-auto">
									<Trans>Saved to Applications with the posting</Trans>
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="text-ink-2 underline underline-offset-3"
									onClick={() => onUndo(applicationId)}
								>
									<Trans>Undo</Trans>
								</Button>
							</p>
						)}
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-2">
						<Button loading={trackPending} onClick={onTrack}>
							{!trackPending && <Icon name="bookmark-simple" size={18} />}
							<Trans>Track job</Trans>
						</Button>
						<PostingLink url={row.url} />
						<Button variant="ghost" className="ms-auto text-ink-2" onClick={onDismiss}>
							<Trans>Dismiss</Trans>
						</Button>
					</div>
				)}
			</Swap>

			{row.matches.length + row.unknowns.length > 0 && (
				<section aria-label={t`Your preferences`} className="grid gap-1.5">
					<h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
						<Trans>Against your preferences</Trans>
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{row.matches.map((match) => (
							<InfoChip key={match} tone="match">
								{match}
							</InfoChip>
						))}
						{row.unknowns.map((unknown) => (
							<InfoChip key={unknown} tone="unknown">
								{unknownLabels[unknown]}
							</InfoChip>
						))}
					</div>
				</section>
			)}

			<section aria-label={t`Posting`} className="grid gap-1.5">
				<h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
					<Trans>Posting</Trans>
				</h3>
				{detail.isPending ? (
					<Skeleton className="h-24" />
				) : (
					<p className="max-h-72 overflow-y-auto text-sm leading-[21px] whitespace-pre-line text-ink-2">{posting}</p>
				)}
				{detail.isError && (
					<p className="text-xs text-warn-text">
						<Trans>The full posting couldn't be loaded. Showing the search summary.</Trans>
					</p>
				)}
			</section>

			<section aria-label={t`Where it came from`} className="grid gap-1 text-[13px] text-ink-2">
				<h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
					<Trans>Where it came from</Trans>
				</h3>
				<p>{hostOf(row.url)}</p>
				{run ? (
					<p>
						{run.trigger === "manual" ? t`Found by a search you started` : t`Found by a scheduled search`}
						{" · "}
						{when(run.at)}{" "}
						<Link to="/dashboard/discover/activity" search={{ run: run.id }} className="underline">
							<Trans>See the run</Trans>
						</Link>
					</p>
				) : (
					!detail.isPending && (
						<p className="text-ink-3">
							<Trans>The run that found this role is no longer kept.</Trans>
						</p>
					)
				)}
			</section>

			{!dismissed && (
				<Button
					variant="ghost"
					size="sm"
					className="w-fit text-ink-2"
					loading={prepare.isPending}
					onClick={() =>
						prepare.mutate(
							{ opportunityIds: [row.id], resume: true, letter: true },
							{
								onSuccess: () =>
									toast.add({
										description: t`Preparing a resume and cover letter. Follow them in Automation.`,
									}),
								onError: (error) => failed(error, t`Couldn't start that.`),
							},
						)
					}
				>
					<Trans>Prepare documents</Trans>
				</Button>
			)}
		</article>
	);
}

function PostingLink({ url }: { url: string }) {
	return (
		<Button
			variant="ghost"
			nativeButton={false}
			className="text-ink-2"
			render={<a href={url} target="_blank" rel="noopener noreferrer" />}
		>
			<Trans>Original posting</Trans>
			<Icon name="arrow-square-out" size={16} />
		</Button>
	);
}
