import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { LoadState, SwitchRow } from "../career/shared";
import { baselineCheckLabels } from "./baseline-checks";
import { client, orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, SelectSheet, Text, showToast, useTheme } from "@/ui";

/**
 * Documents → Baseline & reusable: the resume tailored documents start from. It shows which resume is confirmed, whether it
 * changed since, and whether it is the one used for tailoring, and lets you check and confirm a different one.
 */
export function BaselineManager() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const queryClient = useQueryClient();
	const signedIn = session.status === "signed-in";
	const setup = useQuery({
		...orpc.career.setup.queryOptions({ input: {} }),
		enabled: signedIn,
		queryKey: [...orpc.career.setup.key(), session.server],
	});
	const automation = useQuery({
		...orpc.career.automation.queryOptions({ input: {} }),
		enabled: signedIn,
		queryKey: [...orpc.career.automation.key(), session.server],
	});
	const resumes = useQuery({
		...orpc.resume.list.queryOptions(),
		enabled: signedIn,
		queryKey: [...orpc.resume.list.key(), session.server],
	});
	const baseline = setup.data?.baseline ?? null;
	const [choice, setChoice] = useState<string | null>(null);
	const [agreed, setAgreed] = useState(false);
	const [error, setError] = useState<string>();
	const resumeId = choice ?? baseline?.resumeId ?? "";
	const report = useQuery({
		...orpc.career.validateBaseline.queryOptions({ input: { resumeId } }),
		enabled: signedIn && Boolean(resumeId),
		queryKey: [...orpc.career.validateBaseline.key(), session.server, resumeId],
	});
	const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.career.key() });
	const confirm = useMutation({
		mutationFn: () => client.career.confirmBaseline({ resumeId }),
		onSuccess: async () => {
			setError(undefined);
			setChoice(null);
			setAgreed(false);
			await refresh();
			showToast({ message: t`Baseline confirmed` });
		},
		onError: () => setError(t`Couldn't confirm the baseline.`),
	});
	const tailor = useMutation({
		mutationFn: () => {
			const current = automation.data;
			if (!current || !baseline) throw new Error("not ready");
			return client.career.saveAutomation({
				resumesEnabled: current.resumesEnabled,
				lettersEnabled: current.lettersEnabled,
				baselineResumeId: baseline.resumeId,
				aiProviderId: current.aiProviderId,
				dailyLimit: current.dailyLimit,
				resumePrompt: current.resumePrompt,
				coverLetterPrompt: current.coverLetterPrompt,
			});
		},
		onSuccess: async () => {
			setError(undefined);
			await refresh();
			showToast({ message: t`Tailored documents will start from this resume` });
		},
		onError: () => setError(t`Couldn't change the resume used for tailoring.`),
	});
	const labels = baselineCheckLabels();
	const usedForTailoring = Boolean(baseline && automation.data?.baselineResumeId === baseline.resumeId);
	const picking = choice !== null && choice !== baseline?.resumeId;

	return (
		<View style={{ gap: space.s4 }}>
			<LoadState query={setup} />
			{error ? <Banner tone="danger" message={error} /> : null}
			{setup.data && automation.data ? (
				<View style={{ gap: space.s4 }}>
					<Card style={{ gap: space.s2 }}>
						{baseline ? (
							<>
								<Text variant="title">{baseline.name}</Text>
								<Text color={baseline.confirmed ? "okText" : "warnText"}>
									{baseline.confirmed ? t`Confirmed as your baseline` : t`Not confirmed yet`}
								</Text>
								{baseline.confirmed && baseline.changedSinceConfirm ? (
									<Text color="warnText">{t`Edited since you confirmed it`}</Text>
								) : null}
								<Text color={usedForTailoring ? "accentText" : "ink3"}>
									{usedForTailoring ? t`Used for tailoring` : t`Not the resume used for tailoring`}
								</Text>
								<Button
									variant="secondary"
									label={t`Open resume`}
									onPress={() => router.push(routes.builder(baseline.resumeId))}
								/>
								{!usedForTailoring ? (
									<>
										<Banner
											tone="info"
											message={
												automation.data.baselineResumeId
													? t`Automation tailors documents from a different resume.`
													: t`Automation has no resume to tailor from yet.`
											}
										/>
										<Button
											variant="secondary"
											label={t`Use for tailoring`}
											loading={tailor.isPending}
											onPress={() => tailor.mutate()}
										/>
									</>
								) : null}
							</>
						) : (
							<Text color="ink2">{t`No baseline resume is confirmed yet. Choose one below.`}</Text>
						)}
					</Card>

					<Card style={{ gap: space.s3 }}>
						<SelectSheet
							label={t`Resume`}
							value={resumeId}
							placeholder={t`Choose a resume`}
							onChange={(id) => {
								setChoice(id);
								setAgreed(false);
							}}
							options={(resumes.data ?? []).map((resume) => ({ value: resume.id, label: resume.name }))}
						/>
						{resumeId ? <LoadState query={report} /> : null}
						{resumeId && report.data ? (
							<View style={{ gap: space.s2 }}>
								{report.data.checks.map((check) => (
									<Text key={check.key} color={check.ok ? "accentText" : "warnText"}>
										{`${check.ok ? "✓" : "!"} ${labels[check.key]}${!check.ok && check.count > 0 ? ` (${check.count})` : ""}`}
									</Text>
								))}
								<Text color="ink3">{t`ATS readability: ${report.data.ats.score}/100 · ${report.data.ats.counts.error} errors · ${report.data.ats.counts.warning} warnings.`}</Text>
								<Button
									variant="ghost"
									label={t`Open the editor`}
									onPress={() => router.push(routes.builder(resumeId))}
								/>
								<Button variant="ghost" label={t`Check again`} onPress={() => void report.refetch()} />
								{picking || !baseline?.confirmed || baseline.changedSinceConfirm ? (
									<>
										<SwitchRow label={t`This is my baseline resume`} value={agreed} onValueChange={setAgreed} />
										<Button
											label={t`Confirm baseline`}
											disabled={!agreed}
											loading={confirm.isPending}
											onPress={() => confirm.mutate()}
										/>
									</>
								) : null}
							</View>
						) : null}
					</Card>
					<Text
						variant="callout"
						color="ink3"
					>{t`The baseline is only read, never changed. Tailored documents are separate copies.`}</Text>
				</View>
			) : null}
		</View>
	);
}
