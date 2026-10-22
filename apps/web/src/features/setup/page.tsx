import type { ImportKind } from "@/features/resume/import/read-file";
import type { RouterOutput } from "@/libs/orpc/client";
import type { SetupInterval } from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_COVER_LETTER_PROMPT, DEFAULT_RESUME_PROMPT } from "@reactive-resume/schema/career";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { NativeSelect } from "@reactive-resume/ui/components/native-select";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { SwitchRow } from "@reactive-resume/ui/components/switch";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { useCareerTime } from "@/features/career/shared";
import { ImportProgress } from "@/features/documents/new-document-dialog";
import { baselineCheckLabels } from "@/features/profile/baseline-checks";
import { detectImportKind, ImportError, readResumeFile, summarizeImport } from "@/features/resume/import/read-file";
import { ProvidersSection } from "@/features/settings/ai/providers";
import { WebAccessSection } from "@/features/settings/ai/web-access";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc } from "@/libs/orpc/client";

type Setup = RouterOutput["career"]["setup"];
type Stage = "baseline" | "services" | "discovery" | "launch";

const STAGES: { key: Stage; label: () => string }[] = [
	{ key: "baseline", label: () => t`Baseline resume` },
	{ key: "services", label: () => t`Connect services` },
	{ key: "discovery", label: () => t`Set up discovery` },
	{ key: "launch", label: () => t`Start` },
];

/**
 * First-run setup: confirm a baseline resume, connect the search and AI services, set up discovery and start it.
 * Every step can be skipped; the page can be left and resumed from Overview at any time.
 */
export function SetupPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: setup, isError, refetch } = useQuery(orpc.career.setup.queryOptions({ input: {} }));
	const [stage, setStage] = useState<Stage | null>(null);
	const [edits, setEdits] = useState<Partial<Plan>>({});
	const skip = useMutation(
		orpc.career.skipSetup.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: orpc.career.setup.key() });
				void navigate({ to: "/dashboard/overview", replace: true });
			},
		}),
	);
	if (isError)
		return (
			<div className="mx-auto max-w-xl px-6 py-16 text-sm">
				<Trans>Couldn't load setup.</Trans>{" "}
				<button type="button" className="underline" onClick={() => void refetch()}>
					<Trans>Try again</Trans>
				</button>
			</div>
		);
	if (!setup) return <Skeleton className="mx-auto mt-16 h-64 max-w-xl rounded-xl" />;

	const initial: Stage = setup.step === "baseline" ? "baseline" : setup.step === "services" ? "services" : "discovery";
	const current = stage ?? initial;
	const reached = (key: Stage) =>
		STAGES.findIndex((item) => item.key === key) <= STAGES.findIndex((item) => item.key === initial);
	const go = (next: Stage) => setStage(next);
	const plan: Plan = { ...defaultPlan(setup.baseline?.suggestedQuery ?? ""), ...edits };
	const onPlan = (patch: Partial<Plan>) => setEdits((current) => ({ ...current, ...patch }));
	const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.career.setup.key() });

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 px-6 py-10 max-sm:px-4">
			<header className="grid gap-1">
				<h1 className="font-display text-[30px] leading-9 font-medium">
					<Trans>Let's set up your job search</Trans>
				</h1>
				<p className="text-sm text-ink-2">
					<Trans>
						Four short steps. Everything stays in your control: you review every document and apply yourself.
					</Trans>
				</p>
			</header>

			<ol className="flex flex-wrap gap-2" aria-label={t`Setup steps`}>
				{STAGES.map((item, index) => (
					<li key={item.key}>
						<button
							type="button"
							disabled={!reached(item.key)}
							aria-current={current === item.key ? "step" : undefined}
							onClick={() => go(item.key)}
							className={cn(
								"flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] disabled:opacity-50",
								current === item.key
									? "border-accent bg-accent-soft font-semibold text-accent-text"
									: "border-line text-ink-2",
							)}
						>
							<span className="tabular-nums">{index + 1}</span>
							{item.label()}
						</button>
					</li>
				))}
			</ol>

			{current === "baseline" && (
				<BaselineStep setup={setup} onConfirmed={() => void refresh().then(() => go("services"))} />
			)}
			{current === "services" && (
				<ServicesStep onBack={() => go("baseline")} onNext={() => void refresh().then(() => go("discovery"))} />
			)}
			{current === "discovery" && (
				<DiscoveryStep plan={plan} onPlan={onPlan} onBack={() => go("services")} onNext={() => go("launch")} />
			)}
			{current === "launch" && (
				<LaunchStep plan={plan} baselineName={setup.baseline?.name} onBack={() => go("discovery")} />
			)}

			<footer className="flex items-center gap-3 border-t border-line pt-4 text-sm">
				<span className="text-ink-3">
					<Trans>You can finish this later from Overview.</Trans>
				</span>
				<Button variant="ghost" size="sm" className="ms-auto" loading={skip.isPending} onClick={() => skip.mutate({})}>
					<Trans>Skip for now</Trans>
				</Button>
			</footer>
		</div>
	);
}

// ---- Wizard state shared by the steps ----

/** What the discovery and launch steps collect, kept in the browser until Start. */
type Plan = {
	query: string;
	interval: SetupInterval;
	resumesEnabled: boolean;
	lettersEnabled: boolean;
	resumePrompt: string;
	coverLetterPrompt: string;
	dailyLimit: number;
};
const defaultPlan = (query: string): Plan => ({
	query,
	interval: "hourly",
	resumesEnabled: false,
	lettersEnabled: false,
	resumePrompt: DEFAULT_RESUME_PROMPT,
	coverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
	dailyLimit: 10,
});

type PlanProps = { plan: Plan; onPlan: (patch: Partial<Plan>) => void };

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
	return (
		<section className="grid gap-4 rounded-xl border border-line bg-surface p-5">
			<div className="grid gap-1">
				<h2 className="text-lg font-semibold">{title}</h2>
				{description && <p className="text-sm text-ink-2">{description}</p>}
			</div>
			{children}
		</section>
	);
}

function Nav({ onBack, next }: { onBack?: () => void; next: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2">
			{onBack && (
				<Button variant="ghost" onClick={onBack}>
					<Trans>Back</Trans>
				</Button>
			)}
			<span className="ms-auto">{next}</span>
		</div>
	);
}

// ---- 1. Baseline ----

type BaselineStepProps = { setup: Setup; onConfirmed: () => void };

function BaselineStep({ setup, onConfirmed }: BaselineStepProps) {
	const queryClient = useQueryClient();
	const { hasUsableProvider } = useHasUsableAiProvider();
	const { data: resumes } = useQuery(orpc.resume.list.queryOptions());
	const [resumeId, setResumeId] = useState(setup.baseline?.resumeId ?? "");
	const [busy, setBusy] = useState<null | "blank">(null);
	// An upload in progress: which file, how far along, and when it started so a slow one can say so.
	const [upload, setUpload] = useState<{ name: string; stage: number; notes: string[]; startedAt: number } | null>(
		null,
	);
	const attempt = useRef(0);
	const [slow, setSlow] = useState(false);
	const uploadStartedAt = upload?.startedAt;
	useEffect(() => {
		if (uploadStartedAt === undefined) return;
		const timer = window.setTimeout(() => setSlow(true), 20_000);
		return () => window.clearTimeout(timer);
	}, [uploadStartedAt]);
	const [agreed, setAgreed] = useState(false);
	const report = useQuery({
		...orpc.career.validateBaseline.queryOptions({ input: { resumeId } }),
		enabled: Boolean(resumeId),
	});
	const confirm = useMutation(orpc.career.confirmBaseline.mutationOptions());
	const failed = (error: unknown, fallback: string) =>
		toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback }) });
	const added = async (id: string) => {
		await queryClient.invalidateQueries({ queryKey: orpc.resume.key() });
		await queryClient.invalidateQueries({ queryKey: orpc.documents.key() });
		setResumeId(id);
		setAgreed(false);
	};

	const importFile = async (file: File) => {
		const mine = ++attempt.current;
		const live = () => attempt.current === mine;
		const advance = (stage: number, note: string) =>
			setUpload((previous) =>
				previous && live()
					? { ...previous, stage, notes: Object.assign([...previous.notes], { [stage - 1]: note }) }
					: previous,
			);
		setSlow(false);
		setUpload({ name: file.name, stage: 0, notes: [], startedAt: Date.now() });
		try {
			const kind = await detectImportKind(file);
			if (!kind || kind === "cover-letter-json")
				throw new ImportError(t`Use a PDF, Word, Reactive Resume or JSON Resume file, or a LinkedIn export (.zip).`);
			const data = await readResumeFile(file, kind as Exclude<ImportKind, "cover-letter-json">, {
				aiAvailable: hasUsableProvider,
				onRead: (note) => advance(1, note),
			});
			if (!live()) return;
			advance(2, t`${summarizeImport(data).sections} sections`);
			const id = await client.resume.import({ data });
			if (!live()) return;
			advance(3, t`saved`);
			await added(id);
			toast.add({ description: t`Resume imported. Check it below, then confirm.` });
		} catch (error) {
			if (live())
				toast.add({
					type: "error",
					description:
						error instanceof ImportError
							? error.message
							: getOrpcErrorMessage(error, { fallback: t`Couldn't read that file. Try another file, or start blank.` }),
				});
		} finally {
			if (live()) setUpload(null);
		}
	};
	const cancelUpload = () => {
		attempt.current++;
		setUpload(null);
	};
	const startBlank = async () => {
		setBusy("blank");
		try {
			await added(
				await client.resume.create({ name: t`My baseline resume`, tags: [], autoName: false, withSampleData: false }),
			);
		} catch (error) {
			failed(error, t`Couldn't create the resume.`);
		} finally {
			setBusy(null);
		}
	};

	const labels = baselineCheckLabels();

	return (
		<Panel
			title={t`Choose your baseline resume`}
			description={t`This is the resume your tailored documents start from. It is only read, never changed.`}
		>
			<div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
				<div className="grid gap-1.5">
					<label htmlFor="baseline-pick" className="text-xs font-medium text-ink-2">
						<Trans>Use an existing resume</Trans>
					</label>
					<NativeSelect
						id="baseline-pick"
						value={resumeId}
						onChange={(event) => {
							setResumeId(event.target.value);
							setAgreed(false);
						}}
					>
						<option value="">{t`Choose a resume`}</option>
						{(resumes ?? []).map((resume) => (
							<option key={resume.id} value={resume.id}>
								{resume.name}
							</option>
						))}
					</NativeSelect>
				</div>
				<label className="inline-flex">
					<input
						type="file"
						className="sr-only"
						accept=".pdf,.docx,.json,.zip"
						disabled={busy !== null || upload !== null}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file) void importFile(file);
						}}
					/>
					<span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 text-sm font-medium hover:bg-sunken">
						<Icon name="file-arrow-up" size={16} />
						<Trans>Upload a file</Trans>
					</span>
				</label>
				<Button variant="secondary" loading={busy === "blank"} onClick={() => void startBlank()}>
					<Trans>Start blank</Trans>
				</Button>
			</div>

			{upload && (
				<div role="status" aria-live="polite" className="grid gap-3 rounded-lg border border-line bg-sunken p-4">
					<p className="text-sm font-semibold">{t`Importing ${upload.name}`}</p>
					<ImportProgress stage={upload.stage} notes={upload.notes} />
					<p className="text-[13px] text-ink-2">
						{slow ? (
							<Trans>
								Still working. Longer resumes, and AI-assisted reading of PDFs and Word files, can take a minute or two.
								Please keep this page open.
							</Trans>
						) : (
							<Trans>This usually takes under a minute. Please keep this page open.</Trans>
						)}
					</p>
					<Button variant="ghost" size="sm" className="w-fit" onClick={cancelUpload}>
						<Trans>Cancel</Trans>
					</Button>
				</div>
			)}

			{resumeId && report.data && !upload && (
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
						<Link to="/builder/$resumeId" params={{ resumeId }} className="underline">
							<Trans>Open the editor</Trans>
						</Link>{" "}
						<button type="button" className="underline" onClick={() => void report.refetch()}>
							<Trans>Check again</Trans>
						</button>
					</p>
					{report.data.checks.some((check) => !check.ok) && (
						<p className="rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] text-warn-text">
							<Trans>Gaps here mean weaker tailored documents. You can continue anyway and fix them later.</Trans>
						</p>
					)}
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
				</div>
			)}
			<Nav
				next={
					<Button
						disabled={!resumeId || !agreed || upload !== null}
						loading={confirm.isPending}
						onClick={() =>
							confirm.mutate(
								{ resumeId },
								{ onSuccess: onConfirmed, onError: (error) => failed(error, t`Couldn't confirm the baseline.`) },
							)
						}
					>
						<Trans>Confirm baseline</Trans>
					</Button>
				}
			/>
		</Panel>
	);
}

// ---- 2. Services ----

function ServicesStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
	const { data: web } = useQuery(orpc.webAccess.status.queryOptions());
	const { hasUsableProvider } = useHasUsableAiProvider();
	const search = web?.search === true;
	return (
		<div className="grid gap-4">
			<Panel
				title={t`Connect your services`}
				description={t`Job search needs a web search service. Tailored resumes and cover letters also need an AI provider; skip that for now to only discover jobs.`}
			>
				<p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
					<Ready ok={search} label={t`Web search`} />
					<Ready ok={hasUsableProvider} label={t`AI provider (optional)`} />
				</p>
			</Panel>
			<WebAccessSection />
			<ProvidersSection />
			<Nav
				onBack={onBack}
				next={
					<Button disabled={!search} onClick={onNext}>
						<Trans>Continue</Trans>
					</Button>
				}
			/>
			{!search && (
				<p className="text-xs text-ink-3">
					<Trans>Connect and test a web search service to continue.</Trans>
				</p>
			)}
		</div>
	);
}

function Ready({ ok, label }: { ok: boolean; label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<Icon name={ok ? "check-circle" : "warning"} size={18} className={ok ? "text-accent-text" : "text-ink-3"} />
			{label}
		</span>
	);
}

// ---- 3. Discovery ----

type DiscoveryStepProps = PlanProps & { onBack: () => void; onNext: () => void };

function DiscoveryStep({ plan, onPlan: set, onBack, onNext }: DiscoveryStepProps) {
	const { usableProviders, hasUsableProvider } = useHasUsableAiProvider();
	const preview = useMutation(orpc.career.previewSearch.mutationOptions());
	const wantsDocuments = plan.resumesEnabled || plan.lettersEnabled;
	const queryOk = plan.query.trim().length >= 3;
	const intervals: { value: SetupInterval; label: string }[] = [
		{ value: "hourly", label: t`Every hour` },
		{ value: "3h", label: t`Every 3 hours` },
		{ value: "6h", label: t`Every 6 hours` },
		{ value: "daily", label: t`Every day` },
	];
	return (
		<div className="grid gap-4">
			<Panel
				title={t`What should we look for?`}
				description={t`One search, run on a schedule. We started from your resume's headline; change it to roles, places or companies.`}
			>
				<div className="grid gap-1.5">
					<label htmlFor="setup-query" className="text-xs font-medium text-ink-2">
						<Trans>Look for</Trans>
					</label>
					<Input
						id="setup-query"
						value={plan.query}
						maxLength={500}
						onChange={(event) => set({ query: event.target.value })}
						aria-invalid={plan.query.length > 0 && !queryOk ? true : undefined}
					/>
				</div>
				<div className="grid gap-1.5 sm:max-w-xs">
					<label htmlFor="setup-interval" className="text-xs font-medium text-ink-2">
						<Trans>How often</Trans>
					</label>
					<NativeSelect
						id="setup-interval"
						value={plan.interval}
						onChange={(event) => set({ interval: event.target.value as SetupInterval })}
					>
						{intervals.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</NativeSelect>
				</div>
				<div className="grid gap-2">
					<Button
						variant="secondary"
						className="w-fit"
						disabled={!queryOk}
						loading={preview.isPending}
						onClick={() => preview.mutate({ query: plan.query.trim() })}
					>
						<Trans>Preview results</Trans>
					</Button>
					{preview.isError && (
						<p className="text-[13px] text-danger-text">
							{getOrpcErrorMessage(preview.error, { fallback: t`The search could not run.`, allowServerMessage: true })}
						</p>
					)}
					{preview.data &&
						(preview.data.length === 0 ? (
							<p className="text-[13px] text-ink-3">
								<Trans>No results. Try broader roles or places.</Trans>
							</p>
						) : (
							<>
								<ul className="grid gap-1.5">
									{preview.data.map((result) => (
										<li key={result.url} className="rounded-md bg-sunken px-2.5 py-2 text-[13px]">
											<a href={result.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
												{result.title}
											</a>
											<p className="line-clamp-2 text-ink-3">{result.description}</p>
										</li>
									))}
								</ul>
								<p className="text-xs text-ink-3">
									<Trans>
										A preview only: nothing is saved. Search services rank results, so this finds relevant postings but
										cannot promise to list every job.
									</Trans>
								</p>
							</>
						))}
				</div>
			</Panel>

			<Panel
				title={t`Prepare documents for new jobs?`}
				description={t`Optional. Each is a draft for you to review and edit; you apply yourself.`}
			>
				<SwitchRow
					checked={plan.resumesEnabled}
					onCheckedChange={(resumesEnabled) => set({ resumesEnabled })}
					label={<span className="font-semibold">{t`Tailored resumes`}</span>}
					description={t`A separate copy of your baseline, reworded for each job. Nothing is added that your resume does not say.`}
					className="rounded-lg border border-line px-3 py-3"
				/>
				{plan.resumesEnabled && (
					<PromptField
						id="setup-resume-prompt"
						label={t`Additional resume instruction`}
						value={plan.resumePrompt}
						defaultValue={DEFAULT_RESUME_PROMPT}
						onChange={(resumePrompt) => set({ resumePrompt })}
					/>
				)}
				<SwitchRow
					checked={plan.lettersEnabled}
					onCheckedChange={(lettersEnabled) => set({ lettersEnabled })}
					label={<span className="font-semibold">{t`Cover letters`}</span>}
					description={t`Written from your baseline and the job. Gaps are listed for you to fill, not invented.`}
					className="rounded-lg border border-line px-3 py-3"
				/>
				{plan.lettersEnabled && (
					<PromptField
						id="setup-letter-prompt"
						label={t`Additional cover letter instruction`}
						value={plan.coverLetterPrompt}
						defaultValue={DEFAULT_COVER_LETTER_PROMPT}
						onChange={(coverLetterPrompt) => set({ coverLetterPrompt })}
					/>
				)}
				{wantsDocuments && (
					<>
						<div className="grid gap-1.5 sm:max-w-xs">
							<label htmlFor="setup-limit" className="text-xs font-medium text-ink-2">
								<Trans>Documents per day</Trans>
							</label>
							<Input
								id="setup-limit"
								type="number"
								min={1}
								max={50}
								value={plan.dailyLimit}
								onChange={(event) => set({ dailyLimit: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })}
							/>
							<p className="text-xs text-ink-3">
								<Trans>
									Each generated resume or letter counts once; the count resets at midnight in your timezone. Work over
									the limit waits.
								</Trans>
							</p>
						</div>
						{!hasUsableProvider && (
							<p className="rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] text-warn-text">
								<Trans>Documents need an AI provider that has passed its test. Go back to connect one.</Trans>
							</p>
						)}
					</>
				)}
				{usableProviders.length === 0 && !wantsDocuments && (
					<p className="text-xs text-ink-3">
						<Trans>No AI provider connected, so only discovery will run. You can add one later.</Trans>
					</p>
				)}
			</Panel>
			<Nav
				onBack={onBack}
				next={
					<Button disabled={!queryOk || (wantsDocuments && !hasUsableProvider)} onClick={onNext}>
						<Trans>Review</Trans>
					</Button>
				}
			/>
		</div>
	);
}

// ---- 4. Launch ----

function LaunchStep({
	plan,
	baselineName,
	onBack,
}: {
	plan: Plan;
	baselineName: string | undefined;
	onBack: () => void;
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { timeZone, locale } = useCareerTime();
	const launch = useMutation(orpc.career.launchSetup.mutationOptions());
	const interval = { hourly: t`every hour`, "3h": t`every 3 hours`, "6h": t`every 6 hours`, daily: t`every day` }[
		plan.interval
	];
	const documents = [plan.resumesEnabled ? t`tailored resumes` : null, plan.lettersEnabled ? t`cover letters` : null]
		.filter(Boolean)
		.join(` ${t`and`} `);

	return (
		<Panel title={t`Ready to start`} description={t`Review what will run. You can change any of this later.`}>
			<dl className="grid gap-3 text-sm">
				<Row label={t`Baseline resume`} value={baselineName ?? "—"} />
				<Row label={t`Search`} value={`${plan.query} · ${interval}`} />
				<Row
					label={t`Documents`}
					value={
						documents
							? t`${documents} for each new job, up to ${plan.dailyLimit} a day`
							: t`None. Jobs are found and saved only.`
					}
				/>
			</dl>
			<p className="rounded-lg bg-info-soft px-3 py-2.5 text-[13px] text-ink">
				<Trans>
					The first search starts right away. Nothing is sent to employers and no application is marked as submitted.
				</Trans>
			</p>
			<Nav
				onBack={onBack}
				next={
					<Button
						loading={launch.isPending}
						onClick={() =>
							launch.mutate(
								{
									query: plan.query.trim(),
									interval: plan.interval,
									retrievalBudget: 15,
									resumesEnabled: plan.resumesEnabled,
									lettersEnabled: plan.lettersEnabled,
									resumePrompt: plan.resumePrompt,
									coverLetterPrompt: plan.coverLetterPrompt,
									aiProviderId: null,
									dailyLimit: plan.dailyLimit,
									timezone: timeZone,
									locale,
								},
								{
									onSuccess: async () => {
										await queryClient.invalidateQueries({ queryKey: orpc.career.key() });
										toast.add({ description: t`Discovery is running` });
										void navigate({ to: "/dashboard/overview", replace: true });
									},
									onError: (error) =>
										toast.add({
											type: "error",
											description: getOrpcErrorMessage(error, {
												fallback: t`Couldn't start discovery.`,
												allowServerMessage: true,
											}),
										}),
								},
							)
						}
					>
						<Trans>Start discovery</Trans>
					</Button>
				}
			/>
		</Panel>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid gap-0.5 sm:grid-cols-[140px_1fr]">
			<dt className="text-ink-3">{label}</dt>
			<dd className="font-medium">{value}</dd>
		</div>
	);
}

type PromptFieldProps = {
	id: string;
	label: string;
	value: string;
	defaultValue: string;
	onChange: (value: string) => void;
};

/** Extra guidance for a document type, starting from a sensible default that can be edited or restored. */
function PromptField({ id, label, value, defaultValue, onChange }: PromptFieldProps) {
	return (
		<div className="grid gap-1.5">
			<label htmlFor={id} className="text-xs font-medium text-ink-2">
				{label}
			</label>
			<Textarea id={id} rows={3} maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)} />
			<p className="flex items-center gap-2 text-xs text-ink-3">
				<span>
					<Trans>This guides the writing in addition to the fixed accuracy and privacy rules.</Trans>
				</span>
				{value !== defaultValue && (
					<button type="button" className="underline" onClick={() => onChange(defaultValue)}>
						<Trans>Restore default</Trans>
					</button>
				)}
			</p>
		</div>
	);
}
