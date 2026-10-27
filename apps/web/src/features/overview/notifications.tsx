import type { RouterOutput } from "@/libs/orpc/client";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { useBreakpoint } from "@reactive-resume/ui/hooks/use-breakpoint";
import { cn } from "@reactive-resume/utils/style";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { CareerLoadError } from "@/features/career/load-state";
import { failed, SectionHeading, useDayOffset } from "@/features/career/section";
import { CollapseRow, Swap, useCareerTime, useNow, withUndo } from "@/features/career/shared";
import { orpc } from "@/libs/orpc/client";

type Notification = RouterOutput["career"]["notifications"][number];

// ---- Needs you ----

const notificationKind = (kind: Notification["notice"]["type"]): { icon: IconName; tone: string; action: string } => {
	if (kind === "opportunities") return { icon: "globe-simple", tone: "bg-info-soft text-info-text", action: t`Review` };
	if (kind === "followup") return { icon: "envelope", tone: "bg-warn-soft text-warn-text", action: t`Review draft` };
	if (kind === "briefing")
		return { icon: "clipboard-text", tone: "bg-accent-soft text-accent-text", action: t`Open briefing` };
	if (kind === "schedule-failed")
		return { icon: "warning-circle", tone: "bg-danger-soft text-danger-text", action: t`Open schedule` };
	if (kind === "email-failed")
		return { icon: "warning-circle", tone: "bg-danger-soft text-danger-text", action: t`Check settings` };
	if (kind === "briefing-paused")
		return { icon: "clock", tone: "bg-warn-soft text-warn-text", action: t`Choose a new time` };
	return { icon: "info", tone: "bg-warn-soft text-warn-text", action: t`Open` };
};

type NotificationsProps = {
	className?: string;
	/** Leave out the heading when the surrounding panel already has one. */
	hideHeading?: boolean;
};

/**
 * Notifications that need you: new roles to review, follow-up drafts, briefings, and anything that stopped working (a
 * failed schedule, failed email, a paused briefing), each with the action that recovers it. Mark as read, with Undo; read
 * ones can be shown again.
 */
export function Notifications({ className, hideHeading }: NotificationsProps) {
	const now = useNow();
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
		<section
			aria-labelledby={hideHeading ? undefined : "needs-you"}
			aria-label={hideHeading ? t`Notifications` : undefined}
			className={cn("flex flex-col gap-2.5", className)}
		>
			{!hideHeading && (
				<SectionHeading id="needs-you" title={t`Notifications`} count={data ? unread.length : undefined} />
			)}
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
								<Trans>New roles, reminders, finished briefings and anything that needs fixing appear here.</Trans>
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

/**
 * The bell on Overview: how many notifications are unread, and a panel with all of them. They stay one tap away
 * without taking space from what you came to do.
 */
export function NotificationsBell() {
	const [open, setOpen] = useState(false);
	const split = useBreakpoint() !== "mobile";
	const { data } = useQuery(orpc.career.notifications.queryOptions({ input: {} }));
	const unread = data?.filter((row) => !row.readAt).length ?? 0;
	return (
		<>
			<Button
				variant="secondary"
				size="icon"
				className="relative"
				aria-label={unread > 0 ? t`Notifications, ${unread} unread` : t`Notifications`}
				onClick={() => setOpen(true)}
			>
				<Icon name="bell" size={18} />
				{unread > 0 && (
					<span
						aria-hidden="true"
						className="absolute -end-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] leading-[18px] font-bold text-on-accent"
					>
						{unread > 9 ? "9+" : unread}
					</span>
				)}
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side={split ? "right" : "bottom"} showCloseButton={false} className="max-h-[90svh] gap-0">
					<div className="flex items-center gap-3 border-b border-line ps-[22px] pe-3 pt-[18px] pb-3.5">
						<SheetTitle className="flex-1">
							<Trans>Notifications</Trans>
						</SheetTitle>
						<SheetClose aria-label={t`Close`} render={<Button variant="ghost" size="icon" className="text-ink-2" />}>
							<Icon name="x" />
						</SheetClose>
					</div>
					<div className="overflow-y-auto px-[22px] py-5">
						<Notifications hideHeading />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
