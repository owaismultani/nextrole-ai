import type { RouterOutput } from "@/libs/orpc/client";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { cn } from "@reactive-resume/utils/style";
import { CareerLoadError } from "./load-state";
import { failed, SectionHeading, useDayOffset } from "./section";
import { CollapseRow, Eyebrow, Swap, useCareerTime, useNow, withUndo } from "./shared";
import {
	collectInterviews,
	formatDuration,
	interviewKindOf,
	upcomingInterviews,
} from "@/features/applications/interviews";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { orpc } from "@/libs/orpc/client";

type Notification = RouterOutput["career"]["notifications"][number];

/**
 * Reminders: what needs you and the next interview. Discovered roles live in Discover and schedules in Automation;
 * Overview takes these two over and this page then goes away.
 */
export function TodayPage() {
	const now = useNow();
	return (
		<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
			<NeedsYou now={now} className="order-2 lg:order-none" />
			<ComingUp now={now} className="order-1 lg:order-none" />
		</div>
	);
}

// ---- Needs you ----

const notificationKind = (kind: Notification["notice"]["type"]): { icon: IconName; tone: string; action: string } => {
	if (kind === "opportunities") return { icon: "globe-simple", tone: "bg-info-soft text-info-text", action: t`Review` };
	if (kind === "followup") return { icon: "envelope", tone: "bg-warn-soft text-warn-text", action: t`Review draft` };
	if (kind === "briefing")
		return { icon: "clipboard-text", tone: "bg-accent-soft text-accent-text", action: t`Open briefing` };
	return { icon: "info", tone: "bg-warn-soft text-warn-text", action: t`Open` };
};

type NeedsYouProps = { now: Date; className?: string };

function NeedsYou({ now, className }: NeedsYouProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { time, when, locale } = useCareerTime();
	const dayOffset = useDayOffset();
	const queryKey = orpc.career.notifications.queryKey({ input: {} });
	const { data, isError, refetch } = useQuery(orpc.career.notifications.queryOptions({ input: {} }));
	const applicationQuery = useQuery(applicationsListQueryOptions());
	const applications = applicationQuery.data;
	const [showRead, setShowRead] = useState(false);
	const [pending, setPending] = useState<string[]>([]);
	const setReadAt = (id: string, readAt: Date | null) =>
		queryClient.setQueryData(queryKey, (current) => current?.map((row) => (row.id === id ? { ...row, readAt } : row)));
	const markRead = useMutation({
		...orpc.career.markNotificationRead.mutationOptions(),
		onError: (error, { id }) => {
			setPending((current) => current.filter((item) => item !== id));
			setReadAt(id, null);
			failed(error, t`Couldn't mark this as read.`);
		},
	});

	const isUnread = (row: Notification) => !row.readAt && !pending.includes(row.id);
	const unread = data?.filter(isUnread) ?? [];
	const read = data?.filter((row) => !isUnread(row)) ?? [];
	const rows = showRead ? (data ?? []) : unread;

	// Hidden at once; the server hears about it when the toast closes. The cache edit drops the sidebar count too,
	// while `pending` keeps the row hidden through any refetch.
	const dismiss = (row: Notification) => {
		setPending((current) => [...current, row.id]);
		setReadAt(row.id, new Date());
		withUndo({
			description: t`Marked as read`,
			commit: () => markRead.mutate({ id: row.id }),
			onUndo: () => {
				setPending((current) => current.filter((id) => id !== row.id));
				setReadAt(row.id, null);
			},
		});
	};

	const meta = (row: Notification) => {
		const source =
			row.notice.type === "opportunities"
				? t`Opportunity discovery`
				: row.notice.type === "briefing"
					? t`Interview preparation`
					: applications?.find((application) => application.id === row.applicationId)?.company;
		const offset = dayOffset(row.createdAt, now);
		const stamp =
			offset === null
				? when(row.createdAt)
				: `${new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(offset, "day")}, ${time(row.createdAt)}`;
		return [source, stamp].filter(Boolean).join(" · ");
	};

	const act = (row: Notification) => {
		if (row.notice.type === "opportunities") void router.navigate({ to: "/dashboard/discover" });
		else if (row.url) router.history.push(row.url);
	};

	return (
		<section aria-labelledby="needs-you" className={cn("flex flex-col gap-2.5", className)}>
			<SectionHeading id="needs-you" title={t`Needs you`} count={data ? unread.length : undefined} />
			{isError || applicationQuery.isError ? (
				<CareerLoadError
					onRetry={() => {
						void refetch();
						void applicationQuery.refetch();
					}}
				/>
			) : !data ? (
				<Skeleton className="h-40 rounded-xl" />
			) : (
				<Swap id={rows.length > 0 ? "list" : "empty"}>
					{rows.length > 0 ? (
						<div role="list" className="overflow-hidden rounded-xl border border-line bg-surface">
							<AnimatePresence initial={false}>
								{rows.map((row) => {
									const kind = notificationKind(row.notice.type);
									// Only in-app paths: notifications link into the app, never elsewhere.
									const actionable = row.notice.type === "opportunities" || /^\/(?!\/)/.test(row.url ?? "");
									return (
										<CollapseRow key={row.id} role="listitem" className="border-t border-line first:border-t-0">
											<div
												role="group"
												aria-labelledby={`note-${row.id}`}
												className="flex items-start gap-3.5 px-4 py-3.5"
											>
												<span
													aria-hidden="true"
													className={cn("grid size-[34px] shrink-0 place-items-center rounded-[9px]", kind.tone)}
												>
													<Icon name={kind.icon} size={20} />
												</span>
												<div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
													<div className="grid min-w-0 flex-1 basis-56 gap-0.5">
														<p id={`note-${row.id}`} className="text-sm leading-5 font-semibold">
															{row.title}
														</p>
														<p className="text-[13px] leading-[19px] text-ink-2">{row.body}</p>
														<p className="mt-0.5 text-xs text-ink-3">{meta(row)}</p>
													</div>
													{actionable && (
														<Button variant="secondary" className="h-8 px-3 text-[13px]" onClick={() => act(row)}>
															{kind.action}
														</Button>
													)}
												</div>
												{isUnread(row) && (
													<IconButton
														icon="check"
														label={t`Mark as read`}
														size="icon-sm"
														iconSize={20}
														className="text-ink-2"
														onClick={() => dismiss(row)}
													/>
												)}
											</div>
										</CollapseRow>
									);
								})}
							</AnimatePresence>
						</div>
					) : (
						<div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line-2 p-7 text-center">
							<p className="font-display text-[22px] leading-7 font-medium">
								<Trans>You're up to date</Trans>
							</p>
							<p className="max-w-[300px] text-sm text-ink-2">
								<Trans>New roles, reminders and finished briefings appear here.</Trans>
							</p>
							{read.length > 0 && (
								<Button
									variant="ghost"
									size="sm"
									className="text-ink-2 underline underline-offset-3"
									onClick={() => setShowRead(true)}
								>
									<Trans>Show {read.length} read</Trans>
								</Button>
							)}
						</div>
					)}
				</Swap>
			)}
		</section>
	);
}

// ---- Rail ----

type ComingUpProps = { now: Date; className?: string };

function ComingUp({ now, className }: ComingUpProps) {
	const { format, time, relative, locale } = useCareerTime();
	const applicationQuery = useQuery(applicationsListQueryOptions());
	const applications = applicationQuery.data;
	const briefingQuery = useQuery(orpc.career.savedItems.queryOptions({ input: { kind: "briefing" } }));
	const briefings = briefingQuery.data;
	if (applicationQuery.isError || briefingQuery.isError)
		return (
			<CareerLoadError
				onRetry={() => {
					void applicationQuery.refetch();
					void briefingQuery.refetch();
				}}
			/>
		);
	if (applicationQuery.isPending || briefingQuery.isPending) return <Skeleton className="h-36 rounded-xl" />;
	const open = (applications ?? []).filter((application) => application.status !== "closed");
	const next = upcomingInterviews(collectInterviews(open), now)[0];
	if (!next) return null;

	const { application, interview, start } = next;
	const kind = interviewKindOf(interview.kind)?.label ?? interview.kind;
	const ready = briefings?.some((item) => item.interviewId === interview.id);

	return (
		<section
			aria-labelledby="coming-up"
			className={cn("flex flex-col gap-3 rounded-xl border border-line bg-surface p-4", className)}
		>
			<Eyebrow>
				<span id="coming-up">
					<Trans>Coming up</Trans>
				</span>
			</Eyebrow>
			<div className="flex items-start gap-3">
				<span className="flex w-11 shrink-0 flex-col items-center rounded-[9px] bg-sunken py-1.5">
					<span className="font-mono text-[11px] font-medium text-ink-3">
						{format(start, { weekday: "short" }).toLocaleUpperCase(locale)}
					</span>
					<span className="font-display text-[22px] leading-[26px] font-medium">
						{format(start, { day: "numeric" })}
					</span>
				</span>
				<div className="grid min-w-0 gap-0.5">
					<p className="flex items-center gap-1.5 text-sm font-semibold">
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: `var(--stage-${application.status})` }}
						/>
						{t`${kind} interview`}
					</p>
					<p className="text-[13px] text-ink-2">
						{[application.company, time(start), formatDuration(interview.durationMinutes, locale)].join(" · ")}
					</p>
					<p className="text-xs text-ink-3">
						{ready ? `${relative(start, now)} · ${t`Briefing ready`}` : relative(start, now)}
					</p>
				</div>
			</div>
			<Button
				variant="secondary"
				nativeButton={false}
				className="h-8 w-full text-[13px]"
				render={
					<Link
						to="/dashboard/applications/$applicationId/{-$tab}"
						params={{ applicationId: application.id, tab: "prepare" }}
					/>
				}
			>
				<Trans>Open workspace</Trans>
				<Icon name="arrow-right" size={18} className="rtl:-scale-x-100" />
			</Button>
		</section>
	);
}
