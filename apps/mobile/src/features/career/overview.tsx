import type { RouterOutput } from "@/api/client";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { client, useCareerTime } from "./hooks";
import { Notifications } from "./notifications";
import { describeAction, interviewKindLabel, summarizeRecent } from "./overview-words";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, Screen, SelectSheet, Text, useTheme } from "@/ui";

type Overview = RouterOutput["career"]["overview"];
type Days = "7" | "14" | "30";
type Tab = "all" | "ready" | "followups" | "issues";

/** Overview: your next actions, what is coming up, how automation and discovery are doing, and your outcomes. */
export function OverviewScreen() {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const queryClient = useQueryClient();
	const [days, setDays] = useState<Days>("30");
	const query = useQuery({
		...orpc.career.overview.queryOptions({ input: { days: Number(days) as 7 | 14 | 30 } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.overview.key(), session.server, days],
		placeholderData: (previous) => previous,
	});
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			{query.isError ? <Banner tone="danger" message={t`Couldn't load the overview. Pull to refresh.`} /> : null}
			{query.data ? (
				<View style={{ gap: space.s5 }}>
					<FinishSetup />
					<DiscoveryBanner data={query.data} />
					<Text color="ink2">{t`${query.data.needsYou.savedJobs} saved applications · ${query.data.needsYou.readyDocuments} with documents ready`}</Text>
					<NextActions data={query.data} />
					<Notifications />
					<ComingUp data={query.data} />
					<RecentActivity />
					<AutomationCard data={query.data} />
					<Outcomes data={query.data} days={days} onDays={setDays} />
					<LatestDiscovery data={query.data} />
				</View>
			) : null}
		</Screen>
	);
}

// ---- Banners ----

function FinishSetup() {
	const { t } = useLingui();
	const router = useRouter();
	const session = useSession();
	const setup = useQuery({
		...orpc.career.setup.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.setup.key(), session.server],
	});
	if (!setup.data || setup.data.completed || !setup.data.skipped) return null;
	return (
		<Banner
			tone="info"
			message={t`Finish setting up your job search: confirm your baseline resume, connect services and start discovery.`}
			action={{ label: t`Continue setup`, onPress: () => router.push(routes.setup()) }}
		/>
	);
}

/** Discovery paused or failing: said once, at the top, with the one action that fixes it. */
function DiscoveryBanner({ data }: { data: Overview }) {
	const { t } = useLingui();
	const router = useRouter();
	const queryClient = useQueryClient();
	const resume = useMutation({
		mutationFn: () => client.career.setScheduleEnabled({ id: data.discovery.scheduleId ?? "", enabled: true }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.career.key() }),
	});
	const { discovery } = data;
	if (!discovery.scheduleId) return null;
	if (discovery.failing)
		return (
			<Banner
				tone="danger"
				title={t`The last discovery run failed`}
				message={t`Open Search activity to see why and what to do.`}
				action={{ label: t`See why`, onPress: () => router.push(routes.discover("activity")) }}
			/>
		);
	if (discovery.enabled) return null;
	return (
		<View style={{ gap: 8 }}>
			<Banner
				tone="warn"
				title={t`Discovery is paused`}
				message={t`Your saved applications and documents are available.`}
			/>
			<Button label={t`Resume discovery`} loading={resume.isPending} onPress={() => resume.mutate()} />
		</View>
	);
}

// ---- Your next actions ----

function NextActions({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
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
	return (
		<Section title={t`Your next actions`}>
			<Text color="ink3">{t`Review applications and resolve what needs you.`}</Text>
			<SelectSheet
				label={t`Show`}
				value={tab}
				onChange={setTab}
				options={[
					{ value: "all" as const, label: t`All` },
					{ value: "ready" as const, label: t`Documents ready (${counts.ready})` },
					{ value: "followups" as const, label: t`Follow-ups (${counts.followUps})` },
					{ value: "issues" as const, label: t`Issues (${counts.issues})` },
				]}
			/>
			{shown.length === 0 ? <Text color="ink3">{t`You are up to date. Nothing needs you right now.`}</Text> : null}
			{shown.map((action) => {
				const info = describeAction(action);
				return (
					<Card key={`${action.kind}-${action.applicationId}`} style={{ gap: space.s1 }}>
						<Text variant="title">{action.role}</Text>
						<Text color="ink3">{[action.company, action.location].filter(Boolean).join(" · ")}</Text>
						<Text color={info.tone} weight={600}>
							{info.chip}
						</Text>
						<Text variant="callout" color="ink3">
							{info.line}
						</Text>
						<Button
							variant="secondary"
							label={info.button}
							onPress={() =>
								router.push(
									routes.application(action.applicationId, action.kind === "followup" ? "messages" : "documents"),
								)
							}
						/>
					</Card>
				);
			})}
			<Button variant="ghost" label={t`View all applications`} onPress={() => router.push(routes.applications())} />
		</Section>
	);
}

// ---- Coming up ----

function ComingUp({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const next = data.nextInterview;
	return (
		<Section title={t`Coming up`}>
			{!next ? (
				<Text color="ink3">{t`No interviews scheduled. Your interviews will appear here.`}</Text>
			) : (
				<Card style={{ gap: space.s2 }}>
					<Text variant="title">{interviewKindLabel(next.kind)}</Text>
					<Text color="ink2">{`${next.company} · ${time.when(next.at)}`}</Text>
					<Text variant="callout" color="ink3">{`${t`${next.durationMinutes} min`} · ${next.timezone}`}</Text>
					<Text color={next.briefing ? "accentText" : "ink3"}>
						{`${next.briefing ? "✓" : "○"} ${next.briefing ? t`Briefing available` : t`Briefing not ready`}`}
					</Text>
					<Text color={next.practice ? "accentText" : "ink3"}>
						{`${next.practice ? "✓" : "○"} ${next.practice ? t`Practice started` : t`Practice not started`}`}
					</Text>
					<Button
						label={t`Prepare interview`}
						onPress={() =>
							router.push(
								routes.application(next.applicationId, "interviews", {
									section: "prepare",
									...(next.interviewId ? { round: next.interviewId } : {}),
								}),
							)
						}
					/>
				</Card>
			)}
		</Section>
	);
}

// ---- Recent activity ----

function RecentActivity() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const time = useCareerTime();
	const query = useQuery({
		...orpc.career.activity.queryOptions({ input: { limit: 30 } }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.activity.key(), session.server, "recent"],
		refetchInterval: 60_000,
	});
	const items = query.data ? summarizeRecent(query.data.items) : [];
	return (
		<Section title={t`Recent activity`}>
			{query.data && items.length === 0 ? (
				<Text color="ink3">{t`Nothing yet. Activity appears here after the first run.`}</Text>
			) : null}
			{items.map((item) => (
				<Card key={item.key} style={{ gap: space.s1 }}>
					<Text weight={600}>{item.title}</Text>
					<Text variant="callout" color="ink3">
						{item.sub ? `${item.sub} · ${time.when(item.at)}` : time.when(item.at)}
					</Text>
					<Button
						variant="ghost"
						label={item.label}
						onPress={() =>
							router.push(
								item.open === "automation"
									? routes.automation()
									: item.open === "discover"
										? routes.discover()
										: routes.discover("activity"),
							)
						}
					/>
				</Card>
			))}
			<Button variant="ghost" label={t`See all`} onPress={() => router.push(routes.discover("activity"))} />
		</Section>
	);
}

// ---- Automation ----

function AutomationCard({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space, colors } = useTheme();
	const router = useRouter();
	const { automation: a, discovery } = data;
	const pct = Math.min(100, Math.round((a.used / Math.max(1, a.limit)) * 100));
	const state = (on: boolean) => (on ? t`On` : t`Off`);
	const working = [
		a.generating > 0 ? t`${a.generating} generating` : null,
		a.deferred > 0 ? t`${a.deferred} deferred` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<Section title={t`Automation`}>
			<Card style={{ gap: space.s2 }}>
				<Text>{`${t`Discovery`}: ${!discovery.scheduleId ? t`Off` : discovery.enabled ? t`On` : t`Paused`}`}</Text>
				<Text>{`${t`Tailored resumes`}: ${state(a.resumesEnabled)}`}</Text>
				<Text>{`${t`Cover letters`}: ${state(a.lettersEnabled)}`}</Text>
				<Text>{`${t`Preparation`}: ${working || t`Idle`}`}</Text>
				<Text weight={600}>{t`Documents today: ${a.used} / ${a.limit}`}</Text>
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
				<Button variant="ghost" label={t`Manage automation`} onPress={() => router.push(routes.automation())} />
			</Card>
		</Section>
	);
}

// ---- Application outcomes ----

function Outcomes({ data, days, onDays }: { data: Overview; days: Days; onDays: (days: Days) => void }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const o = data.outcomes;
	return (
		<Section title={t`Application outcomes`}>
			<SelectSheet
				label={t`Time window`}
				value={days}
				onChange={onDays}
				options={[
					{ value: "7" as const, label: t`Last 7 days` },
					{ value: "14" as const, label: t`Last 14 days` },
					{ value: "30" as const, label: t`Last 30 days` },
				]}
			/>
			<Card style={{ gap: space.s1 }}>
				<Text>{`${o.submitted} ${t`Submitted`}`}</Text>
				<Text>{`${o.firstResponses} ${t`First responses`}`}</Text>
				<Text>{`${o.interviews} ${t`Applications reached interview`}`}</Text>
				<Text>{`${o.offers} ${t`Offers`}`}</Text>
				<Text variant="callout" color="ink3">{t`Based on recorded application activity.`}</Text>
			</Card>
			<Button variant="ghost" label={t`View insights`} onPress={() => router.push(routes.applications("insights"))} />
		</Section>
	);
}

// ---- Latest discovery ----

function LatestDiscovery({ data }: { data: Overview }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const latest = data.latestDiscovery;
	if (!latest) return null;
	const status =
		latest.outcome === "failed"
			? t`Failed. Open discovery activity to see why.`
			: latest.outcome === "partial"
				? latest.readFailures === 1
					? t`Partial — 1 page could not be read`
					: t`Partial — ${latest.readFailures} pages could not be read`
				: t`Completed`;
	const summary =
		latest.matches === 1 ? t`1 new job` : latest.matches === 0 ? t`No new jobs` : t`${latest.matches} new jobs`;
	return (
		<Section title={t`Latest discovery`}>
			<Card style={{ gap: space.s1 }}>
				<Text color="ink2">{`${summary} · ${t`${latest.found} results checked`} · ${time.when(latest.at)}`}</Text>
				{latest.job ? (
					<Text weight={600}>{`${latest.job.role} · ${latest.job.location || latest.job.company}`}</Text>
				) : (
					<Text color="ink3">{t`This search found nothing new.`}</Text>
				)}
				<Text
					color={latest.outcome === "failed" ? "dangerText" : latest.outcome === "partial" ? "warnText" : "accentText"}
				>
					{status}
				</Text>
				<Button
					variant="ghost"
					label={t`View discovery activity`}
					onPress={() => router.push(routes.discover("activity"))}
				/>
				<Button variant="secondary" label={t`Edit search`} onPress={() => router.push(routes.discover())} />
			</Card>
		</Section>
	);
}
