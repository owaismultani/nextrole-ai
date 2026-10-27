import type { SetupInterval } from "@reactive-resume/schema/career";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { DEFAULT_COVER_LETTER_PROMPT, DEFAULT_RESUME_PROMPT } from "@reactive-resume/schema/career";
import { ProviderList } from "../ai/provider-list";
import { useHasAIProvider } from "../ai/provider-state";
import { WebAccessSettings } from "../ai/web-access";
import { useCareerTime } from "../career/hooks";
import { SwitchRow } from "../career/shared";
import { baselineCheckLabels } from "../documents/baseline-checks";
import { client, orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, Screen, SelectSheet, Text, TextArea, TextField, useTheme } from "@/ui";

type Stage = "baseline" | "services" | "discovery" | "launch";
type Plan = {
	query: string;
	interval: SetupInterval;
	resumesEnabled: boolean;
	lettersEnabled: boolean;
	resumePrompt: string;
	coverLetterPrompt: string;
	dailyLimit: string;
};

/**
 * First-run setup: confirm a baseline resume, connect search and AI, set up discovery and start it. Every step can be
 * skipped, and the guide can be resumed from Overview.
 */
export function SetupScreen() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const queryClient = useQueryClient();
	const time = useCareerTime();
	const ai = useHasAIProvider();
	const [stage, setStage] = useState<Stage | null>(null);
	const [edits, setEdits] = useState<Partial<Plan>>({});
	const [resumeId, setResumeId] = useState<string | null>(null);
	const [agreed, setAgreed] = useState(false);
	const [error, setError] = useState<string>();
	const signedIn = session.status === "signed-in";

	const setup = useQuery({
		...orpc.career.setup.queryOptions({ input: {} }),
		enabled: signedIn,
		queryKey: [...orpc.career.setup.key(), session.server],
	});
	const resumes = useQuery({
		...orpc.resume.list.queryOptions(),
		enabled: signedIn,
		queryKey: [...orpc.resume.list.key(), session.server],
	});
	const web = useQuery({
		...orpc.webAccess.status.queryOptions(),
		enabled: signedIn,
		queryKey: [...orpc.webAccess.status.key(), session.server],
	});
	const chosen = resumeId ?? setup.data?.baseline?.resumeId ?? "";
	const report = useQuery({
		...orpc.career.validateBaseline.queryOptions({ input: { resumeId: chosen } }),
		enabled: signedIn && Boolean(chosen),
		queryKey: [...orpc.career.validateBaseline.key(), session.server, chosen],
	});
	// A file imported in the New sheet shows up when this screen is focused again.
	useFocusEffect(
		useCallback(() => {
			void resumes.refetch();
		}, [resumes]),
	);

	const refreshSetup = () => queryClient.invalidateQueries({ queryKey: orpc.career.key() });
	const confirm = useMutation({
		mutationFn: () => client.career.confirmBaseline({ resumeId: chosen }),
		onSuccess: async () => {
			setError(undefined);
			await refreshSetup();
			setStage("services");
		},
		onError: () => setError(t`Couldn't confirm the baseline. Try again.`),
	});
	const preview = useMutation({ mutationFn: (query: string) => client.career.previewSearch({ query }) });
	const launch = useMutation({
		mutationFn: (plan: Plan) =>
			client.career.launchSetup({
				query: plan.query.trim(),
				interval: plan.interval,
				retrievalBudget: 15,
				resumesEnabled: plan.resumesEnabled,
				lettersEnabled: plan.lettersEnabled,
				resumePrompt: plan.resumePrompt,
				coverLetterPrompt: plan.coverLetterPrompt,
				aiProviderId: null,
				dailyLimit: Math.max(1, Number.parseInt(plan.dailyLimit, 10) || 10),
				timezone: time.timeZone,
				locale: time.locale,
			}),
		onSuccess: async () => {
			await refreshSetup();
			router.replace(routes.overview());
		},
		onError: () => setError(t`Couldn't start discovery. Check your connections and try again.`),
	});
	const skip = useMutation({
		mutationFn: () => client.career.skipSetup({}),
		onSuccess: async () => {
			await refreshSetup();
			router.replace(routes.documents());
		},
	});

	if (!setup.data)
		return <Screen>{setup.isError ? <Banner tone="danger" message={t`Couldn't load setup.`} /> : null}</Screen>;
	const initial: Stage =
		setup.data.step === "baseline" ? "baseline" : setup.data.step === "services" ? "services" : "discovery";
	const current = stage ?? initial;
	const plan: Plan = {
		query: setup.data.baseline?.suggestedQuery ?? "",
		interval: "hourly",
		resumesEnabled: false,
		lettersEnabled: false,
		resumePrompt: DEFAULT_RESUME_PROMPT,
		coverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
		dailyLimit: "10",
		...edits,
	};
	const set = (patch: Partial<Plan>) => setEdits((value) => ({ ...value, ...patch }));
	const search = web.data?.search === true;
	const queryOk = plan.query.trim().length >= 3;
	const wantsDocuments = plan.resumesEnabled || plan.lettersEnabled;

	const labels = baselineCheckLabels();
	const steps = [t`Baseline resume`, t`Connect services`, t`Set up discovery`, t`Start`];
	const index = ["baseline", "services", "discovery", "launch"].indexOf(current);

	return (
		<Screen>
			<Text variant="heading">{t`Let's set up your job search`}</Text>
			<Text color="ink3">{t`Step ${index + 1} of 4: ${steps[index] ?? ""}. You review every document and apply yourself.`}</Text>
			{error ? <Banner tone="danger" message={error} /> : null}

			{current === "baseline" ? (
				<View style={{ gap: space.s3 }}>
					<Text color="ink2">{t`This is the resume your tailored documents start from. It is only read, never changed.`}</Text>
					<SelectSheet
						label={t`Use an existing resume`}
						value={chosen}
						placeholder={t`Choose a resume`}
						onChange={(id) => {
							setResumeId(id);
							setAgreed(false);
						}}
						options={(resumes.data ?? []).map((resume) => ({ value: resume.id, label: resume.name }))}
					/>
					<Button variant="secondary" label={t`Import a file`} onPress={() => router.push(routes.new())} />
					<Button
						variant="secondary"
						label={t`Start blank`}
						onPress={() => {
							void client.resume
								.create({ name: t`My baseline resume`, tags: [], autoName: false, withSampleData: false })
								.then(async (id) => {
									await resumes.refetch();
									setResumeId(id);
									setAgreed(false);
								})
								.catch(() => setError(t`Couldn't create the resume.`));
						}}
					/>
					{chosen && report.data ? (
						<Card style={{ gap: space.s2 }}>
							{report.data.checks.map((check) => (
								<Text key={check.key} color={check.ok ? "accentText" : "warnText"}>
									{`${check.ok ? "✓" : "!"} ${labels[check.key]}${!check.ok && check.count > 0 ? ` (${check.count})` : ""}`}
								</Text>
							))}
							<Text color="ink3">{t`ATS readability: ${report.data.ats.score}/100 · ${report.data.ats.counts.error} errors · ${report.data.ats.counts.warning} warnings.`}</Text>
							{report.data.checks.some((check) => !check.ok) ? (
								<Banner
									tone="warn"
									message={t`Gaps here mean weaker tailored documents. You can continue anyway and fix them later.`}
								/>
							) : null}
							<Button variant="ghost" label={t`Open the editor`} onPress={() => router.push(routes.builder(chosen))} />
							<Button variant="ghost" label={t`Check again`} onPress={() => void report.refetch()} />
							<SwitchRow label={t`This is my baseline resume`} value={agreed} onValueChange={setAgreed} />
						</Card>
					) : null}
					<Button
						label={t`Confirm baseline`}
						disabled={!chosen || !agreed}
						loading={confirm.isPending}
						onPress={() => confirm.mutate()}
					/>
				</View>
			) : null}

			{current === "services" ? (
				<View style={{ gap: space.s3 }}>
					<Text color="ink2">{t`Job search works right away with free job sources. Web search adds results from across the web. Tailored documents need an AI provider; skip that to only discover jobs.`}</Text>
					<Text color="accentText">{`✓ ${t`Free job sources`}`}</Text>
					<Text color={search ? "accentText" : "ink3"}>{`${search ? "✓" : "○"} ${t`Web search (optional)`}`}</Text>
					<Text
						color={ai.hasAIProvider ? "accentText" : "ink3"}
					>{`${ai.hasAIProvider ? "✓" : "○"} ${t`AI provider (optional)`}`}</Text>
					<WebAccessSettings />
					<ProviderList />
					<Button label={t`Back`} variant="ghost" onPress={() => setStage("baseline")} />
					<Button
						label={t`Continue`}
						onPress={() => {
							void refreshSetup();
							setStage("discovery");
						}}
					/>
				</View>
			) : null}

			{current === "discovery" ? (
				<View style={{ gap: space.s3 }}>
					<TextField
						label={t`Look for`}
						value={plan.query}
						maxLength={500}
						onChangeText={(query) => set({ query })}
						helper={t`One search, run on a schedule. Started from your resume's headline.`}
					/>
					<SelectSheet
						label={t`How often`}
						value={plan.interval}
						onChange={(interval) => set({ interval })}
						options={[
							{ value: "hourly" as const, label: t`Every hour` },
							{ value: "3h" as const, label: t`Every 3 hours` },
							{ value: "6h" as const, label: t`Every 6 hours` },
							{ value: "daily" as const, label: t`Every day` },
						]}
					/>
					<Button
						variant="secondary"
						label={t`Preview results`}
						disabled={!queryOk}
						loading={preview.isPending}
						onPress={() => preview.mutate(plan.query.trim())}
					/>
					{preview.isError ? <Banner tone="danger" message={t`The search could not run.`} /> : null}
					{preview.data?.length === 0 ? <Text color="ink3">{t`No results. Try broader roles or places.`}</Text> : null}
					{preview.data?.map((result) => (
						<Card key={result.url} style={{ gap: space.s1 }}>
							<Text weight={600}>{result.title}</Text>
							<Text color="ink3" numberOfLines={2}>
								{result.description}
							</Text>
						</Card>
					))}
					{preview.data ? (
						<Text
							variant="callout"
							color="ink3"
						>{t`A preview only: nothing is saved. Searches the free job sources, and web search when connected, filtered by your Preferences.`}</Text>
					) : null}
					<SwitchRow
						label={t`Tailored resumes`}
						value={plan.resumesEnabled}
						onValueChange={(resumesEnabled) => set({ resumesEnabled })}
					/>
					{plan.resumesEnabled ? (
						<>
							<TextArea
								label={t`Additional resume instruction`}
								value={plan.resumePrompt}
								maxLength={2000}
								minLines={3}
								onChangeText={(resumePrompt) => set({ resumePrompt })}
								helper={t`This guides the writing in addition to the fixed accuracy and privacy rules.`}
							/>
							{plan.resumePrompt !== DEFAULT_RESUME_PROMPT ? (
								<Button
									variant="ghost"
									label={t`Restore default`}
									onPress={() => set({ resumePrompt: DEFAULT_RESUME_PROMPT })}
								/>
							) : null}
						</>
					) : null}
					<SwitchRow
						label={t`Cover letters`}
						value={plan.lettersEnabled}
						onValueChange={(lettersEnabled) => set({ lettersEnabled })}
					/>
					{plan.lettersEnabled ? (
						<>
							<TextArea
								label={t`Additional cover letter instruction`}
								value={plan.coverLetterPrompt}
								maxLength={2000}
								minLines={3}
								onChangeText={(coverLetterPrompt) => set({ coverLetterPrompt })}
								helper={t`This guides the writing in addition to the fixed accuracy and privacy rules.`}
							/>
							{plan.coverLetterPrompt !== DEFAULT_COVER_LETTER_PROMPT ? (
								<Button
									variant="ghost"
									label={t`Restore default`}
									onPress={() => set({ coverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT })}
								/>
							) : null}
						</>
					) : null}
					{wantsDocuments ? (
						<>
							<TextField
								label={t`Documents per day`}
								value={plan.dailyLimit}
								keyboardType="number-pad"
								maxLength={2}
								onChangeText={(dailyLimit) => set({ dailyLimit })}
								helper={t`Each generated resume or letter counts once; the count resets at midnight in ${time.timeZone}. Work over the limit waits.`}
							/>
							{!ai.hasAIProvider ? (
								<Banner
									tone="warn"
									message={t`Documents need an AI provider that has passed its test. Go back to connect one.`}
								/>
							) : null}
						</>
					) : null}
					<Button label={t`Back`} variant="ghost" onPress={() => setStage("services")} />
					<Button
						label={t`Review`}
						disabled={!queryOk || (wantsDocuments && !ai.hasAIProvider)}
						onPress={() => setStage("launch")}
					/>
				</View>
			) : null}

			{current === "launch" ? (
				<View style={{ gap: space.s3 }}>
					<Card style={{ gap: space.s2 }}>
						<Text>{`${t`Baseline resume`}: ${setup.data.baseline?.name ?? "—"}`}</Text>
						<Text>{`${t`Search`}: ${plan.query}`}</Text>
						<Text>
							{`${t`Documents`}: ${
								wantsDocuments
									? [plan.resumesEnabled ? t`tailored resumes` : null, plan.lettersEnabled ? t`cover letters` : null]
											.filter(Boolean)
											.join(` ${t`and`} `)
									: t`None. Jobs are found and saved only.`
							}`}
						</Text>
					</Card>
					<Banner
						tone="info"
						message={t`The first search starts right away. Nothing is sent to employers and no application is marked as submitted.`}
					/>
					<Button label={t`Back`} variant="ghost" onPress={() => setStage("discovery")} />
					<Button label={t`Start discovery`} loading={launch.isPending} onPress={() => launch.mutate(plan)} />
				</View>
			) : null}

			<Button variant="ghost" label={t`Skip for now`} loading={skip.isPending} onPress={() => skip.mutate()} />
		</Screen>
	);
}
