import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { client, useCareerAction, useCareerTime } from "./hooks";
import { JobJourney } from "./pipeline-detail";
import { stepMessage, summaryLabel } from "./preparation";
import { Section } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";
import { Banner, Button, Card, SelectSheet, Text, useTheme } from "@/ui";

const PAGE_SIZE = 5;

/** Automation: each job's tailored resume and cover letter, to open, retry or regenerate. */
export function PreparationList() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const session = useSession();
	const action = useCareerAction();
	const jobs = useQuery({
		...orpc.career.preparations.queryOptions({ input: {} }),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.career.preparations.key(), session.server],
		refetchInterval: (query) =>
			query.state.data?.some((job) => job.steps.some((step) => step.status === "queued" || step.status === "running"))
				? 10_000
				: false,
	});
	const [filter, setFilter] = useState<"all" | "attention" | "ready">("all");
	const [page, setPage] = useState(0);
	if (!jobs.data?.length) return null;
	const ready = jobs.data.filter((job) => job.summary === "ready").length;
	const attention = jobs.data.filter((job) => job.summary === "attention").length;
	const matching = filter === "all" ? jobs.data : jobs.data.filter((job) => job.summary === filter);
	const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
	const current = Math.min(page, pages - 1);
	const shown = matching.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
	return (
		<Section title={t`Document preparation`}>
			<Text color="ink3">{t`Ready for review means the documents were made, not that you approved them or applied. Your application status is separate.`}</Text>
			<SelectSheet
				label={t`Show`}
				value={filter}
				onChange={(next) => {
					setFilter(next);
					setPage(0);
				}}
				options={[
					{ value: "all" as const, label: t`All ${jobs.data.length}` },
					{ value: "attention" as const, label: t`Needs attention ${attention}` },
					{ value: "ready" as const, label: t`Ready for review ${ready}` },
				]}
			/>
			<View style={{ padding: space.s3, gap: space.s3 }}>
				{shown.map((job) => (
					<PreparationCard key={job.opportunityId} job={job} />
				))}
				{matching.length > PAGE_SIZE ? (
					<View style={{ gap: space.s2 }}>
						<Text color="ink3">{t`${current * PAGE_SIZE + 1}–${Math.min(matching.length, (current + 1) * PAGE_SIZE)} of ${matching.length}`}</Text>
						<Button
							variant="secondary"
							label={t`Newer`}
							disabled={current === 0}
							onPress={() => setPage(current - 1)}
						/>
						<Button
							variant="secondary"
							label={t`Older`}
							disabled={current >= pages - 1}
							onPress={() => setPage(current + 1)}
						/>
					</View>
				) : null}
				{action.error ? <Banner tone="danger" message={action.error} /> : null}
				<Button variant="ghost" label={t`Automation settings`} onPress={() => router.push(routes.automation())} />
			</View>
		</Section>
	);
}

type PreparationJob = NonNullable<
	ReturnType<typeof useQuery<Awaited<ReturnType<typeof client.career.preparations>>>>["data"]
>[number];

type PreparationCardProps = {
	job: PreparationJob;
	/** On an application's own page the job's name and history are already there. */
	scope?: "all" | "application";
};

/** One job's resume and cover letter: status, what to open, retry or regenerate, gaps, freshness and source baseline. */
export function PreparationCard({ job, scope = "all" }: PreparationCardProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useCareerTime();
	const action = useCareerAction();
	return (
		<Card style={{ gap: space.s2 }}>
			{scope === "all" ? <Text variant="title">{[job.company, job.role].filter(Boolean).join(" · ")}</Text> : null}
			<Text color={job.summary === "attention" ? "dangerText" : job.summary === "ready" ? "okText" : "infoText"}>
				{summaryLabel(job.summary)}
			</Text>
			{job.steps.map((step) => {
				const message = stepMessage(step.error);
				return (
					<View key={step.id} style={{ gap: space.s1 }}>
						<Text>
							{step.kind === "resume" ? t`Tailored resume` : t`Cover letter`} ·{" "}
							{step.status === "done"
								? t`Done`
								: step.status === "running"
									? t`Generating`
									: step.status === "queued"
										? t`Queued`
										: step.status === "failed"
											? t`Needs attention`
											: t`Canceled`}
						</Text>
						{message ? <Text color="ink3">{message}</Text> : null}
						{step.status === "done" ? (
							<Text color="ink3">
								{step.baseline
									? step.baseline.name
										? t`Made from your baseline “${step.baseline.name}”.`
										: t`Made from a baseline resume that has since been removed.`
									: t`The baseline it was made from was not recorded.`}
							</Text>
						) : null}
						{step.outputId && step.replacedVersionId ? (
							<View style={{ gap: space.s1 }}>
								<Text color="ink3">{t`Generation ${step.generation}. The one it replaced is kept in History.`}</Text>
								<Button
									variant="ghost"
									label={t`See the earlier version`}
									onPress={() =>
										router.push(
											step.kind === "resume"
												? routes.history(step.outputId ?? "", step.replacedVersionId ?? undefined)
												: routes.letter(step.outputId ?? "", "write", step.replacedVersionId ?? undefined),
										)
									}
								/>
							</View>
						) : null}
						{step.eligibleAt ? <Text color="ink3">{t`Eligible again ${time.when(step.eligibleAt)}.`}</Text> : null}
						{step.stale ? (
							<Text color="warnText">{t`Your baseline resume or the posting changed since this was made. Regenerate to bring it up to date.`}</Text>
						) : null}
						{step.edited ? (
							<Text color="ink3">{t`You edited this document. Regenerating writes over it and keeps your edits in its History.`}</Text>
						) : null}
						<Gaps issues={step.issues} />
						{step.outputId ? (
							<Button
								variant="secondary"
								label={t`Open`}
								onPress={() =>
									router.push(
										step.kind === "resume" ? routes.builder(step.outputId ?? "") : routes.letter(step.outputId ?? ""),
									)
								}
							/>
						) : null}
						{step.status === "failed" || step.status === "canceled" ? (
							<Button
								variant="secondary"
								label={t`Retry`}
								disabled={action.pending}
								onPress={() => void action.run(() => client.career.retryPreparation({ id: step.id }))}
							/>
						) : null}
						{step.status !== "running" && step.status !== "queued" ? (
							<Button
								variant="ghost"
								label={t`Regenerate`}
								disabled={action.pending}
								onPress={() => void action.run(() => client.career.regeneratePreparation({ id: step.id }))}
							/>
						) : null}
					</View>
				);
			})}
			{scope === "all" ? <JobJourney opportunityId={job.opportunityId} /> : null}
		</Card>
	);
}

/** What the document could not say from your resume and facts; shown on request so long lists stay out of the way. */
function Gaps({ issues }: { issues: string[] }) {
	const { t } = useLingui();
	const [open, setOpen] = useState(false);
	if (issues.length === 0) return null;
	return (
		<View>
			<Button variant="ghost" label={t`${issues.length} gaps to fill`} onPress={() => setOpen(!open)} />
			{open ? issues.map((issue) => <Text key={issue} color="ink2">{`• ${issue}`}</Text>) : null}
		</View>
	);
}
