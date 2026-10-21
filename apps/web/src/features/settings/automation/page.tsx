import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useId, useState } from "react";
import { DAILY_LIMIT } from "@reactive-resume/schema/career";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { SwitchRow } from "@reactive-resume/ui/components/switch";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { SettingsSection } from "../section";
import { PageHeader } from "@/components/layout/page-header";
import { cadenceLabel } from "@/features/career/discovery-run";
import { useCareerTime } from "@/features/career/shared";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type Automation = RouterOutput["career"]["automation"];
type Draft = {
	resumesEnabled: boolean;
	lettersEnabled: boolean;
	baselineResumeId: string;
	aiProviderId: string;
	dailyLimit: number;
	resumePrompt: string;
	coverLetterPrompt: string;
};

const toDraft = (data: Automation): Draft => ({
	resumesEnabled: data.resumesEnabled,
	lettersEnabled: data.lettersEnabled,
	baselineResumeId: data.baselineResumeId ?? "",
	aiProviderId: data.aiProviderId ?? "",
	dailyLimit: data.dailyLimit,
	resumePrompt: data.resumePrompt,
	coverLetterPrompt: data.coverLetterPrompt,
});

/** Settings → Automation: prepare a resume and cover letter for each job discovery finds. Discovery has its own schedule. */
export function AutomationSettings() {
	const { data, isError, refetch } = useQuery(orpc.career.automation.queryOptions({ input: {} }));
	return (
		<>
			<PageHeader
				title={<Trans>Automation</Trans>}
				description={
					<Trans>
						Prepare documents for the jobs your discovery schedule finds. You apply yourself; nothing is ever sent to an
						employer.
					</Trans>
				}
			/>
			{isError ? (
				<Button variant="secondary" onClick={() => void refetch()}>
					<Trans>Try again</Trans>
				</Button>
			) : data ? (
				<AutomationForm data={data} />
			) : null}
			<PreparationLink />
		</>
	);
}

function AutomationForm({ data }: { data: Automation }) {
	const id = useId();
	const context = useRouteContext({ strict: false });
	const { timeZone, format } = useCareerTime();
	const [draft, setDraft] = useState<Draft>(() => toDraft(data));
	const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
	const { data: resumes } = useQuery(orpc.resume.list.queryOptions());
	const { usableProviders, hasUsableProvider, isLoading } = useHasUsableAiProvider();
	const save = useMutation(orpc.career.saveAutomation.mutationOptions());

	const wantsDocuments = draft.resumesEnabled || draft.lettersEnabled;
	const missingBaseline = wantsDocuments && !draft.baselineResumeId;
	const missingAi = wantsDocuments && !isLoading && !hasUsableProvider;
	const blocked = missingBaseline || missingAi;
	const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(data));

	const onSave = () =>
		save.mutate(
			{
				resumesEnabled: draft.resumesEnabled,
				lettersEnabled: draft.lettersEnabled,
				baselineResumeId: draft.baselineResumeId || null,
				aiProviderId: draft.aiProviderId || null,
				dailyLimit: draft.dailyLimit,
				resumePrompt: draft.resumePrompt,
				coverLetterPrompt: draft.coverLetterPrompt,
			},
			{
				onSuccess: () => toast.add({ description: t`Automation saved` }),
				onError: (error) =>
					toast.add({
						type: "error",
						description: getOrpcErrorMessage(error, {
							fallback: t`Couldn't save automation.`,
							allowServerMessage: true,
						}),
					}),
			},
		);

	return (
		<div className="grid gap-8">
			<SettingsSection
				title={<Trans>Discovery</Trans>}
				description={
					<Trans>
						Finding jobs is a schedule in Career. Its search, frequency, results per search, status, Run now and Pause
						live there.
					</Trans>
				}
			>
				<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					{data.discovery ? (
						<>
							<span className="font-medium">{data.discovery.query}</span>
							<span className="text-ink-3">
								{data.discovery.enabled ? t`On` : t`Paused`} ·{" "}
								{cadenceLabel({
									intervalDays: data.discovery.intervalDays,
									intervalMinutes: data.discovery.intervalMinutes,
								})}
							</span>
						</>
					) : (
						<span className="text-ink-3">
							<Trans>No discovery schedule yet.</Trans>
						</span>
					)}
					<Link to="/dashboard/career" className="underline">
						<Trans>Open Career → Schedules</Trans>
					</Link>
				</p>
			</SettingsSection>

			<SettingsSection
				title={<Trans>Prepare documents</Trans>}
				description={
					<Trans>
						For each new job, make a tailored copy of your baseline resume and/or a cover letter. They are drafts for
						you to review, edit and send yourself.
					</Trans>
				}
			>
				<SwitchRow
					checked={draft.resumesEnabled}
					onCheckedChange={(resumesEnabled) => set({ resumesEnabled })}
					label={<span className="font-semibold">{t`Generate tailored resumes automatically`}</span>}
					description={t`A separate copy with a reworded summary and experience and reordered skills. Your baseline is never changed, and nothing is added that your resume does not say.`}
					className="rounded-lg border border-line px-3 py-3"
				/>
				<div className="grid gap-1.5">
					<label htmlFor={`${id}-resume-prompt`} className="text-xs font-medium text-ink-2">
						<Trans>Additional resume instruction</Trans>
					</label>
					<Textarea
						id={`${id}-resume-prompt`}
						rows={3}
						maxLength={2000}
						value={draft.resumePrompt}
						onChange={(event) => set({ resumePrompt: event.target.value })}
						placeholder={t`Example: Emphasize leadership experience relevant to this role.`}
					/>
					<p className="text-xs text-ink-3">
						<Trans>This guides curation in addition to the fixed accuracy and privacy rules.</Trans>
					</p>
				</div>
				<SwitchRow
					checked={draft.lettersEnabled}
					onCheckedChange={(lettersEnabled) => set({ lettersEnabled })}
					label={<span className="font-semibold">{t`Generate cover letters automatically`}</span>}
					description={t`A letter for the job, written from your baseline resume and the facts you have approved. Gaps are listed for you to fill, not invented.`}
					className="rounded-lg border border-line px-3 py-3"
				/>
				<div className="grid gap-1.5">
					<label htmlFor={`${id}-cover-letter-prompt`} className="text-xs font-medium text-ink-2">
						<Trans>Additional cover letter instruction</Trans>
					</label>
					<Textarea
						id={`${id}-cover-letter-prompt`}
						rows={3}
						maxLength={2000}
						value={draft.coverLetterPrompt}
						onChange={(event) => set({ coverLetterPrompt: event.target.value })}
						placeholder={t`Example: Keep the tone warm and focus on customer impact.`}
					/>
					<p className="text-xs text-ink-3">
						<Trans>This guides curation in addition to the fixed accuracy and privacy rules.</Trans>
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<label htmlFor={`${id}-baseline`} className="text-xs font-medium text-ink-2">
							<Trans>Baseline resume</Trans>
						</label>
						<NativeSelect
							id={`${id}-baseline`}
							value={draft.baselineResumeId}
							onChange={(event) => set({ baselineResumeId: event.target.value })}
							aria-invalid={missingBaseline || undefined}
						>
							<option value="">{t`Choose a resume`}</option>
							{(resumes ?? []).map((resume) => (
								<option key={resume.id} value={resume.id}>
									{resume.name}
								</option>
							))}
						</NativeSelect>
					</div>
					<div className="grid gap-1.5">
						<label htmlFor={`${id}-ai`} className="text-xs font-medium text-ink-2">
							<Trans>AI connection</Trans>
						</label>
						<NativeSelect
							id={`${id}-ai`}
							value={draft.aiProviderId}
							onChange={(event) => set({ aiProviderId: event.target.value })}
						>
							<option value="">{t`Use my default`}</option>
							{usableProviders.map((provider) => (
								<option key={provider.id} value={provider.id}>
									{provider.label}
								</option>
							))}
						</NativeSelect>
					</div>
				</div>
				{missingBaseline && (
					<Guidance>
						<Trans>Choose the resume to tailor from. It is only read, never changed.</Trans>
					</Guidance>
				)}
				{missingAi && (
					<Guidance>
						<Trans>Document generation needs an AI connection that has passed its test.</Trans>{" "}
						<Link to="/dashboard/settings/ai" className="underline">
							<Trans>Connect one in AI &amp; developer</Trans>
						</Link>
					</Guidance>
				)}
				<div className="grid gap-1.5 sm:max-w-xs">
					<label htmlFor={`${id}-limit`} className="text-xs font-medium text-ink-2">
						<Trans>Documents per day</Trans>
					</label>
					<Input
						id={`${id}-limit`}
						type="number"
						min={DAILY_LIMIT.min}
						max={DAILY_LIMIT.max}
						value={draft.dailyLimit}
						onChange={(event) =>
							set({
								dailyLimit: Math.min(
									DAILY_LIMIT.max,
									Math.max(DAILY_LIMIT.min, Number(event.target.value) || DAILY_LIMIT.min),
								),
							})
						}
					/>
					<p className="text-xs text-ink-3">
						<Trans>
							Each generated resume or letter counts once, on its first attempt; retries do not count again. The count
							resets at midnight in {timeZone}. Work over the limit waits and starts after the reset.
						</Trans>{" "}
						{t`Today: ${data.usage.used} of ${data.usage.limit} used; resets ${format(data.usage.resetsAt, { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.`}
					</p>
				</div>
				<p className="flex gap-2.5 rounded-lg bg-info-soft px-3 py-2.5 text-[13px] leading-[19px] text-ink">
					<Icon name="info" size={18} className="mt-px shrink-0 text-info-text" />
					<span>
						<Trans>
							Turning a type off stops new work of that type from starting, including work already waiting; a document
							being written finishes and is saved. Turning one on affects jobs found from now on. Jobs you already have
							are only prepared when you choose them.
						</Trans>
					</span>
				</p>
			</SettingsSection>

			<div className="flex items-center gap-3">
				<Button loading={save.isPending} disabled={!dirty || blocked} onClick={onSave}>
					<Trans>Save automation</Trans>
				</Button>
				{context.flags?.careerSchedulingEnabled === false && (
					<p className="text-xs text-warn-text">
						<Trans>Scheduled work is not available on this server. Ask the server owner to configure it.</Trans>
					</p>
				)}
			</div>
		</div>
	);
}

function Guidance({ children }: { children: React.ReactNode }) {
	return (
		<p className="flex gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] leading-[19px] text-warn-text">
			<Icon name="warning" size={16} className="mt-0.5 shrink-0" />
			<span>{children}</span>
		</p>
	);
}

/** A pointer to the list, which lives in Today; it only says how much is waiting for review. */
function PreparationLink() {
	const { data: jobs } = useQuery(orpc.career.preparations.queryOptions({ input: {} }));
	if (!jobs?.length) return null;
	const ready = jobs.filter((job) => job.summary === "ready").length;
	const attention = jobs.filter((job) => job.summary === "attention").length;
	return (
		<p className="mt-8 text-sm text-ink-2">
			{t`${ready} ready for review, ${attention} need attention.`}{" "}
			<Link to="/dashboard/career/pipeline" className="underline">
				<Trans>Open document preparation in Pipeline</Trans>
			</Link>
		</p>
	);
}
