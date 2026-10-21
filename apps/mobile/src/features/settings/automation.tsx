import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { DAILY_LIMIT } from "@reactive-resume/schema/career";
import { client, useCareerAction, useCareerTime } from "../career/hooks";
import { SwitchRow } from "../career/shared";
import { SettingsGroup } from "./layout";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { useHasAIProvider } from "@/features/ai/provider-state";
import { routes } from "@/routes";
import { Banner, Button, SelectSheet, Text, TextArea, TextField, useTheme } from "@/ui";

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

/** Settings → Automation: prepare a resume and letter for each job discovery finds. Discovery has its own schedule. */
export function AutomationSettings() {
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
	const router = useRouter();
	const session = useSession();
	const time = useCareerTime();
	const action = useCareerAction();
	const ai = useHasAIProvider();
	const [draft, setDraft] = useState<Draft>(() => toDraft(data));
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
			<SettingsGroup title={t`Discovery`}>
				<View style={{ padding: space.s3, gap: space.s2 }}>
					<Text color="ink3">{t`Finding jobs is a schedule in Career. Its search, frequency, results per search, status, Run now and Pause live there.`}</Text>
					{data.discovery ? (
						<Text>{`${data.discovery.query} · ${data.discovery.enabled ? t`On` : t`Paused`}`}</Text>
					) : (
						<Text color="ink3">{t`No discovery schedule yet.`}</Text>
					)}
					<Button
						variant="secondary"
						label={t`Open Career → Today`}
						onPress={() => router.push(routes.career("today"))}
					/>
				</View>
			</SettingsGroup>

			<SettingsGroup title={t`Prepare documents`}>
				<View style={{ padding: space.s3, gap: space.s3 }}>
					<Text color="ink3">{t`For each new job, make a tailored copy of your baseline resume and/or a cover letter. They are drafts for you to review, edit and send yourself.`}</Text>
					<SwitchRow
						label={t`Generate tailored resumes automatically`}
						value={draft.resumesEnabled}
						onValueChange={(resumesEnabled) => set({ resumesEnabled })}
					/>
					<Text color="ink3">{t`A separate copy with a reworded summary and experience and reordered skills. Your baseline is never changed, and nothing is added that your resume does not say.`}</Text>
					<TextArea
						label={t`Additional resume instruction`}
						value={draft.resumePrompt}
						maxLength={2000}
						minLines={3}
						onChangeText={(resumePrompt) => set({ resumePrompt })}
						helper={t`This guides curation in addition to the fixed accuracy and privacy rules.`}
					/>
					<SwitchRow
						label={t`Generate cover letters automatically`}
						value={draft.lettersEnabled}
						onValueChange={(lettersEnabled) => set({ lettersEnabled })}
					/>
					<Text color="ink3">{t`A letter for the job, written from your baseline resume and the facts you have approved. Gaps are listed for you to fill, not invented.`}</Text>
					<TextArea
						label={t`Additional cover letter instruction`}
						value={draft.coverLetterPrompt}
						maxLength={2000}
						minLines={3}
						onChangeText={(coverLetterPrompt) => set({ coverLetterPrompt })}
						helper={t`This guides curation in addition to the fixed accuracy and privacy rules.`}
					/>
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
				</View>
			</SettingsGroup>

			{action.error ? <Banner tone="danger" message={action.error} /> : null}
			<Button label={t`Save automation`} loading={action.pending} disabled={!dirty || blocked} onPress={save} />
			<PreparationLink />
		</View>
	);
}

/** A pointer to the list, which lives in Today; it only says how much is waiting for review. */
function PreparationLink() {
	const { t } = useLingui();
	const router = useRouter();
	const session = useSession();
	const jobs = useQuery({
		...orpc.career.preparations.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.preparations.key(), session.server],
	});
	if (!jobs.data?.length) return null;
	const ready = jobs.data.filter((job) => job.summary === "ready").length;
	const attention = jobs.data.filter((job) => job.summary === "attention").length;
	return (
		<>
			<Text color="ink2">{t`${ready} ready for review, ${attention} need attention.`}</Text>
			<Button
				variant="secondary"
				label={t`Open document preparation in Pipeline`}
				onPress={() => router.push(routes.career("pipeline"))}
			/>
		</>
	);
}
