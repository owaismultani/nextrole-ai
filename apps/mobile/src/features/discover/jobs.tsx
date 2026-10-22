import type { RouterOutput } from "@/api/client";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { client, useCareerAction, useCareerTime, useTodayQueries, useUndoRows } from "../career/hooks";
import { Actions, LoadState, SwitchRow } from "../career/shared";
import { useDiscover } from "./context";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import {
	Badge,
	Banner,
	Button,
	Card,
	Chip,
	EmptyState,
	Screen,
	SelectSheet,
	Text,
	TextField,
	listItemMotion,
	listLayout,
	showToast,
	useFirstAppearance,
	useTheme,
} from "@/ui";

type Opportunity = RouterOutput["career"]["opportunities"][number];
/** `open`: roles still in Discover, new and tracked together. `dismissed`: roles you chose not to track. */
type Mode = "open" | "dismissed";

const hostOf = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

/**
 * Discover → Jobs: the roles discovery found. An untracked role can be tracked or dismissed; a tracked one opens its
 * application (never a second one); a dismissed one can be restored. Selecting a role shows its posting and where it
 * came from.
 */
export function JobsScreen({ mode, job }: { mode: Mode; job?: string | undefined }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const router = useRouter();
	const action = useCareerAction();
	const undo = useUndoRows();
	const { edit, hidden: hiddenSchedules } = useDiscover();
	const { opportunities, schedules } = useTodayQueries();
	const dismissed = useQuery({
		...orpc.career.opportunities.queryOptions({ input: { dismissed: true } }),
		enabled: session.status === "signed-in",
		retry: false,
		queryKey: [...orpc.career.opportunities.key(), session.server, "dismissed"],
	});
	const [text, setText] = useState("");
	const [source, setSource] = useState("");
	const [match, setMatch] = useState(false);
	const [open, setOpen] = useState<string | null>(job ?? null);
	const [expanded, setExpanded] = useState(false);
	const firstAppearance = useFirstAppearance(!opportunities.isPending);

	// A dismissed role linked from a run opens in the Dismissed list, where it is.
	const linkedDismissed = Boolean(job && (dismissed.data ?? []).some((row) => row.id === job));
	useEffect(() => {
		if (mode === "open" && linkedDismissed) router.replace({ pathname: routes.discover("dismissed"), params: { job } });
	}, [mode, linkedDismissed, job, router]);

	const list =
		mode === "dismissed"
			? (dismissed.data ?? [])
			: (opportunities.data ?? []).filter((row) => !undo.hidden.includes(row.id));
	const needle = text.trim().toLowerCase();
	const sources = [
		...new Set([...(opportunities.data ?? []), ...(dismissed.data ?? [])].map((row) => hostOf(row.url))),
	].sort();
	const rows = list
		.filter(
			(row) =>
				(!needle || [row.role, row.company, row.location, row.snippet].join(" ").toLowerCase().includes(needle)) &&
				(!source || hostOf(row.url) === source) &&
				(!match || row.matches.length > 0),
		)
		.sort(
			(a, b) =>
				b.matches.length - a.matches.length || new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
		);
	const shown = expanded ? rows : rows.slice(0, 10);
	const discovery = (schedules.data ?? []).filter(
		(row) => row.kind === "discovery" && !hiddenSchedules.includes(row.id),
	);
	const active = discovery.find((row) => row.enabled) ?? discovery[0];
	return (
		<Screen
			onRefresh={() =>
				Promise.allSettled([opportunities.refetch(), dismissed.refetch(), schedules.refetch(), action.refresh()])
			}
		>
			<Text variant="title" accessibilityRole="header">
				{mode === "dismissed" ? t`Dismissed jobs` : t`New opportunities`}
			</Text>
			<TextField
				label={t`Search roles`}
				value={text}
				onChangeText={setText}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			{sources.length > 1 ? (
				<SelectSheet
					label={t`Source`}
					value={source || null}
					options={[{ value: "", label: t`All sources` }, ...sources.map((value) => ({ value, label: value }))]}
					onChange={(value) => setSource(value ?? "")}
				/>
			) : null}
			<SwitchRow label={t`Matches my preferences`} value={match} onValueChange={setMatch} />
			{action.error ? <Banner tone="danger" message={action.error} /> : null}
			<LoadState query={opportunities} />
			<LoadState query={dismissed} />
			{!opportunities.isPending && !opportunities.isError && rows.length === 0 ? (
				<Empty
					mode={mode}
					filtered={list.length > 0}
					active={active}
					onSetUp={() => edit(null)}
					onOpenSearch={() => active && edit(active)}
					onClear={() => {
						setText("");
						setSource("");
						setMatch(false);
					}}
				/>
			) : null}
			{shown.map((row, index) => (
				<Animated.View key={row.id} {...listItemMotion(index, firstAppearance)} layout={listLayout}>
					<JobCard
						row={row}
						open={open === row.id}
						onToggle={() => setOpen(open === row.id ? null : row.id)}
						undo={undo}
						action={action}
					/>
				</Animated.View>
			))}
			{rows.length > shown.length ? (
				<Button variant="ghost" label={t`Show ${rows.length - shown.length} more`} onPress={() => setExpanded(true)} />
			) : null}
			<Banner
				tone="accent"
				message={
					mode === "dismissed"
						? t`Restoring returns an opportunity to Discover. It does not create an application.`
						: t`Tracking creates an application. Jobs already tracked open their existing application; they are never added twice.`
				}
			/>
			<View style={{ height: space.s4 }} />
		</Screen>
	);
}

type EmptyProps = {
	mode: Mode;
	filtered: boolean;
	active: { id: string; enabled: boolean } | undefined;
	onSetUp: () => void;
	onOpenSearch: () => void;
	onClear: () => void;
};

function Empty({ mode, filtered, active, onSetUp, onOpenSearch, onClear }: EmptyProps) {
	const { t } = useLingui();
	if (filtered)
		return (
			<>
				<Text color="ink2">{t`No roles match these filters.`}</Text>
				<Button variant="secondary" label={t`Clear filters`} onPress={onClear} />
			</>
		);
	if (mode === "dismissed")
		return (
			<EmptyState
				title={t`Nothing hidden`}
				message={t`Roles you mark "Not for me" are kept here, and you can restore them.`}
			/>
		);
	if (!active)
		return (
			<>
				<Text>{t`Get new roles here every morning`}</Text>
				<Button variant="secondary" label={t`Set up discovery`} onPress={onSetUp} />
			</>
		);
	return active.enabled ? (
		<Text color="ink2">{t`No new roles yet. Discovery looks again on its schedule.`}</Text>
	) : (
		<>
			<Text color="ink2">{t`No new roles. Discovery is paused.`}</Text>
			<Button variant="secondary" label={t`Open the search`} onPress={onOpenSearch} />
		</>
	);
}

type JobCardProps = {
	row: Opportunity;
	open: boolean;
	onToggle: () => void;
	undo: ReturnType<typeof useUndoRows>;
	action: ReturnType<typeof useCareerAction>;
};

function JobCard({ row, open, onToggle, undo, action }: JobCardProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const tracked = Boolean(row.trackedApplicationId);
	const dismissed = Boolean(row.dismissedAt);
	const detail = useQuery({
		...orpc.career.opportunity.queryOptions({ input: { id: row.id } }),
		enabled: open,
		retry: false,
	});
	const company = row.company || hostOf(row.url);
	return (
		<Card style={{ gap: space.s3 }}>
			<Text variant="title">{row.role}</Text>
			<Text color="ink2">{[company, row.location].filter(Boolean).join(" · ")}</Text>
			<Text variant="caption" color="ink3">
				{dismissed && row.dismissedAt
					? t`Dismissed ${time.when(row.dismissedAt)}`
					: t`Found ${time.when(row.firstSeenAt)}`}
			</Text>
			{dismissed ? null : tracked ? (
				<Badge tone="ok" label={t`In Applications`} />
			) : (
				<Badge tone="info" label={t`New`} />
			)}
			<Actions>
				{row.matches.map((match) => (
					<Chip key={match} label={match} />
				))}
				{row.unknowns.map((unknown) => (
					<Chip key={unknown} label={unknown === "salary" ? t`Salary not listed` : t`Office days not stated`} />
				))}
			</Actions>
			<Actions>
				{dismissed ? (
					<Button
						variant="secondary"
						label={t`Restore`}
						disabled={action.pending}
						onPress={() =>
							void action.run(
								() => client.career.restoreOpportunity({ id: row.id }),
								() => showToast({ message: t`Role restored` }),
							)
						}
					/>
				) : row.trackedApplicationId ? (
					<Button
						label={t`Open application`}
						onPress={() => router.push(routes.application(row.trackedApplicationId ?? ""))}
					/>
				) : (
					<>
						<Button
							label={t`Track job`}
							disabled={action.pending}
							onPress={() =>
								undo.remove(row.id, t`Saved to Applications with the posting`, async () => {
									await client.career.trackOpportunity({ id: row.id });
								})
							}
						/>
						<Button
							variant="ghost"
							label={t`Dismiss`}
							onPress={() =>
								undo.remove(row.id, t`Hidden from Discover`, () => client.career.dismissOpportunity({ id: row.id }))
							}
						/>
					</>
				)}
				<Button variant="ghost" label={open ? t`Hide details` : t`Details`} onPress={onToggle} />
			</Actions>
			{open ? (
				<View style={{ gap: space.s3 }}>
					<View style={{ gap: space.s1 }}>
						<Text weight={600}>{t`Posting`}</Text>
						{detail.isPending ? <Text color="ink3">{t`Loading…`}</Text> : null}
						{detail.isError ? (
							<Text color="warnText">{t`The full posting couldn't be loaded. Showing the search summary.`}</Text>
						) : null}
						{!detail.isPending ? <Text color="ink2">{detail.data?.description || row.snippet}</Text> : null}
					</View>
					<View style={{ gap: space.s1 }}>
						<Text weight={600}>{t`Where it came from`}</Text>
						<Text color="ink2">{hostOf(row.url)}</Text>
						{detail.data?.run ? (
							<>
								<Text color="ink2">
									{`${detail.data.run.trigger === "manual" ? t`Found by a search you started` : t`Found by a scheduled search`} · ${time.when(detail.data.run.at)}`}
								</Text>
								<Button
									variant="ghost"
									label={t`See the run`}
									onPress={() =>
										router.push({ pathname: routes.discover("activity"), params: { run: detail.data?.run?.id ?? "" } })
									}
								/>
							</>
						) : !detail.isPending ? (
							<Text color="ink3">{t`The run that found this role is no longer kept.`}</Text>
						) : null}
					</View>
					<Actions>
						<Button
							variant="ghost"
							label={t`Original posting`}
							onPress={() => {
								if (/^https?:\/\//i.test(row.url))
									void openBrowserAsync(row.url).catch(() => showToast({ message: t`Couldn't open the posting.` }));
							}}
						/>
						{!dismissed ? (
							<Button
								variant="ghost"
								label={t`Prepare documents`}
								disabled={action.pending}
								onPress={() =>
									void action.run(
										() => client.career.prepareDocuments({ opportunityIds: [row.id], resume: true, letter: true }),
										() => showToast({ message: t`Preparing a resume and cover letter. Follow them in Automation.` }),
									)
								}
							/>
						) : null}
					</Actions>
				</View>
			) : null}
		</Card>
	);
}
