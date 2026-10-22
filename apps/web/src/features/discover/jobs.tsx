import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
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

/** `open`: roles still in Discover, new and tracked together. `dismissed`: roles you chose not to track. */
type JobsMode = "open" | "dismissed";
type JobsSearch = { q: string; source: string; match: boolean; job: string | undefined };

const PAGE_SIZE = 15;

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
	mode: JobsMode;
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
export function JobsPage({ mode, search, onSearch, onOpenSchedule, deleted }: JobsPageProps) {
	const now = useNow();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const breakpoint = useBreakpoint();
	const side = breakpoint === "mobile" ? "bottom" : "right";
	const { day } = useCareerTime();
	const dayOffset = useDayOffset();
	const open = useQuery(orpc.career.opportunities.queryOptions({ input: {} }));
	const dismissedQuery = useQuery(orpc.career.opportunities.queryOptions({ input: { dismissed: true } }));
	const schedules = useQuery(orpc.career.schedules.queryOptions({ input: {} }));
	const [hidden, setHidden] = useState<string[]>([]);
	const [tracked, setTracked] = useState<Tracked>({});
	const [show, setShow] = useState<"all" | "new" | "tracked">("all");
	const [pageState, setPageState] = useState({ key: "", page: 0 });
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

	// A dismissed role linked from a run or a notification opens in the Dismissed tab, where it is.
	const linkedDismissed =
		mode === "open" && Boolean(search.job && dismissedQuery.data?.some((row) => row.id === search.job));
	useEffect(() => {
		if (linkedDismissed)
			void navigate({ to: "/dashboard/discover/dismissed", search: { job: search.job }, replace: true });
	}, [linkedDismissed, navigate, search.job]);

	const isError = open.isError || dismissedQuery.isError || schedules.isError;
	const rows = open.data;
	const dismissedRows = dismissedQuery.data;
	const list = mode === "dismissed" ? (dismissedRows ?? []) : (rows ?? []).filter((row) => !hidden.includes(row.id));
	const needle = search.q.trim().toLowerCase();
	// The filter offers the sources of roles that already have an application.
	const sources = [
		...new Set(
			(rows ?? [])
				.filter((row) => tracked[row.id]?.applicationId ?? row.trackedApplicationId)
				.map((row) => hostOf(row.url)),
		),
	].sort();
	const newCount = list.filter((row) => !(tracked[row.id]?.applicationId ?? row.trackedApplicationId)).length;
	const matching = list
		.filter(
			(row) =>
				(!needle || [row.role, row.company, row.location, row.snippet].join(" ").toLowerCase().includes(needle)) &&
				(!search.source || hostOf(row.url) === search.source) &&
				(!search.match || row.matches.length > 0) &&
				(mode === "dismissed" ||
					show === "all" ||
					Boolean(tracked[row.id]?.applicationId ?? row.trackedApplicationId) === (show === "tracked")),
		)
		// Newest day first; within a day, the roles that match your preferences first.
		.sort((a, b) => {
			const bucket = (row: Opportunity) => new Date(row.firstSeenAt).setHours(0, 0, 0, 0);
			return (
				bucket(b) - bucket(a) ||
				b.matches.length - a.matches.length ||
				new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime()
			);
		});
	// Pages: a filter change starts at the first page; a role opened from a link starts on the page it is on.
	const pageKey = [mode, search.q, search.source, search.match, show, search.job ?? ""].join("|");
	const linkedIndex = search.job ? matching.findIndex((row) => row.id === search.job) : -1;
	const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
	const page = Math.min(
		pages - 1,
		pageState.key === pageKey ? pageState.page : linkedIndex >= 0 ? Math.floor(linkedIndex / PAGE_SIZE) : 0,
	);
	const visible = matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
	const goToPage = (next: number) => setPageState({ key: pageKey, page: next });
	const selected = visible.find((row) => row.id === search.job) ?? undefined;
	const discovery = schedules.data?.filter((row) => row.kind === "discovery" && !deleted.includes(row.id)) ?? [];
	const active = discovery.find((row) => row.enabled) ?? discovery[0];

	const found = (row: Opportunity) => {
		const offset = dayOffset(row.firstSeenAt, now);
		return offset === 0 ? t`Found today` : offset === -1 ? t`Found yesterday` : t`Found ${day(row.firstSeenAt)}`;
	};
	const dayLabel = (row: Opportunity) => {
		const date = mode === "dismissed" && row.dismissedAt ? row.dismissedAt : row.firstSeenAt;
		const offset = dayOffset(date, now);
		return offset === 0 ? t`Today` : offset === -1 ? t`Yesterday` : day(date);
	};
	const groups: { label: string; rows: Opportunity[] }[] = [];
	for (const row of visible) {
		const label = dayLabel(row);
		const last = groups.at(-1);
		if (last?.label === label) last.rows.push(row);
		else groups.push({ label, rows: [row] });
	}

	const detail = selected && (
		<Preview
			key={selected.id}
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

	const panelTitle = mode === "dismissed" ? t`Dismissed jobs` : t`New opportunities`;
	const body = isError ? (
		<div className="py-5">
			<CareerLoadError
				onRetry={() => {
					void open.refetch();
					void dismissedQuery.refetch();
					void schedules.refetch();
				}}
			/>
		</div>
	) : !rows || !dismissedRows || !schedules.data ? (
		<div className="py-5">
			<Skeleton className="h-52 rounded-xl" />
		</div>
	) : matching.length === 0 ? (
		<div className="py-5">
			<Empty
				mode={mode}
				filtered={list.length > 0}
				active={active}
				onOpenSchedule={onOpenSchedule}
				onClear={() => {
					setShow("all");
					onSearch({ q: "", source: "", match: false });
				}}
			/>
		</div>
	) : (
		<>
			{groups.map((group) => (
				<section key={group.label} aria-label={group.label}>
					<h3 className="flex items-center gap-2 border-b border-line px-3 pt-5 pb-2 text-[11px] font-semibold tracking-[0.11em] text-ink-3 uppercase">
						{group.label}
						<span className="font-mono tracking-normal opacity-70">{group.rows.length}</span>
					</h3>
					<ul aria-label={group.label}>
						<AnimatePresence initial={false}>
							{group.rows.map((row) => (
								<CollapseRow key={row.id} role="listitem">
									<JobRow
										row={row}
										selected={selected?.id === row.id}
										found={mode === "dismissed" && row.dismissedAt ? t`Dismissed ${day(row.dismissedAt)}` : found(row)}
										tracked={tracked[row.id]?.applicationId ?? row.trackedApplicationId ?? undefined}
										dismissed={Boolean(row.dismissedAt)}
										trackPending={track.isPending && track.variables?.id === row.id}
										restorePending={restore.isPending && restore.variables?.id === row.id}
										onSelect={() => onSearch({ job: row.id })}
										onTrack={() => track.mutate({ id: row.id })}
										onRestore={() => restore.mutate({ id: row.id })}
									/>
								</CollapseRow>
							))}
						</AnimatePresence>
					</ul>
				</section>
			))}
			{matching.length > PAGE_SIZE && (
				<nav aria-label={t`Roles pages`} className="flex items-center gap-2 px-3 py-4">
					<span className="me-auto text-xs text-ink-3">
						{t`${page * PAGE_SIZE + 1}–${Math.min(matching.length, (page + 1) * PAGE_SIZE)} of ${matching.length}`}
					</span>
					<Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goToPage(page - 1)}>
						<Trans>Previous</Trans>
					</Button>
					<Button variant="secondary" size="sm" disabled={page >= pages - 1} onClick={() => goToPage(page + 1)}>
						<Trans>Next</Trans>
					</Button>
				</nav>
			)}
		</>
	);

	return (
		<div className="grid gap-4">
			<div className="grid min-w-0 gap-4">
				<section aria-labelledby="jobs-heading" className="grid gap-1">
					<header className="grid gap-3 pb-2">
						<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
							<div className="flex items-baseline gap-2">
								<h2 id="jobs-heading" className="font-display text-[17px] leading-6 font-[750] tracking-[-0.035em]">
									{panelTitle}
								</h2>
								{rows && dismissedRows && (
									<span className="font-mono text-xs text-ink-3">{t`${matching.length} of ${list.length}`}</span>
								)}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<div role="group" aria-label={t`Show`} className="flex flex-wrap items-center gap-1.5">
								{mode === "open" &&
									(
										[
											["all", t`All`, list.length],
											["new", t`New`, newCount],
											["tracked", t`In Applications`, list.length - newCount],
										] as const
									).map(([value, label, count]) => (
										<FilterChip
											key={value}
											pressed={show === value}
											onClick={() => {
												setShow(value);
												onSearch({ job: undefined });
											}}
										>
											{label}
											<span className="ms-1.5 font-mono opacity-70">{count}</span>
										</FilterChip>
									))}
								{mode === "open" && <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />}
								<FilterChip pressed={search.match} onClick={() => onSearch({ match: !search.match, job: undefined })}>
									<Trans>Matches my preferences</Trans>
								</FilterChip>
							</div>
							<div className="ms-auto flex items-center gap-2 max-sm:w-full max-sm:flex-wrap">
								<Input
									type="search"
									aria-label={t`Search roles`}
									placeholder={t`Search roles`}
									value={search.q}
									onChange={(event) => onSearch({ q: event.target.value })}
									className="h-9 w-56 max-sm:w-full"
								/>
								{sources.length > 1 && (
									<div className="w-40 max-sm:w-full">
										<NativeSelect
											aria-label={t`Source`}
											value={search.source}
											onChange={(event) => onSearch({ source: event.target.value, job: undefined })}
											className="h-9"
										>
											<option value="">{t`All sources`}</option>
											{sources.map((source) => (
												<option key={source} value={source}>
													{source}
												</option>
											))}
										</NativeSelect>
									</div>
								)}
							</div>
						</div>
					</header>
					{body}
				</section>
				<p className="rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-xs leading-[1.75] text-ink">
					{mode === "dismissed" ? (
						<Trans>Restoring returns an opportunity to Discover. It does not create an application.</Trans>
					) : (
						<Trans>
							Tracking creates an application. Jobs already tracked open their existing application; they are never
							added twice.
						</Trans>
					)}
				</p>
			</div>

			<Sheet open={Boolean(search.job && detail)} onOpenChange={(next) => !next && onSearch({ job: undefined })}>
				<SheetContent
					side={side}
					showCloseButton={false}
					className={cn("gap-0", side === "bottom" ? "max-h-[90svh]" : "data-[side=right]:sm:max-w-[560px]")}
				>
					<div className="flex items-center gap-3 border-b border-line ps-[22px] pe-3 pt-[18px] pb-3.5">
						<SheetTitle className="flex-1">
							<Trans>Opportunity</Trans>
						</SheetTitle>
						<SheetClose aria-label={t`Close`} render={<Button variant="ghost" size="icon" className="text-ink-2" />}>
							<Icon name="x" />
						</SheetClose>
					</div>
					<div className="overflow-y-auto px-[22px] py-5">{detail}</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

type EmptyProps = {
	mode: JobsMode;
	/** Roles exist in this view but the filters hide them all. */
	filtered: boolean;
	active: { id: string; enabled: boolean } | undefined;
	onOpenSchedule: (schedule: string) => void;
	onClear: () => void;
};

function Empty({ mode, filtered, active, onOpenSchedule, onClear }: EmptyProps) {
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
	if (mode === "dismissed")
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

type JobRowProps = {
	row: Opportunity;
	selected: boolean;
	/** Where and when it was found, shown at the end of the row on wide screens. */
	found: string;
	/** The application this role is tracked as, if any. */
	tracked: string | undefined;
	dismissed: boolean;
	trackPending: boolean;
	restorePending: boolean;
	onSelect: () => void;
	onTrack: () => void;
	onRestore: () => void;
};

/** One role in the list: selecting it shows the preview; its own button does the one thing that fits it. */
function JobRow({
	row,
	selected,
	found,
	tracked,
	dismissed,
	trackPending,
	restorePending,
	onSelect,
	onTrack,
	onRestore,
}: JobRowProps) {
	const company = companyOf(row);
	const unknownLabels = { salary: t`Salary not listed`, office: t`Office days not stated` };
	// What the posting leaves out is a quiet note; what matches your preferences is a chip.
	const unknown = row.unknowns.map((item) => unknownLabels[item]).join(" · ");
	return (
		<div
			data-role-card
			className={cn(
				"flex items-center gap-3 border-b border-line/60 px-3 py-3 transition-colors duration-quick last:border-b-0",
				selected ? "rounded-lg bg-accent-soft/60" : "hover:rounded-lg hover:bg-hover",
			)}
		>
			<button
				type="button"
				aria-pressed={selected}
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-3 text-start"
			>
				<span
					aria-hidden="true"
					className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft font-display text-sm font-bold text-accent-text"
				>
					{getInitials(company).slice(0, 1)}
				</span>
				<span className="grid min-w-0 flex-1 gap-0.5">
					<span className="line-clamp-2 text-[13px] leading-snug font-bold">{row.role}</span>
					<span className="truncate text-xs text-ink-3">{[company, row.location].filter(Boolean).join(" · ")}</span>
					{(row.matches.length > 0 || unknown) && (
						<span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
							{row.matches.map((match) => (
								<InfoChip key={match} tone="match">
									{match}
								</InfoChip>
							))}
							{unknown && <span className="text-[11px] text-ink-3">{unknown}</span>}
						</span>
					)}
				</span>
			</button>
			<span className="hidden w-44 shrink-0 text-end text-xs text-ink-3 lg:grid">
				<span className="truncate">{hostOf(row.url)}</span>
				<span>{found}</span>
			</span>
			<div className="flex shrink-0 items-center gap-2">
				{dismissed ? (
					<Button variant="secondary" size="sm" loading={restorePending} onClick={onRestore}>
						<Trans>Restore</Trans>
					</Button>
				) : tracked ? (
					<>
						<Badge variant="ok" className="max-md:hidden">
							<Icon name="check" size={12} />
							<Trans>In Applications</Trans>
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							className="text-accent-text"
							nativeButton={false}
							render={<Link to="/dashboard/applications/$applicationId/{-$tab}" params={{ applicationId: tracked }} />}
						>
							<Trans>Open</Trans>
						</Button>
					</>
				) : (
					<Button variant="secondary" size="sm" loading={trackPending} onClick={onTrack}>
						<Trans>Track job</Trans>
					</Button>
				)}
			</div>
		</div>
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
		<article aria-labelledby={`preview-${row.id}`} className="grid gap-5">
			<header className="grid gap-1">
				<h2 id={`preview-${row.id}`} className="font-display text-[22px] leading-7 font-[750] tracking-[-0.035em]">
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
					<h3 className="text-[11px] font-semibold tracking-[0.11em] text-ink-3 uppercase">
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
				<h3 className="text-[11px] font-semibold tracking-[0.11em] text-ink-3 uppercase">
					<Trans>Posting</Trans>
				</h3>
				{detail.isPending ? <Skeleton className="h-24" /> : <PostingText text={posting} />}
				{detail.isError && (
					<p className="text-xs text-warn-text">
						<Trans>The full posting couldn't be loaded. Showing the search summary.</Trans>
					</p>
				)}
			</section>

			<section aria-label={t`Where it came from`} className="grid gap-1 text-[13px] text-ink-2">
				<h3 className="text-[11px] font-semibold tracking-[0.11em] text-ink-3 uppercase">
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

/** The posting, a few lines at first; the rest opens in place, so there is no scroll box inside the panel. */
function PostingText({ text }: { text: string }) {
	const [expanded, setExpanded] = useState(false);
	const long = text.length > 480;
	return (
		<div className="grid gap-1.5">
			<p className={cn("text-sm leading-[21px] whitespace-pre-line text-ink-2", long && !expanded && "line-clamp-[9]")}>
				{text}
			</p>
			{long && (
				<button
					type="button"
					aria-expanded={expanded}
					onClick={() => setExpanded(!expanded)}
					className="w-fit text-[13px] font-semibold text-accent-text hover:underline"
				>
					{expanded ? <Trans>Show less</Trans> : <Trans>Read the full posting</Trans>}
				</button>
			)}
		</div>
	);
}
