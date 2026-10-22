import type { RouterOutput } from "@/libs/orpc/client";
import type { InterviewKind } from "@reactive-resume/schema/applications/data";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { toast } from "@reactive-resume/ui/components/toast";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { PageHeader } from "@/components/layout/page-header";
import { AddApplicationDialog } from "@/features/applications/components/add-application-dialog";
import { interviewKindOf } from "@/features/applications/interviews";
import { useCareerTime, useNow } from "@/features/career/shared";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type Overview = RouterOutput["career"]["overview"];
type Action = Overview["actions"]["items"][number];
type Days = 7 | 14 | 30;
type Tab = "all" | "ready" | "followups" | "issues";

/** Overview: your next actions, what is coming up, how automation and discovery are doing, and your outcomes. */
export function OverviewPage() {
	const [days, setDays] = useState<Days>(30);
	const [adding, setAdding] = useState(false);
	const navigate = useNavigate();
	const { timeZone } = useCareerTime();
	const { data, isError, refetch, isFetching } = useQuery({
		...orpc.career.overview.queryOptions({ input: { days } }),
		placeholderData: (previous) => previous,
		refetchInterval: 60_000,
	});
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Overview</Trans>}
				description={<Trans>Your applications, priorities and progress.</Trans>}
				actions={
					<Button variant="secondary" onClick={() => setAdding(true)}>
						<Icon name="plus" size={18} />
						<Trans>Add application</Trans>
					</Button>
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
				<div className={cn("grid gap-5", isFetching && "opacity-90")}>
					<FinishSetup />
					<DiscoveryBanner data={data} />
					<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
						<span>
							{t`${data.needsYou.savedJobs} saved applications · ${data.needsYou.readyDocuments} with documents ready`}
						</span>
						<RemindersLink />
					</p>
					<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
						<div className="grid gap-5">
							<NextActions data={data} />
							<RecentActivity />
						</div>
						<div className="grid gap-5">
							<ComingUp data={data} />
							<AutomationCard data={data} />
						</div>
					</div>
					<Outcomes data={data} days={days} onDays={setDays} />
					<LatestDiscovery data={data} />
					<p className="text-xs text-ink-3">{t`Times shown in ${timeZone}`}</p>
				</div>
			)}
			<AddApplicationDialog
				open={adding}
				onOpenChange={setAdding}
				onAdded={(applicationId) =>
					void navigate({ to: "/dashboard/applications/$applicationId/{-$tab}", params: { applicationId } })
				}
			/>
		</div>
	);
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
	return <section className={cn("rounded-xl border border-line bg-surface", className)}>{children}</section>;
}

function CardTitle({ icon, children }: { icon: IconName; children: React.ReactNode }) {
	return (
		<h2 className="flex items-center gap-2.5 text-[17px] font-semibold">
			<Icon name={icon} size={22} className="text-ink-2" />
			{children}
		</h2>
	);
}

// ---- Banners ----

/** Reminders (notifications and the next interview) until Overview shows them in place. */
function RemindersLink() {
	const { data } = useQuery(orpc.career.notifications.queryOptions({ input: {} }));
	const unread = data?.filter((notification) => !notification.readAt).length ?? 0;
	return (
		<Link to="/dashboard/career" className="ms-auto inline-flex items-center gap-1.5 text-accent-text underline">
			<Trans>Reminders</Trans>
			{unread > 0 && <span className="font-mono text-xs no-underline">{unread}</span>}
		</Link>
	);
}

/** A reminder for someone who skipped guided setup; gone once setup is finished. */
function FinishSetup() {
	const { data: setup } = useQuery(orpc.career.setup.queryOptions({ input: {} }));
	if (!setup || setup.completed || !setup.skipped) return null;
	return (
		<Link
			to="/dashboard/start"
			className="flex items-center gap-3 rounded-xl border border-accent bg-accent-soft px-4 py-3 text-sm"
		>
			<Icon name="compass" size={20} className="shrink-0 text-accent-text" />
			<span className="min-w-0 flex-1">
				<b className="font-semibold">
					<Trans>Finish setting up your job search</Trans>
				</b>{" "}
				<span className="text-ink-2">
					<Trans>Confirm your baseline resume, connect services and start discovery.</Trans>
				</span>
			</span>
			<Icon name="arrow-right" size={18} className="shrink-0 rtl:-scale-x-100" />
		</Link>
	);
}

/** Discovery paused or failing: said once, at the top, with the one action that fixes it. */
function DiscoveryBanner({ data }: { data: Overview }) {
	const queryClient = useQueryClient();
	const resume = useMutation(
		orpc.career.setScheduleEnabled.mutationOptions({
			onSuccess: () => {
				toast.add({ description: t`Discovery resumed` });
				void queryClient.invalidateQueries({ queryKey: orpc.career.key() });
			},
			onError: (error) =>
				toast.add({
					type: "error",
					description: getOrpcErrorMessage(error, {
						fallback: t`Couldn't resume discovery.`,
						allowServerMessage: true,
					}),
				}),
		}),
	);
	const { discovery } = data;
	if (!discovery.scheduleId) return null;
	if (discovery.failing)
		return (
			<div className="flex flex-wrap items-center gap-4 rounded-xl border border-danger bg-danger-soft px-5 py-4">
				<Icon name="warning-circle" size={34} className="shrink-0 text-danger-text" />
				<div className="grid min-w-0 flex-1 gap-0.5">
					<b className="text-base font-semibold text-danger-text">
						<Trans>The last discovery run failed</Trans>
					</b>
					<span className="text-[13px] text-ink-2">
						<Trans>Open Search activity to see why and what to do.</Trans>
					</span>
				</div>
				<Button variant="secondary" nativeButton={false} render={<Link to="/dashboard/discover/activity" />}>
					<Trans>See why</Trans>
				</Button>
			</div>
		);
	if (discovery.enabled) return null;
	return (
		<div className="flex flex-wrap items-center gap-4 rounded-xl border border-warn-text/50 bg-warn-soft px-5 py-4">
			<Icon name="pause" size={34} className="shrink-0 text-warn-text" />
			<div className="grid min-w-0 flex-1 gap-0.5">
				<b className="text-base font-semibold">
					<Trans>Discovery is paused</Trans>
				</b>
				<span className="text-[13px] text-ink-2">
					<Trans>Your saved applications and documents are available.</Trans>
				</span>
			</div>
			<Button
				loading={resume.isPending}
				onClick={() => resume.mutate({ id: discovery.scheduleId ?? "", enabled: true })}
			>
				<Trans>Resume discovery</Trans>
			</Button>
		</div>
	);
}

// ---- Your next actions ----

/** A letter on a colour taken from the company name, so the same company always looks the same. */
function Avatar({ name }: { name: string }) {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
	return (
		<span
			aria-hidden="true"
			className="grid size-11 shrink-0 place-items-center rounded-lg text-lg font-semibold text-white"
			style={{ backgroundColor: `hsl(${hash} 50% 48%)` }}
		>
			{getInitials(name).slice(0, 1) || "?"}
		</span>
	);
}

const documentName = (kind: "resume" | "letter") => (kind === "resume" ? t`Resume` : t`Cover letter`);

/** The chip, the line under it and the button for one action. */
function describeAction(action: Action) {
	const done = action.done.map(documentName).join(" · ");
	if (action.kind === "issue") {
		const failed = action.failed.map(documentName).join(" · ");
		const failure = t`${failed} generation failed`;
		return {
			chip: t`${failed} needs attention`,
			tone: "warn" as const,
			line: done ? `${t`${done} ready`} · ${failure}` : failure,
			button: t`Resolve`,
		};
	}
	if (action.kind === "followup") {
		const days = action.followUpInDays ?? 0;
		const absolute = Math.abs(days);
		const due =
			days === 0
				? t`Follow-up due today`
				: days === -1
					? t`Follow-up due yesterday`
					: days < 0
						? t`Follow-up due ${absolute} days ago`
						: days === 1
							? t`Follow-up due tomorrow`
							: t`Follow-up due in ${days} days`;
		const applied = action.appliedDaysAgo;
		return {
			chip: action.code === "overdue" ? t`Follow-up overdue` : t`Follow-up due`,
			tone: "warn" as const,
			line: applied === null ? due : `${t`Applied ${applied} days ago`} · ${due}`,
			button: t`Follow up`,
		};
	}
	if (action.kind === "stale")
		return {
			chip: t`Drafts need updating`,
			tone: "info" as const,
			line: t`Your resume or the posting changed since generation`,
			button: t`Review changes`,
		};
	return {
		chip: t`Documents ready`,
		tone: "good" as const,
		line: action.done.length === 2 ? t`Resume and cover letter prepared` : t`${done} prepared`,
		button: t`Review`,
	};
}

const CHIP = {
	good: { text: "text-accent-text", dot: "bg-accent" },
	warn: { text: "text-warn-text", dot: "bg-warn-text" },
	info: { text: "text-info-text", dot: "bg-info-text" },
} as const;

function NextActions({ data }: { data: Overview }) {
	const [tab, setTab] = useState<Tab>("all");
	const { counts, items } = data.actions;
	const shown = items.filter((action) =>
		tab === "all"
			? true
			: tab === "ready"
				? action.kind === "ready" || action.kind === "stale"
				: tab === "followups"
					? action.kind === "followup"
					: action.kind === "issue",
	);
	const tabs: { key: Tab; label: string; count?: number; bad?: boolean }[] = [
		{ key: "all", label: t`All` },
		{ key: "ready", label: t`Documents ready`, count: counts.ready },
		{ key: "followups", label: t`Follow-ups`, count: counts.followUps },
		{ key: "issues", label: t`Issues`, count: counts.issues, bad: true },
	];
	return (
		<Card className="grid gap-3 p-5">
			<div className="flex items-start gap-3">
				<Icon name="list-checks" size={26} className="mt-0.5 shrink-0 text-ink-2" />
				<div className="grid gap-0.5">
					<h2 className="text-[19px] font-semibold">
						<Trans>Your next actions</Trans>
					</h2>
					<p className="text-[13px] text-ink-2">
						<Trans>Review applications and resolve what needs you.</Trans>
					</p>
				</div>
			</div>
			<div role="tablist" aria-label={t`Your next actions`} className="flex flex-wrap gap-x-6 border-b border-line">
				{tabs.map((item) => (
					<button
						key={item.key}
						type="button"
						role="tab"
						aria-selected={tab === item.key}
						onClick={() => setTab(item.key)}
						className={cn(
							"-mb-px flex items-center gap-2 border-b-2 py-2.5 text-sm font-medium",
							tab === item.key ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink-2",
						)}
					>
						{item.label}
						{item.count !== undefined && item.count > 0 && (
							<span
								className={cn(
									"rounded-full px-2 py-0.5 text-xs tabular-nums",
									item.bad ? "bg-danger-soft text-danger-text" : "bg-sunken",
								)}
							>
								{item.count}
							</span>
						)}
					</button>
				))}
			</div>
			{shown.length === 0 ? (
				<p className="py-6 text-center text-sm text-ink-3">
					<Trans>You are up to date. Nothing needs you right now.</Trans>
				</p>
			) : (
				<ul className="grid">
					{shown.map((action) => (
						<ActionRow key={`${action.kind}-${action.applicationId}`} action={action} />
					))}
				</ul>
			)}
			<Link
				to="/dashboard/applications"
				className="flex w-fit items-center gap-1.5 text-[13px] text-accent-text underline"
			>
				<Trans>View all applications</Trans>
				<Icon name="arrow-right" size={14} className="rtl:-scale-x-100" />
			</Link>
		</Card>
	);
}

function ActionRow({ action }: { action: Action }) {
	const info = describeAction(action);
	const chip = CHIP[info.tone];
	const place = [action.company, action.location].filter(Boolean).join(" · ");
	// Documents to resolve, review or refresh open that application's Documents; a follow-up opens its Messages.
	const target = (
		<Link
			to="/dashboard/applications/$applicationId/{-$tab}"
			params={{ applicationId: action.applicationId, tab: action.kind === "followup" ? "messages" : "documents" }}
		/>
	);
	return (
		<li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-line py-3.5 first:border-t-0 max-sm:grid-cols-[auto_minmax(0,1fr)]">
			<Avatar name={action.company || action.role} />
			<div className="grid min-w-0 gap-0.5">
				<span className="truncate text-[15px] font-semibold">{action.role}</span>
				<span className="truncate text-[13px] text-ink-3">{place}</span>
				<span className="mt-1.5 grid gap-1 sm:hidden">
					<Chip label={info.chip} tone={chip} />
					<span className="text-xs text-ink-3">{info.line}</span>
				</span>
			</div>
			<div className="flex items-center gap-3 max-sm:col-span-2">
				<span className="grid max-w-65 gap-1 max-sm:hidden">
					<Chip label={info.chip} tone={chip} />
					<span className="text-xs leading-4 text-ink-3">{info.line}</span>
				</span>
				<Button variant="secondary" nativeButton={false} render={target}>
					{info.button}
				</Button>
				<Icon name="caret-right" size={16} className="text-ink-3 max-sm:hidden rtl:-scale-x-100" />
			</div>
		</li>
	);
}

function Chip({ label, tone }: { label: string; tone: { text: string; dot: string } }) {
	return (
		<span
			className={cn("flex w-fit items-center gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-xs font-medium", tone.text)}
		>
			<span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden="true" />
			{label}
		</span>
	);
}

// ---- Recent activity ----

type Recent = {
	key: string;
	icon: IconName;
	tone: string;
	title: string;
	sub: string;
	at: Date;
	action: { label: string; to: "/dashboard/discover" | "/dashboard/discover/activity" | "/dashboard/automation" };
};

/** Turns the raw log into a few readable lines: searches, documents prepared per job, failures, and pauses. */
function summarizeActivity(events: RouterOutput["career"]["activity"]["items"]): Recent[] {
	const out: Recent[] = [];
	const documents = new Map<string, { item: Recent; kinds: string[] }>();
	for (const event of events) {
		const company = typeof event.data.company === "string" && event.data.company ? event.data.company : t`a job`;
		const kind = event.data.kind === "letter" ? t`Cover letter` : t`Resume`;
		if (event.kind === "run.finished") {
			const matches = Number(event.data.matches ?? 0);
			if (event.data.outcome === "failed")
				out.push({
					key: event.id,
					icon: "warning-circle",
					tone: "text-danger-text",
					title: t`Discovery run failed`,
					sub: t`Needs attention`,
					at: event.at,
					action: { label: t`Resolve`, to: "/dashboard/discover/activity" },
				});
			else if (matches > 0)
				out.push({
					key: event.id,
					icon: "file-plus",
					tone: "text-accent-text",
					title: matches === 1 ? t`1 new job saved` : t`${matches} new jobs saved`,
					sub: t`Latest search`,
					at: event.at,
					action: { label: t`View jobs`, to: "/dashboard/discover" },
				});
		} else if (event.kind === "prep.done" && event.opportunityId) {
			const existing = documents.get(event.opportunityId);
			if (existing) existing.kinds.push(kind);
			else {
				const item: Recent = {
					key: event.id,
					icon: "file-text",
					tone: "text-accent-text",
					title: t`Documents prepared for ${company}`,
					sub: "",
					at: event.at,
					action: { label: t`Review`, to: "/dashboard/automation" },
				};
				documents.set(event.opportunityId, { item, kinds: [kind] });
				out.push(item);
			}
		} else if (event.kind === "prep.failed")
			out.push({
				key: event.id,
				icon: "warning-circle",
				tone: "text-warn-text",
				title: t`${kind} generation failed for ${company}`,
				sub: t`Needs attention`,
				at: event.at,
				action: { label: t`Resolve`, to: "/dashboard/automation" },
			});
		else if (event.kind === "setting.changed" && event.data.what === "discovery")
			out.push({
				key: event.id,
				icon: "pause",
				tone: "text-warn-text",
				title: event.data.on ? t`Discovery resumed` : t`Discovery paused`,
				sub: event.data.on ? t`Searching again` : t`Resume anytime`,
				at: event.at,
				action: { label: t`Activity`, to: "/dashboard/discover/activity" },
			});
	}
	for (const { item, kinds } of documents.values()) item.sub = [...new Set(kinds)].toReversed().join(` ${t`and`} `);
	return out.slice(0, 4);
}

function RecentActivity() {
	const { relative } = useCareerTime();
	const { data } = useQuery({
		...orpc.career.activity.queryOptions({ input: { limit: 30 } }),
		refetchInterval: 60_000,
	});
	const items = data ? summarizeActivity(data.items) : [];
	return (
		<Card className="grid gap-2 p-5">
			<div className="flex items-center gap-2">
				<CardTitle icon="clock-counter-clockwise">
					<Trans>Recent activity</Trans>
				</CardTitle>
				<Link to="/dashboard/discover/activity" className="ms-auto text-[13px] text-accent-text underline">
					<Trans>See all</Trans>
				</Link>
			</div>
			{data && items.length === 0 ? (
				<p className="py-4 text-sm text-ink-3">
					<Trans>Nothing yet. Activity appears here after the first run.</Trans>
				</p>
			) : (
				<ul className="grid">
					{items.map((item) => (
						<li key={item.key} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
							<span className={cn("grid size-10 shrink-0 place-items-center rounded-lg bg-sunken", item.tone)}>
								<Icon name={item.icon} size={20} />
							</span>
							<span className="grid min-w-0 flex-1 gap-0.5">
								<span className="truncate text-sm font-semibold">{item.title}</span>
								<span className="truncate text-xs text-ink-3">
									{item.sub ? `${item.sub} · ${relative(item.at)}` : relative(item.at)}
								</span>
							</span>
							<Link
								to={item.action.to}
								className="flex shrink-0 items-center gap-1.5 text-[13px] text-accent-text underline"
							>
								{item.action.label}
								<Icon name="arrow-right" size={14} className="rtl:-scale-x-100" />
							</Link>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}

// ---- Coming up ----

function ComingUp({ data }: { data: Overview }) {
	const { format, time } = useCareerTime();
	const now = useNow();
	const next = data.nextInterview;
	const dayWord = (at: Date) => {
		const key = (value: Date) => format(value, { dateStyle: "short" });
		if (key(at) === key(now)) return t`Today`;
		if (key(at) === key(new Date(now.getTime() + 86_400_000))) return t`Tomorrow`;
		return format(at, { weekday: "short", day: "numeric", month: "short" });
	};
	return (
		<Card className="grid gap-4 p-5">
			<CardTitle icon="calendar-blank">
				<Trans>Coming up</Trans>
			</CardTitle>
			{!next ? (
				<div className="grid place-items-center gap-1.5 rounded-lg border border-dashed border-line px-4 py-9 text-center">
					<Icon name="calendar-blank" size={30} className="text-ink-3" />
					<p className="text-sm font-semibold">
						<Trans>No interviews scheduled</Trans>
					</p>
					<p className="text-[13px] text-ink-3">
						<Trans>Your interviews will appear here.</Trans>
					</p>
				</div>
			) : (
				<div className="grid gap-3.5 rounded-lg border border-line p-4">
					<div className="flex gap-4">
						<span className="grid size-17 shrink-0 place-items-center rounded-lg border border-line bg-sunken text-center leading-tight">
							<span className="grid">
								<b className="text-[26px] leading-7 font-semibold tabular-nums">
									{format(next.at, { day: "numeric" })}
								</b>
								<span className="text-xs tracking-wide text-ink-2 uppercase">
									{format(next.at, { month: "short" })}
								</span>
							</span>
						</span>
						<div className="grid min-w-0 content-center gap-0.5">
							<span className="truncate text-base font-semibold">
								{interviewKindOf(next.kind as InterviewKind)?.label ?? t`Interview`}
							</span>
							<span className="truncate text-[13px] text-ink-2">
								{next.company} · {dayWord(next.at)}, {time(next.at)}
							</span>
							<span className="text-xs text-ink-3">
								{t`${next.durationMinutes} min`} · {next.timezone}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-3 border-t border-line pt-3.5">
						<ul className="grid min-w-0 flex-1 gap-2 text-[13px]">
							<Prep ok={next.briefing} yes={t`Briefing available`} no={t`Briefing not ready`} />
							<Prep ok={next.practice} yes={t`Practice started`} no={t`Practice not started`} />
						</ul>
						<Button
							nativeButton={false}
							render={
								<Link
									to="/dashboard/applications/$applicationId/{-$tab}"
									params={{ applicationId: next.applicationId, tab: "interviews" }}
									search={{ section: "prepare", ...(next.interviewId ? { round: next.interviewId } : {}) }}
								/>
							}
						>
							<Trans>Prepare interview</Trans>
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}

function Prep({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
	return (
		<li className="flex items-center gap-2.5">
			<Icon name={ok ? "check-circle" : "clock"} size={20} className={ok ? "text-accent-text" : "text-ink-3"} />
			{ok ? yes : no}
		</li>
	);
}

// ---- Automation ----

function AutomationCard({ data }: { data: Overview }) {
	const { automation: a, discovery } = data;
	const pct = Math.min(100, Math.round((a.used / Math.max(1, a.limit)) * 100));
	const rows: {
		label: string;
		icon: IconName;
		state: "on" | "off" | "paused";
		to: "/dashboard/automation";
	}[] = [
		{
			label: t`Discovery`,
			icon: "magnifying-glass",
			state: !discovery.scheduleId ? "off" : discovery.enabled ? "on" : "paused",
			to: "/dashboard/automation",
		},
		{
			label: t`Tailored resumes`,
			icon: "file-text",
			state: a.resumesEnabled ? "on" : "off",
			to: "/dashboard/automation",
		},
		{
			label: t`Cover letters`,
			icon: "file-text",
			state: a.lettersEnabled ? "on" : "off",
			to: "/dashboard/automation",
		},
	];
	const dot = { on: "bg-accent", off: "bg-line-2", paused: "bg-warn-text" } as const;
	const word = { on: t`On`, off: t`Off`, paused: t`Paused` } as const;
	const working = [
		a.generating > 0 ? t`${a.generating} generating` : null,
		a.deferred > 0 ? t`${a.deferred} deferred` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<Card className="grid gap-3 p-5">
			<CardTitle icon="gear-six">
				<Trans>Automation</Trans>
			</CardTitle>
			<ul className="grid overflow-hidden rounded-lg border border-line">
				{rows.map((row) => (
					<li key={row.label} className="border-t border-line first:border-t-0">
						<Link
							to={row.to}
							className="flex items-center gap-3 px-3.5 py-3 text-sm transition-colors duration-quick hover:bg-hover"
						>
							<Icon name={row.icon} size={20} className="text-ink-2" />
							<span className="flex-1">{row.label}</span>
							<span className="flex items-center gap-2 text-[13px] text-ink-2">
								<span className={cn("size-2.5 rounded-full", dot[row.state])} aria-hidden="true" />
								{word[row.state]}
							</span>
							<Icon name="caret-right" size={14} className="text-ink-3 rtl:-scale-x-100" />
						</Link>
					</li>
				))}
			</ul>
			<Link
				to="/dashboard/automation"
				className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-3 text-sm transition-colors duration-quick hover:bg-hover"
			>
				<Icon name="arrow-clockwise" size={20} className="text-ink-2" />
				<span className="flex-1">
					<Trans>Preparation</Trans>
				</span>
				<span className="text-[13px] text-ink-2">{working || t`Idle`}</span>
				<Icon name="caret-right" size={14} className="text-ink-3 rtl:-scale-x-100" />
			</Link>
			<div className="grid gap-2 pt-1">
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-ink-2">
						<Trans>Documents today</Trans>
					</span>
					<span className="font-semibold tabular-nums">
						{a.used} / {a.limit}
					</span>
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
			<Link
				to="/dashboard/automation"
				className="flex w-fit items-center gap-1.5 text-[13px] text-accent-text underline"
			>
				<Trans>Manage automation</Trans>
				<Icon name="arrow-right" size={14} className="rtl:-scale-x-100" />
			</Link>
		</Card>
	);
}

// ---- Application outcomes ----

function Outcomes({ data, days, onDays }: { data: Overview; days: Days; onDays: (days: Days) => void }) {
	const stats = [
		{ value: data.outcomes.submitted, label: t`Submitted` },
		{ value: data.outcomes.firstResponses, label: t`First responses` },
		{ value: data.outcomes.interviews, label: t`Applications reached interview` },
		{ value: data.outcomes.offers, label: t`Offers` },
	];
	return (
		<Card className="grid gap-4 p-5">
			<div className="flex flex-wrap items-center gap-3">
				<CardTitle icon="chart-line-up">
					<Trans>Application outcomes</Trans>
				</CardTitle>
				<NativeSelect
					aria-label={t`Time window`}
					value={String(days)}
					onChange={(event) => onDays(Number(event.target.value) as Days)}
					className="ms-auto w-auto"
				>
					<option value="7">{t`Last 7 days`}</option>
					<option value="14">{t`Last 14 days`}</option>
					<option value="30">{t`Last 30 days`}</option>
				</NativeSelect>
			</div>
			<ul className="grid grid-cols-2 gap-y-4 lg:grid-cols-4">
				{stats.map((stat, index) => (
					<li
						key={stat.label}
						className={cn("flex items-baseline gap-3 px-4", index > 0 && "lg:border-s lg:border-line")}
					>
						<span className="text-[32px] leading-9 font-semibold tabular-nums">{stat.value}</span>
						<span className="text-[13px] text-ink-2">{stat.label}</span>
					</li>
				))}
			</ul>
			<div className="flex flex-wrap items-center gap-3">
				<p className="text-xs text-ink-3">
					<Trans>Based on recorded application activity.</Trans>
				</p>
				<Link
					to="/dashboard/applications"
					search={{ view: "insights" }}
					className="ms-auto flex items-center gap-1.5 text-[13px] text-accent-text underline"
				>
					<Trans>View insights</Trans>
					<Icon name="arrow-right" size={14} className="rtl:-scale-x-100" />
				</Link>
			</div>
		</Card>
	);
}

// ---- Latest discovery ----

function LatestDiscovery({ data }: { data: Overview }) {
	const { relative } = useCareerTime();
	const latest = data.latestDiscovery;
	if (!latest) return null;
	const status =
		latest.outcome === "failed"
			? { dot: "bg-danger", text: t`Failed. Open discovery activity to see why.` }
			: latest.outcome === "partial"
				? {
						dot: "bg-warn-text",
						text:
							latest.readFailures === 1
								? t`Partial — 1 page could not be read`
								: t`Partial — ${latest.readFailures} pages could not be read`,
					}
				: { dot: "bg-accent", text: t`Completed` };
	const summary =
		latest.matches === 1 ? t`1 new job` : latest.matches === 0 ? t`No new jobs` : t`${latest.matches} new jobs`;
	return (
		<Card className="grid gap-3 p-5">
			<div className="grid gap-1">
				<CardTitle icon="magnifying-glass">
					<Trans>Latest discovery</Trans>
				</CardTitle>
				<p className="text-[13px] text-ink-2">
					{summary} · {t`${latest.found} results checked`} · {relative(latest.at)}
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
				<div className="grid min-w-0 flex-1 gap-1">
					{latest.job ? (
						<span className="truncate text-sm font-semibold">
							{latest.job.role}
							<span className="font-normal text-ink-3"> · {latest.job.location || latest.job.company}</span>
						</span>
					) : (
						<span className="text-sm text-ink-3">
							<Trans>This search found nothing new.</Trans>
						</span>
					)}
					<span className="flex items-center gap-2 text-[13px] text-ink-2">
						<span className={cn("size-2.5 rounded-full", status.dot)} aria-hidden="true" />
						{status.text}
					</span>
				</div>
				<Link
					to="/dashboard/discover/activity"
					className="flex items-center gap-1.5 text-[13px] text-accent-text underline"
				>
					<Trans>View discovery activity</Trans>
					<Icon name="arrow-right" size={14} className="rtl:-scale-x-100" />
				</Link>
				<Button
					variant="secondary"
					nativeButton={false}
					render={<Link to="/dashboard/discover" search={{ schedule: data.discovery.scheduleId ?? "new:discovery" }} />}
				>
					<Trans>Edit search</Trans>
				</Button>
			</div>
		</Card>
	);
}
