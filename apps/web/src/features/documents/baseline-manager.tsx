import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { toast } from "@reactive-resume/ui/components/toast";
import { baselineCheckLabels } from "./baseline-checks";
import { CareerLoadError } from "@/features/career/load-state";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

const failed = (error: unknown, fallback: string) =>
	toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback, allowServerMessage: true }) });

/**
 * Documents → Baseline & reusable: the resume tailored documents start from. It shows which resume is confirmed, whether it
 * changed since, and whether it is the one used for tailoring, and lets you check and confirm a different one.
 */
export function BaselineManager() {
	const queryClient = useQueryClient();
	const setup = useQuery(orpc.career.setup.queryOptions({ input: {} }));
	const automation = useQuery(orpc.career.automation.queryOptions({ input: {} }));
	const resumes = useQuery(orpc.resume.list.queryOptions());
	const baseline = setup.data?.baseline ?? null;
	const [choice, setChoice] = useState<string | null>(null);
	const [agreed, setAgreed] = useState(false);
	// The resume being looked at: a new choice, else the confirmed baseline.
	const resumeId = choice ?? baseline?.resumeId ?? "";
	const report = useQuery({
		...orpc.career.validateBaseline.queryOptions({ input: { resumeId } }),
		enabled: Boolean(resumeId),
	});
	const confirm = useMutation(orpc.career.confirmBaseline.mutationOptions());
	const tailor = useMutation(orpc.career.saveAutomation.mutationOptions());
	const labels = baselineCheckLabels();

	if (setup.isError || automation.isError)
		return (
			<CareerLoadError
				onRetry={() => {
					void setup.refetch();
					void automation.refetch();
				}}
			/>
		);
	if (!setup.data || !automation.data) return <Skeleton className="h-64 rounded-xl" />;

	const usedForTailoring = Boolean(baseline && automation.data.baselineResumeId === baseline.resumeId);
	const picking = choice !== null && choice !== baseline?.resumeId;

	const useForTailoring = () => {
		if (!baseline) return;
		const { resumesEnabled, lettersEnabled, aiProviderId, dailyLimit, resumePrompt, coverLetterPrompt } =
			automation.data;
		tailor.mutate(
			{
				resumesEnabled,
				lettersEnabled,
				baselineResumeId: baseline.resumeId,
				aiProviderId,
				dailyLimit,
				resumePrompt,
				coverLetterPrompt,
			},
			{
				onSuccess: (saved) => {
					queryClient.setQueryData(orpc.career.automation.queryOptions({ input: {} }).queryKey, saved);
					toast.add({ description: t`Tailored documents will start from this resume` });
				},
				onError: (error) => failed(error, t`Couldn't change the resume used for tailoring.`),
			},
		);
	};

	return (
		<div className="grid gap-5">
			<section aria-label={t`Current baseline`} className="grid gap-3 rounded-xl border border-line bg-surface p-5">
				{baseline ? (
					<>
						<div className="flex flex-wrap items-start gap-3">
							<span
								aria-hidden="true"
								className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-sunken text-ink-2"
							>
								<Icon name="file-text" size={22} />
							</span>
							<div className="grid min-w-0 flex-1 gap-1">
								<h2 className="text-[17px] font-semibold">{baseline.name}</h2>
								<p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
									<span className={baseline.confirmed ? "text-ok-text" : "text-warn-text"}>
										{baseline.confirmed ? t`Confirmed as your baseline` : t`Not confirmed yet`}
									</span>
									{baseline.confirmed && baseline.changedSinceConfirm && (
										<span className="text-warn-text">
											<Trans>Edited since you confirmed it</Trans>
										</span>
									)}
									<span className={usedForTailoring ? "font-medium text-accent-text" : "text-ink-3"}>
										{usedForTailoring ? t`Used for tailoring` : t`Not the resume used for tailoring`}
									</span>
								</p>
							</div>
							<Button
								variant="secondary"
								size="sm"
								nativeButton={false}
								render={<Link to="/builder/$resumeId" params={{ resumeId: baseline.resumeId }} />}
							>
								<Trans>Open resume</Trans>
							</Button>
						</div>
						{!usedForTailoring && (
							<div className="flex flex-wrap items-center gap-3 rounded-lg bg-info-soft px-3 py-2.5 text-[13px]">
								<span className="min-w-0 flex-1">
									{automation.data.baselineResumeId ? (
										<Trans>Automation tailors documents from a different resume.</Trans>
									) : (
										<Trans>Automation has no resume to tailor from yet.</Trans>
									)}
								</span>
								<Button variant="secondary" size="sm" loading={tailor.isPending} onClick={useForTailoring}>
									<Trans>Use for tailoring</Trans>
								</Button>
							</div>
						)}
					</>
				) : (
					<p className="text-sm text-ink-2">
						<Trans>No baseline resume is confirmed yet. Choose one below.</Trans>
					</p>
				)}
			</section>

			<section aria-label={t`Choose a baseline`} className="grid gap-3 rounded-xl border border-line bg-surface p-5">
				<div className="grid gap-1.5 sm:max-w-sm">
					<label htmlFor="baseline-pick" className="text-xs font-medium text-ink-2">
						<Trans>Resume</Trans>
					</label>
					<NativeSelect
						id="baseline-pick"
						value={resumeId}
						onChange={(event) => {
							setChoice(event.target.value || null);
							setAgreed(false);
						}}
					>
						<option value="">{t`Choose a resume`}</option>
						{(resumes.data ?? []).map((resume) => (
							<option key={resume.id} value={resume.id}>
								{resume.name}
							</option>
						))}
					</NativeSelect>
				</div>

				{resumeId && report.isPending && <Skeleton className="h-24" />}
				{resumeId && report.isError && (
					<p role="alert" className="text-sm text-danger-text">
						<Trans>Couldn't check this resume.</Trans>{" "}
						<button type="button" className="underline" onClick={() => void report.refetch()}>
							<Trans>Try again</Trans>
						</button>
					</p>
				)}
				{resumeId && report.data && (
					<div className="grid gap-3">
						<ul className="grid gap-1.5" aria-label={t`Resume checks`}>
							{report.data.checks.map((check) => (
								<li key={check.key} className="flex items-center gap-2 text-sm">
									<Icon
										name={check.ok ? "check-circle" : "warning"}
										size={18}
										className={check.ok ? "text-accent-text" : "text-warn-text"}
									/>
									<span className={check.ok ? "text-ink" : "text-ink-2"}>
										{labels[check.key]}
										{!check.ok && check.count > 0 && ` (${check.count})`}
									</span>
									{!check.ok && (
										<Link to="/builder/$resumeId" params={{ resumeId }} className="ms-auto text-xs underline">
											<Trans>Fix in editor</Trans>
										</Link>
									)}
								</li>
							))}
						</ul>
						<p className="text-[13px] text-ink-2">
							{t`ATS readability: ${report.data.ats.score}/100 · ${report.data.ats.counts.error} errors · ${report.data.ats.counts.warning} warnings.`}{" "}
							<button type="button" className="underline" onClick={() => void report.refetch()}>
								<Trans>Check again</Trans>
							</button>
						</p>
						{(picking || !baseline?.confirmed || baseline.changedSinceConfirm) && (
							<>
								<label htmlFor="baseline-agree" className="flex items-start gap-2 text-sm">
									<input
										id="baseline-agree"
										aria-label={t`This is my baseline resume`}
										type="checkbox"
										className="mt-1"
										checked={agreed}
										onChange={(event) => setAgreed(event.target.checked)}
									/>
									<span>
										<Trans>This is my baseline resume. Tailored documents may be based on it.</Trans>
									</span>
								</label>
								<Button
									className="w-fit"
									disabled={!agreed}
									loading={confirm.isPending}
									onClick={() =>
										confirm.mutate(
											{ resumeId },
											{
												onSuccess: (saved) => {
													queryClient.setQueryData(orpc.career.setup.queryOptions({ input: {} }).queryKey, saved);
													setChoice(null);
													setAgreed(false);
													toast.add({ description: t`Baseline confirmed` });
												},
												onError: (error) => failed(error, t`Couldn't confirm the baseline.`),
											},
										)
									}
								>
									<Trans>Confirm baseline</Trans>
								</Button>
							</>
						)}
					</div>
				)}
			</section>
			<p className="text-xs text-ink-3">
				<Trans>The baseline is only read, never changed. Tailored documents are separate copies.</Trans>{" "}
				<Link to="/dashboard/knowledge/facts" className="underline">
					<Trans>Facts and stories used for tailoring</Trans>
				</Link>
			</p>
		</div>
	);
}
