import type { RouterOutput } from "@/api/client";
import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useCareerTime } from "./hooks";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, Screen, SelectSheet, Text, useTheme } from "@/ui";

type Overview = RouterOutput["career"]["overview"];
type Days = "7" | "30" | "90";

/** Career → Overview: what needs you, how far jobs get, how discovery and automation are doing, what is coming up. */
export function OverviewScreen() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const queryClient = useQueryClient();
	const [days, setDays] = useState<Days>("30");
	const query = useQuery({
		...orpc.career.overview.queryOptions({ input: { days: Number(days) as 7 | 30 | 90 } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.overview.key(), session.server, days],
		placeholderData: (previous) => previous,
	});
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			<SelectSheet
				label={t`Time window`}
				value={days}
				onChange={setDays}
				options={[
					{ value: "7" as const, label: t`7 days` },
					{ value: "30" as const, label: t`30 days` },
					{ value: "90" as const, label: t`90 days` },
				]}
			/>
			{query.isError ? <Banner tone="danger" message={t`Couldn't load the overview. Pull to refresh.`} /> : null}
			{query.data ? (
				<View style={{ gap: space.s5 }}>
					<NeedsYou data={query.data} />
					<Funnel data={query.data} />
					<DiscoveryHealth data={query.data} />
					<AutomationUse data={query.data} />
					<Interviews data={query.data} />
				</View>
			) : null}
		</Screen>
	);
}

function NeedsYou({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const n = data.needsYou;
	const rows: { count: number; label: string; open: () => void; bad?: boolean }[] = [
		{
			count: n.readyDocuments,
			label: t`Documents ready for review`,
			open: () => router.push(routes.career("pipeline")),
		},
		{
			count: n.attentionDocuments,
			label: t`Documents need attention`,
			open: () => router.push(routes.career("pipeline")),
			bad: true,
		},
		{
			count: n.upcomingInterviews,
			label: t`Interviews in the next 7 days`,
			open: () => router.push(routes.applications()),
		},
		{ count: n.unreadReminders, label: t`Reminders and briefings`, open: () => router.push(routes.career("today")) },
		{ count: n.newRoles, label: t`New roles to review`, open: () => router.push(routes.career("today")) },
	];
	const open = rows.filter((row) => row.count > 0);
	return (
		<Section title={t`Needs you now`}>
			{n.discoveryFailing ? (
				<Banner tone="danger" message={t`The last discovery run failed. Open Pipeline to see why.`} />
			) : null}
			{open.length === 0 && !n.discoveryFailing ? (
				<Text color="ink3">{t`You are up to date. Nothing is waiting for you.`}</Text>
			) : (
				open.map((row) => (
					<Card key={row.label} style={{ gap: space.s1 }}>
						<Text variant="title" color={row.bad ? "dangerText" : "ink"}>{`${row.count}`}</Text>
						<Text color="ink2">{row.label}</Text>
						<Button variant="ghost" label={t`Open`} onPress={row.open} />
					</Card>
				))
			)}
		</Section>
	);
}

function Funnel({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space, colors } = useTheme();
	const labels = {
		discovered: t`Found`,
		saved: t`Saved`,
		documents: t`Documents ready`,
		applied: t`Applied`,
		screening: t`Screening`,
		interview: t`Interview`,
		offer: t`Offer`,
	} as const;
	const max = Math.max(1, ...data.funnel.map((step) => step.count));
	return (
		<Section title={t`Pipeline, last ${data.windowDays} days`}>
			<Card style={{ gap: space.s3 }}>
				{data.funnel.map((step) => (
					<View key={step.key} style={{ gap: space.s1 }}>
						<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
							<Text color="ink2">{labels[step.key]}</Text>
							<Text weight={600}>{`${step.count}`}</Text>
						</View>
						<View style={{ height: 8, borderRadius: 4, backgroundColor: colors.sunken, overflow: "hidden" }}>
							<View
								style={{
									height: 8,
									borderRadius: 4,
									backgroundColor: colors.accent,
									width: `${Math.max(step.count > 0 ? 3 : 0, (step.count / max) * 100)}%`,
								}}
							/>
						</View>
					</View>
				))}
				<Text
					variant="callout"
					color="ink3"
				>{t`Each step counts jobs that reached it in this window, so later steps can include jobs found earlier.`}</Text>
			</Card>
		</Section>
	);
}

function DiscoveryHealth({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space, colors } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const d = data.discovery;
	const max = Math.max(1, ...d.runs.map((run) => run.found));
	return (
		<Section title={t`Discovery`}>
			<Card style={{ gap: space.s2 }}>
				{!d.scheduleId ? (
					<Text color="ink3">{t`No discovery schedule yet. Set one up in Career → Today.`}</Text>
				) : (
					<>
						<Text color="ink2">{`${d.enabled ? t`On` : t`Paused`} · ${t`Last success`}: ${d.lastSucceededAt ? time.when(d.lastSucceededAt) : t`Never`}`}</Text>
						<Text color="ink2">{`${t`Next run`}: ${d.nextRunAt ? time.when(d.nextRunAt) : t`Paused`}`}</Text>
						{d.runs.length > 0 ? (
							<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 56 }}>
								{d.runs.map((run) => (
									<View
										key={run.at.toISOString()}
										style={{
											flex: 1,
											minWidth: 3,
											borderRadius: 2,
											height: `${Math.max(8, (run.found / max) * 100)}%`,
											backgroundColor:
												run.outcome === "failed" ? colors.danger : run.matches > 0 ? colors.accent : colors.line2,
										}}
									/>
								))}
							</View>
						) : (
							<Text color="ink3">{t`No runs in this window.`}</Text>
						)}
						<Text color="ink3">
							{t`Runs ${d.totals.runs} · New ${d.totals.matches} · Duplicates ${d.totals.duplicates} · Rejected ${d.totals.rejected} · Read failures ${d.totals.readFailures} · Failed ${d.totals.failed}`}
						</Text>
						{d.failing ? (
							<Banner tone="danger" message={t`The latest run failed. Open Pipeline for the reason.`} />
						) : null}
						{d.repeating ? (
							<Banner
								tone="warn"
								message={t`The last five runs found nothing new but kept seeing jobs you already have. Scheduling is working; try changing what you look for.`}
							/>
						) : null}
						<Button
							variant="secondary"
							label={t`Open Pipeline`}
							onPress={() => router.push(routes.career("pipeline"))}
						/>
					</>
				)}
			</Card>
		</Section>
	);
}

function AutomationUse({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space, colors } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const a = data.automation;
	const off = !a.resumesEnabled && !a.lettersEnabled;
	const pct = Math.min(100, Math.round((a.used / Math.max(1, a.limit)) * 100));
	return (
		<Section title={t`Document automation`}>
			<Card style={{ gap: space.s2 }}>
				<Text color="ink2">
					{off
						? t`Automatic documents are off.`
						: [a.resumesEnabled ? t`Tailored resumes on` : null, a.lettersEnabled ? t`Cover letters on` : null]
								.filter(Boolean)
								.join(" · ")}
				</Text>
				<Text weight={600}>{t`${a.used} of ${a.limit} documents today`}</Text>
				<View style={{ height: 8, borderRadius: 4, backgroundColor: colors.sunken, overflow: "hidden" }}>
					<View
						style={{
							height: 8,
							borderRadius: 4,
							width: `${pct}%`,
							backgroundColor: pct >= 100 ? colors.warnText : colors.accent,
						}}
					/>
				</View>
				<Text variant="callout" color="ink3">{t`Resets ${time.when(a.resetsAt)}`}</Text>
				{a.deferred > 0 ? <Text color="ink2">{t`${a.deferred} waiting for the daily limit to reset`}</Text> : null}
				{a.stale > 0 ? (
					<Text color="ink2">{t`${a.stale} out of date after your resume or a posting changed`}</Text>
				) : null}
				<Button
					variant="ghost"
					label={t`Automation settings`}
					onPress={() => router.push(routes.settings("automation"))}
				/>
			</Card>
		</Section>
	);
}

function Interviews({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	return (
		<Section title={t`Interviews in the next 7 days`}>
			{data.interviews.length === 0 ? (
				<Text color="ink3">{t`No interviews coming up.`}</Text>
			) : (
				data.interviews.map((interview) => (
					<Card key={`${interview.applicationId}-${interview.at.toISOString()}`} style={{ gap: space.s1 }}>
						<Text variant="title">{[interview.company, interview.role].filter(Boolean).join(" · ")}</Text>
						<Text color="ink3">{time.when(interview.at)}</Text>
						<Button
							variant="ghost"
							label={t`Open application`}
							onPress={() => router.push(routes.application(interview.applicationId))}
						/>
					</Card>
				))
			)}
		</Section>
	);
}
