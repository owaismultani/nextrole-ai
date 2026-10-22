import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useId, useState } from "react";
import { DAILY_LIMIT } from "@reactive-resume/schema/career";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { SwitchRow } from "@reactive-resume/ui/components/switch";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { Schedules } from "./schedules";
import { PageHeader } from "@/components/layout/page-header";
import { DiscoveryStatus } from "@/features/career/discovery-status";
import { HealthChecklist, StageMap } from "@/features/career/pipeline-map";
import { PreparationList } from "@/features/career/preparation-list";
import { ScheduleSheet } from "@/features/career/schedule-sheet";
import { useScheduleSheet } from "@/features/career/schedule-state";
import { useCareerTime } from "@/features/career/shared";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { SettingsSection } from "@/features/settings/section";
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

type AutomationPageProps = { schedule: string | undefined };

/**
 * Automation: everything that runs in the background. Discovery and document preparation are configured here, and
 * every schedule is managed here; the search is edited in the same editor Discover opens. You apply yourself; nothing
 * is ever sent to an employer.
 */
export function AutomationPage({ schedule }: AutomationPageProps) {
	const navigate = useNavigate({ from: "/dashboard/automation" });
	const sheet = useScheduleSheet(
		schedule,
		(next, replace) =>
			void navigate({
				search: (previous: { schedule?: string | undefined }) => ({ ...previous, schedule: next }),
				replace,
			}),
	);
	const { data, isError, refetch } = useQuery(orpc.career.automation.queryOptions({ input: {} }));
	const overview = useQuery({
		...orpc.career.overview.queryOptions({ input: { days: 7 } }),
		refetchInterval: 30_000,
	});
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[860px] flex-col gap-8 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<PageHeader
				title={<Trans>Automation</Trans>}
				description={
					<Trans>
						Find jobs on a schedule and prepare documents for them. You apply yourself; nothing is ever sent to an
						employer.
					</Trans>
				}
			/>
			{isError ? (
				<Button variant="secondary" className="w-fit" onClick={() => void refetch()}>
					<Trans>Try again</Trans>
				</Button>
			) : data ? (
				<AutomationForm data={data} onEditSearch={sheet.onScheduleChange} deleted={sheet.deleted} />
			) : null}

			<SettingsSection
				title={<Trans>Schedules</Trans>}
				description={
					<Trans>
						Discovery, interview preparation and follow-up reminders. Each links to the application it belongs to.
					</Trans>
				}
			>
				<Schedules deleted={sheet.deleted} onOpenSchedule={sheet.onScheduleChange} />
			</SettingsSection>

			<SettingsSection
				title={<Trans>How it's working</Trans>}
				description={<Trans>Each step of the pipeline, and a checklist of what has to be working.</Trans>}
			>
				{overview.data && <StageMap stages={overview.data.stages} />}
				{overview.data && <HealthChecklist checks={overview.data.checks} />}
				<PreparationList />
			</SettingsSection>
			<ScheduleSheet schedule={schedule} onScheduleChange={sheet.onScheduleChange} onDelete={sheet.deleteSchedule} />
		</div>
	);
}

type AutomationFormProps = { data: Automation; onEditSearch: (schedule: string) => void; deleted: string[] };

function AutomationForm({ data, onEditSearch, deleted }: AutomationFormProps) {
	const id = useId();
	const queryClient = useQueryClient();
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
				onSuccess: (saved) => {
					queryClient.setQueryData(orpc.career.automation.queryOptions({ input: {} }).queryKey, saved);
					toast.add({ description: t`Automation saved` });
				},
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
						The search that finds new roles. Edit it here or from Discover; it is the same search. Results are reviewed
						in Discover.
					</Trans>
				}
			>
				<DiscoverySection onEdit={onEditSearch} deleted={deleted} />
			</SettingsSection>

			<SettingsSection
				title={<Trans>Document preparation</Trans>}
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
				<SwitchRow
					checked={draft.lettersEnabled}
					onCheckedChange={(lettersEnabled) => set({ lettersEnabled })}
					label={<span className="font-semibold">{t`Generate cover letters automatically`}</span>}
					description={t`A letter for the job, written from your baseline resume and the facts you have approved. Gaps are listed for you to fill, not invented.`}
					className="rounded-lg border border-line px-3 py-3"
				/>
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
				<details className="group rounded-lg border border-line">
					<summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 text-sm font-medium">
						<Icon
							name="caret-right"
							size={18}
							className="transition-transform duration-standard ease-enter group-open:rotate-90"
						/>
						<Trans>Advanced writing instructions</Trans>
					</summary>
					<div className="grid gap-4 border-t border-line px-3 py-3">
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
					</div>
				</details>
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

/** The saved search, its state and last run, with Run now, Pause and Edit search; the results are reviewed in Discover. */
function DiscoverySection({ onEdit, deleted }: { onEdit: (schedule: string) => void; deleted: string[] }) {
	const { data: schedules, isError } = useQuery({
		...orpc.career.schedules.queryOptions({ input: {} }),
		refetchInterval: (query) => (query.state.data?.some((row) => row.activeRun) ? 5_000 : false),
	});
	if (isError)
		return (
			<p role="alert" className="text-sm text-danger-text">
				<Trans>Couldn't load your search.</Trans>
			</p>
		);
	if (!schedules) return null;
	const schedule = schedules
		.filter((row) => row.kind === "discovery" && !deleted.includes(row.id))
		.sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.createdAt.getTime() - a.createdAt.getTime())[0];
	if (!schedule)
		return (
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line-2 px-3 py-3">
				<p className="text-sm text-ink-2">
					<Trans>No discovery schedule yet.</Trans>
				</p>
				<Button variant="secondary" size="sm" onClick={() => onEdit("new:discovery")}>
					<Icon name="globe-simple" size={18} />
					<Trans>Set up discovery</Trans>
				</Button>
			</div>
		);
	return (
		<div className="grid gap-3">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<p className="min-w-0 flex-1 text-sm font-medium break-words">{schedule.query}</p>
				<Button variant="ghost" size="sm" className="text-ink-2" onClick={() => onEdit(schedule.id)}>
					<Icon name="pencil-simple" size={18} />
					<Trans>Edit search</Trans>
				</Button>
			</div>
			<DiscoveryStatus schedule={schedule} onEnabledChange={() => undefined} />
			<p className="text-sm">
				<Link to="/dashboard/discover/activity" className="underline">
					<Trans>See every run in Search activity</Trans>
				</Link>
			</p>
		</div>
	);
}
