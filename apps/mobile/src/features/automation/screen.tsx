import type { Schedule } from "../career/hooks";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { DAILY_LIMIT } from "@reactive-resume/schema/career";
import { repeats } from "@reactive-resume/schema/career-run";
import { cadenceLabel, runState, runSummary, stateLabel } from "../career/discovery-run";
import { DiscoveryStatus } from "../career/discovery-status";
import { client, useCareerAction, useCareerTime, useNow, useTodayQueries, useUndoRows } from "../career/hooks";
import { PipelineHealth } from "../career/pipeline-map";
import { PreparationList } from "../career/preparation-list";
import { ScheduleSheet, scheduleTitle } from "../career/schedule-sheet";
import { rollForwardRepeat } from "../career/scheduling";
import { LoadState, SwitchRow } from "../career/shared";
import { SettingsGroup } from "../settings/layout";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { useHasAIProvider } from "@/features/ai/provider-state";
import { useApplications } from "@/features/applications/queries";
import { routes } from "@/routes";
import { Banner, Button, Card, Screen, Segmented, SelectSheet, Text, TextArea, TextField, useTheme } from "@/ui";

type Automation = Awaited<ReturnType<typeof client.career.automation>>;
type Draft = {
	resumesEnabled: boolean;
	lettersEnabled: boolean;
	baselineResumeId: string;
	aiProviderId: string;
	dailyLimit: string;
	resumePrompt: string;
	coverLetterPrompt: string;
};

const toDraft = (data: Automation): Draft => ({
	resumesEnabled: data.resumesEnabled,
	lettersEnabled: data.lettersEnabled,
	baselineResumeId: data.baselineResumeId ?? "",
	aiProviderId: data.aiProviderId ?? "",
	dailyLimit: String(data.dailyLimit),
	resumePrompt: data.resumePrompt,
	coverLetterPrompt: data.coverLetterPrompt,
});

/**
 * Automation: everything that runs in the background. Discovery and document preparation are configured here and every
 * schedule is managed here; the search is edited in the same editor Discover opens. You apply yourself; nothing is ever
 * sent to an employer.
 */
export function AutomationScreen() {
	const { t } = useLingui();
	const { space } = useTheme();
	const queryClient = useQueryClient();
	const undo = useUndoRows();
	const [sheet, setSheet] = useState<{
		schedule: Schedule | null;
		kind: "discovery" | "prepare" | "follow-up";
	} | null>(null);
	return (
		<Screen onRefresh={() => Promise.allSettled([queryClient.invalidateQueries({ queryKey: orpc.career.key() })])}>
			<Text color="ink3">{t`Find jobs on a schedule and prepare documents for them. You apply yourself; nothing is ever sent to an employer.`}</Text>
			<View style={{ gap: space.s4 }}>
				<DiscoverySection onEdit={(schedule) => setSheet({ schedule, kind: "discovery" })} hidden={undo.hidden} />
				<AutomationSettings />
				<Schedules hidden={undo.hidden} onOpen={(schedule, kind) => setSheet({ schedule, kind })} />
				<SettingsGroup title={t`How it's working`}>
					<View style={{ padding: space.s3, gap: space.s3 }}>
						<PipelineHealth />
						<PreparationList />
					</View>
				</SettingsGroup>
			</View>
			{sheet ? (
				<ScheduleSheet
					key={sheet.schedule?.id ?? "new"}
					{...sheet}
					onClose={() => setSheet(null)}
					onDelete={(id) => undo.remove(id, t`Schedule deleted`, () => client.career.deleteSchedule({ id }))}
				/>
			) : null}
		</Screen>
	);
}

/** Document preparation: prepare a resume and letter for each job discovery finds. */
function AutomationSettings() {
	const { t } = useLingui();
	const session = useSession();
	const query = useQuery({
		...orpc.career.automation.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.automation.key(), session.server],
	});
	if (query.isError) return <Banner tone="danger" message={t`Couldn't load automation settings. Pull to refresh.`} />;
	return query.data ? <AutomationForm data={query.data} /> : null;
}

function AutomationForm({ data }: { data: Automation }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const session = useSession();
	const time = useCareerTime();
	const action = useCareerAction();
	const ai = useHasAIProvider();
	const [draft, setDraft] = useState<Draft>(() => toDraft(data));
	const [advanced, setAdvanced] = useState(false);
	const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
	const resumes = useQuery({
		...orpc.resume.list.queryOptions(),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.resume.list.key(), session.server],
	});

	const wantsDocuments = draft.resumesEnabled || draft.lettersEnabled;
	const missingBaseline = wantsDocuments && !draft.baselineResumeId;
	const missingAi = wantsDocuments && !ai.isLoading && !ai.hasAIProvider;
	const blocked = missingBaseline || missingAi;
	const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(data));
	const limit = Math.min(
		DAILY_LIMIT.max,
		Math.max(DAILY_LIMIT.min, Number.parseInt(draft.dailyLimit, 10) || DAILY_LIMIT.min),
	);

	const save = () =>
		void action.run(() =>
			client.career.saveAutomation({
				resumesEnabled: draft.resumesEnabled,
				lettersEnabled: draft.lettersEnabled,
				baselineResumeId: draft.baselineResumeId || null,
				aiProviderId: draft.aiProviderId || null,
				dailyLimit: limit,
				resumePrompt: draft.resumePrompt,
				coverLetterPrompt: draft.coverLetterPrompt,
			}),
		);

	return (
		<View style={{ gap: space.s4 }}>
			<SettingsGroup title={t`Document preparation`}>
				<View style={{ padding: space.s3, gap: space.s3 }}>
					<Text color="ink3">{t`For each new job, make a tailored copy of your baseline resume and/or a cover letter. They are drafts for you to review, edit and send yourself.`}</Text>
					<SwitchRow
						label={t`Generate tailored resumes automatically`}
						value={draft.resumesEnabled}
						onValueChange={(resumesEnabled) => set({ resumesEnabled })}
					/>
					<Text color="ink3">{t`A separate copy with a reworded summary and experience and reordered skills. Your baseline is never changed, and nothing is added that your resume does not say.`}</Text>
					<SwitchRow
						label={t`Generate cover letters automatically`}
						value={draft.lettersEnabled}
						onValueChange={(lettersEnabled) => set({ lettersEnabled })}
					/>
					<Text color="ink3">{t`A letter for the job, written from your baseline resume and the facts you have approved. Gaps are listed for you to fill, not invented.`}</Text>
					<SelectSheet
						label={t`Baseline resume`}
						value={draft.baselineResumeId}
						placeholder={t`Choose a resume`}
						onChange={(baselineResumeId) => set({ baselineResumeId })}
						options={(resumes.data ?? []).map((resume) => ({ value: resume.id, label: resume.name }))}
					/>
					<SelectSheet
						label={t`AI connection`}
						value={draft.aiProviderId}
						onChange={(aiProviderId) => set({ aiProviderId })}
						options={[
							{ value: "", label: t`Use my default` },
							...ai.usableProviders.map((provider) => ({ value: provider.id, label: provider.label })),
						]}
					/>
					{missingBaseline ? (
						<Banner tone="warn" message={t`Choose the resume to tailor from. It is only read, never changed.`} />
					) : null}
					{missingAi ? (
						<Banner
							tone="warn"
							message={t`Document generation needs an AI connection that has passed its test. Connect one in AI & developer.`}
						/>
					) : null}
					<TextField
						label={t`Documents per day`}
						value={draft.dailyLimit}
						keyboardType="number-pad"
						maxLength={2}
						onChangeText={(dailyLimit) => set({ dailyLimit })}
						helper={t`Each generated resume or letter counts once, on its first attempt; retries do not count again. The count resets at midnight in ${time.timeZone}. Work over the limit waits and starts after the reset. Today: ${data.usage.used} of ${data.usage.limit} used.`}
					/>
					<Banner
						tone="info"
						message={t`Turning a type off stops new work of that type from starting, including work already waiting; a document being written finishes and is saved. Turning one on affects jobs found from now on. Jobs you already have are only prepared when you choose them.`}
					/>
					<Button
						variant="ghost"
						label={advanced ? t`Hide advanced writing instructions` : t`Advanced writing instructions`}
						onPress={() => setAdvanced(!advanced)}
					/>
					{advanced ? (
						<View style={{ gap: space.s3 }}>
							<TextArea
								label={t`Additional resume instruction`}
								value={draft.resumePrompt}
								maxLength={2000}
								minLines={3}
								onChangeText={(resumePrompt) => set({ resumePrompt })}
								helper={t`This guides curation in addition to the fixed accuracy and privacy rules.`}
							/>
							<TextArea
								label={t`Additional cover letter instruction`}
								value={draft.coverLetterPrompt}
								maxLength={2000}
								minLines={3}
								onChangeText={(coverLetterPrompt) => set({ coverLetterPrompt })}
								helper={t`This guides curation in addition to the fixed accuracy and privacy rules.`}
							/>
						</View>
					) : null}
				</View>
			</SettingsGroup>

			{action.error ? <Banner tone="danger" message={action.error} /> : null}
			<Button label={t`Save automation`} loading={action.pending} disabled={!dirty || blocked} onPress={save} />
		</View>
	);
}

/** The saved search, its state and last run, with Run now, Pause and Edit search; the results are reviewed in Discover. */
function DiscoverySection({ onEdit, hidden }: { onEdit: (schedule: Schedule | null) => void; hidden: string[] }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const { schedules } = useTodayQueries();
	const schedule = (schedules.data ?? [])
		.filter((row) => row.kind === "discovery" && !hidden.includes(row.id))
		.sort(
			(a, b) =>
				Number(b.enabled) - Number(a.enabled) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)[0];
	return (
		<SettingsGroup title={t`Discovery`}>
			<View style={{ padding: space.s3, gap: space.s3 }}>
				<Text color="ink3">{t`The search that finds new roles. Edit it here or from Discover; it is the same search. Results are reviewed in Discover.`}</Text>
				<LoadState query={schedules} />
				{schedules.data && !schedule ? (
					<>
						<Text color="ink3">{t`No discovery schedule yet.`}</Text>
						<Button variant="secondary" label={t`Set up discovery`} onPress={() => onEdit(null)} />
					</>
				) : null}
				{schedule ? (
					<>
						<Text weight={600}>{schedule.query}</Text>
						<DiscoveryStatus schedule={schedule} onEnabledChange={() => undefined} />
						<Button variant="secondary" label={t`Edit search`} onPress={() => onEdit(schedule)} />
						<Button
							variant="ghost"
							label={t`See every run in Search activity`}
							onPress={() => router.push(routes.discover("activity"))}
						/>
					</>
				) : null}
			</View>
		</SettingsGroup>
	);
}

type Kind = "all" | "discovery" | "follow-up" | "prepare";

/** Every schedule (discovery, interview preparation, follow-up reminders), filterable by kind, each linking to its owner. */
function Schedules({
	hidden,
	onOpen,
}: {
	hidden: string[];
	onOpen: (schedule: Schedule | null, kind: "discovery" | "prepare" | "follow-up") => void;
}) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const now = useNow();
	const time = useCareerTime();
	const action = useCareerAction();
	const applications = useApplications();
	const { schedules } = useTodayQueries();
	const [kind, setKind] = useState<Kind>("all");
	const rows = (schedules.data ?? []).filter(
		(row) => !hidden.includes(row.id) && (kind === "all" || row.kind === kind),
	);

	const toggle = (row: Schedule, enabled: boolean) => {
		if (enabled && !repeats(row) && row.lastQueuedAt && new Date(row.nextRunAt) <= now)
			return onOpen(row, row.kind as "discovery" | "prepare" | "follow-up");
		// Discovery pauses and resumes on the server, which resumes with one prompt run instead of replaying missed ones.
		if (row.kind === "discovery")
			return void action.run(() => client.career.setScheduleEnabled({ id: row.id, enabled }));
		void action.run(() =>
			client.career.saveSchedule({
				id: row.id,
				kind: row.kind as "discovery" | "prepare" | "follow-up",
				applicationId: row.applicationId,
				interviewId: row.interviewId,
				query: row.query,
				lead: row.lead as "24h" | "2h" | "morning" | null,
				enabled,
				email: row.email,
				nextRunAt:
					enabled && repeats(row)
						? rollForwardRepeat(new Date(row.nextRunAt), row, row.timezone)
						: new Date(row.nextRunAt),
				timezone: row.timezone,
				intervalDays: row.intervalDays,
				intervalMinutes: row.intervalMinutes,
				aiProviderId: row.aiProviderId,
			}),
		);
	};

	return (
		<SettingsGroup title={t`Schedules`}>
			<View style={{ padding: space.s3, gap: space.s3 }}>
				<Text color="ink3">{t`Discovery, interview preparation and follow-up reminders. Each links to the application it belongs to.`}</Text>
				<Segmented
					label={t`Schedule kind`}
					value={kind}
					onChange={(value) => setKind(value as Kind)}
					options={[
						{ value: "all", label: t`All` },
						{ value: "discovery", label: t`Discovery` },
						{ value: "follow-up", label: t`Follow-up` },
						{ value: "prepare", label: t`Interview preparation` },
					]}
				/>
				<Button variant="secondary" label={t`Add schedule`} onPress={() => onOpen(null, "discovery")} />
				<LoadState query={schedules} />
				{action.error ? <Banner tone="danger" message={action.error} /> : null}
				{!schedules.isError && !schedules.isPending && rows.length === 0 ? (
					<Text color="ink3">{kind === "all" ? t`Nothing scheduled yet.` : t`No schedules of this kind.`}</Text>
				) : null}
				{rows.map((row) => (
					<Card key={row.id} style={{ gap: space.s3 }}>
						<Text variant="title">{scheduleTitle(row.kind)}</Text>
						<Text>
							{row.query || applications.data?.find((application) => application.id === row.applicationId)?.company}
						</Text>
						<Text color="ink3">
							{!repeats(row) && row.lastQueuedAt ? t`Done` : row.enabled ? t`On` : t`Paused`} ·{" "}
							{time.when(row.nextRunAt)}
						</Text>
						{row.intervalMinutes ? (
							<Text color="ink3">
								{cadenceLabel(row)} · {row.timezone}
							</Text>
						) : row.intervalDays ? (
							<Text color="ink3">
								{plural(row.intervalDays, { one: "Every day", other: "Every # days" })} · {row.timezone}
							</Text>
						) : null}
						{row.kind === "discovery" && runSummary(row) ? (
							<Text
								color={
									row.activeRun
										? "infoText"
										: row.lastRun?.outcome === "failed"
											? "dangerText"
											: row.lastRun?.outcome === "partial"
												? "warnText"
												: "ink3"
								}
							>
								{row.activeRun ? stateLabel(runState(row)) : runSummary(row)}
							</Text>
						) : null}
						<SwitchRow
							label={scheduleTitle(row.kind)}
							value={row.enabled}
							disabled={action.pending}
							onValueChange={(enabled) => toggle(row, enabled)}
						/>
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
							<Button
								label={t`Edit`}
								variant="ghost"
								onPress={() => onOpen(row, row.kind as "discovery" | "prepare" | "follow-up")}
							/>
							{row.applicationId ? (
								<Button
									label={row.kind === "prepare" ? t`Open interview` : t`Open application`}
									variant="ghost"
									onPress={() =>
										router.push(routes.application(row.applicationId ?? "", row.kind === "prepare" ? "prepare" : "fit"))
									}
								/>
							) : null}
						</View>
					</Card>
				))}
				<Text variant="callout" color="ink3">{t`Email copies are optional and need a verified address.`}</Text>
			</View>
		</SettingsGroup>
	);
}
