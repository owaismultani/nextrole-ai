import type { Schedule } from "./hooks";
import type { RouterInput } from "@/api/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Platform, View } from "react-native";
import {
	careerScheduleInputSchema,
	defaultDiscoveryFilters,
	discoverySourcesSchema,
	RETRIEVAL_BUDGET,
	RETRIEVAL_BUDGET_CHOICES,
} from "@reactive-resume/schema/career";
import { cadenceOf, EVERY_VALUES, everyOf } from "@reactive-resume/schema/career-run";
import { fromZonedDateTime } from "@reactive-resume/utils/timezone";
import { everyLabel } from "./discovery-run";
import { FiltersEditor, SearchPreview, SourcesEditor } from "./discovery-sources";
import { client, useCareerAction, useCareerQueries, useCareerTime, useNow } from "./hooks";
import { collectInterviews, nextCareerRun, prepareRunAt, rollForwardRepeat, toZoned } from "./scheduling";
import { EditorSheet, LoadState, SwitchRow } from "./shared";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { AIProviderSetupSheet, useHasAIProvider } from "@/features/ai/providers";
import { useApplications } from "@/features/applications/queries";
import { Banner, Button, SelectSheet, Sheet, Text, TextField, useTheme } from "@/ui";

type Input = RouterInput["career"]["saveSchedule"];
export const scheduleTitle = (kind: string) =>
	kind === "prepare"
		? t`Interview preparation`
		: kind === "follow-up"
			? t`Follow-up reminder`
			: t`Opportunity discovery`;
type ScheduleSheetProps = {
	schedule: Schedule | null;
	kind: Input["kind"];
	onClose: () => void;
	onDelete: (id: string) => void;
};
export function ScheduleSheet(props: ScheduleSheetProps) {
	const { t } = useLingui();
	const account = useCareerTime();
	const career = useCareerQueries();
	const applications = useApplications();
	const ai = useHasAIProvider();
	const session = useSession();
	const web = useQuery({
		...orpc.webAccess.status.queryOptions(),
		enabled: session.status === "signed-in",
		queryKey: [...orpc.webAccess.status.key(), session.server],
	});
	const flags = useQuery({ ...orpc.flags.get.queryOptions(), queryKey: [...orpc.flags.get.key(), session.server] });
	const queries = [account.profile, career.profile, applications, web, flags];
	const unavailable = queries.find((query) => query.isError || query.isPending);
	return unavailable ? (
		<Sheet open onClose={props.onClose} title={t`New schedule`} detents={[0.9]}>
			<LoadState query={unavailable} />
		</Sheet>
	) : account.profile.data && career.profile.data && applications.data && web.data && flags.data ? (
		<ScheduleForm
			{...props}
			key={session.server}
			timezone={account.timeZone}
			locale={account.locale}
			profile={career.profile.data}
			applications={applications.data}
			search={web.data.search}
			available={flags.data.careerSchedulingEnabled ?? false}
			smtp={flags.data.smtpEnabled}
			verified={account.profile.data.emailVerified}
			ai={ai}
		/>
	) : null;
}

type FormProps = ScheduleSheetProps & {
	timezone: string;
	locale: string;
	profile: NonNullable<ReturnType<typeof useCareerQueries>["profile"]["data"]>;
	applications: NonNullable<ReturnType<typeof useApplications>["data"]>;
	search: boolean;
	available: boolean;
	smtp: boolean;
	verified: boolean;
	ai: ReturnType<typeof useHasAIProvider>;
};
function ScheduleForm({
	schedule,
	kind: initialKind,
	onClose,
	onDelete,
	timezone,
	locale,
	profile,
	applications,
	search,
	available,
	smtp,
	verified,
	ai,
}: FormProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const now = useNow();
	const upcoming = collectInterviews(applications, now);
	const open = applications.filter((application) => application.status !== "closed");
	const [initial] = useState(() => {
		const at = schedule
			? rollForwardRepeat(new Date(schedule.nextRunAt), schedule, timezone)
			: nextCareerRun(new Date(), 1, timezone);
		return {
			kind: (schedule?.kind as Input["kind"]) ?? initialKind,
			query: schedule?.query || [...profile.targetRoles, ...profile.locations].join(" · "),
			every: schedule ? everyOf(schedule) : "m60",
			budget: String(schedule?.retrievalBudget ?? RETRIEVAL_BUDGET.default),
			// A search saved before sources existed searched the web alone; a new one starts with the free sources too.
			sources:
				schedule?.sources ??
				(schedule ? { web: true, apis: [], companies: [], followFromSearch: false } : discoverySourcesSchema.parse({})),
			filters: schedule?.filters ?? defaultDiscoveryFilters(profile),
			...toZoned(at, timezone),
			time: schedule ? toZoned(at, timezone).time : "08:00",
			interviewId: schedule?.interviewId ?? upcoming[0]?.interview.id ?? "",
			applicationId: schedule?.applicationId ?? open[0]?.id ?? "",
			lead: (schedule?.lead as NonNullable<Input["lead"]>) ?? "24h",
			aiProviderId: schedule?.aiProviderId ?? ai.defaultProvider?.id ?? "",
			enabled: schedule?.enabled ?? true,
			email: schedule?.email ?? false,
		};
	});
	const [draft, setDraft] = useState(initial);
	const [picker, setPicker] = useState<"date" | "time" | null>(null);
	const [setup, setSetup] = useState(false);
	const [validation, setValidation] = useState<string>();
	const action = useCareerAction();
	const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));
	const interview = upcoming.find((row) => row.interview.id === draft.interviewId);
	const at = fromZonedDateTime(draft.date, draft.time, timezone);
	// A schedule on a fixed gap starts as soon as it is saved, so it has no first-run time to choose.
	const immediate = draft.kind === "discovery" && Boolean(cadenceOf(draft.every).intervalMinutes);
	const runAt = immediate
		? new Date(schedule?.nextRunAt ?? now)
		: draft.kind === "prepare" && interview
			? prepareRunAt(interview.start, draft.lead, timezone)
			: at;
	const provider = ai.usableProviders.find((row) => row.id === draft.aiProviderId) ?? ai.defaultProvider;
	const blocked =
		(draft.enabled && !available) ||
		(draft.kind === "prepare"
			? !interview || !ai.hasAIProvider
			: draft.kind === "follow-up"
				? !open.some((row) => row.id === draft.applicationId)
				: // Job sources and followed companies need no connection; only a web-search-only search does.
					!search && !draft.sources.apis.length && !draft.sources.companies.length);
	const save = () => {
		if (draft.kind === "discovery" && draft.query.trim().length < 3)
			return setValidation(t`Add a role or company to look for.`);
		if (blocked) return;
		if (!runAt) return setValidation(t`This date or time does not exist in your timezone. Choose another time.`);
		if (draft.kind !== "prepare" && !immediate && runAt <= now) return setValidation(t`Pick a time after now.`);
		const input: Input = {
			...(schedule ? { id: schedule.id } : {}),
			kind: draft.kind,
			query: draft.kind === "discovery" ? draft.query.trim() : "",
			applicationId:
				draft.kind === "prepare"
					? (interview?.application.id ?? null)
					: draft.kind === "follow-up"
						? draft.applicationId
						: null,
			interviewId: draft.kind === "prepare" ? draft.interviewId : null,
			lead: draft.kind === "prepare" ? draft.lead : null,
			enabled: draft.enabled,
			email: smtp && verified && draft.email,
			timezone,
			locale,
			nextRunAt: runAt,
			...(draft.kind === "discovery" ? cadenceOf(draft.every) : { intervalDays: null, intervalMinutes: null }),
			retrievalBudget: draft.kind === "discovery" ? Number(draft.budget) : null,
			sources: draft.kind === "discovery" ? draft.sources : null,
			filters: draft.kind === "discovery" ? draft.filters : null,
			aiProviderId: draft.kind === "prepare" ? (provider?.id ?? null) : null,
		};
		if (!careerScheduleInputSchema.safeParse(input).success) return setValidation(t`Check the fields and try again.`);
		setValidation(undefined);
		void action.run(() => client.career.saveSchedule(input), onClose);
	};
	return (
		<EditorSheet
			title={schedule ? t`Edit schedule` : t`New schedule`}
			dirty={JSON.stringify(draft) !== JSON.stringify(initial)}
			pending={action.pending}
			onClose={onClose}
		>
			<View style={{ padding: space.s4, gap: space.s4 }}>
				<SelectSheet
					label={t`What should run`}
					value={draft.kind}
					onChange={(kind) => set({ kind })}
					disabled={!!schedule || action.pending}
					options={[
						{ value: "discovery", label: t`Find roles` },
						{ value: "prepare", label: t`Prepare` },
						{ value: "follow-up", label: t`Remind me` },
					]}
				/>
				{!available ? (
					<Banner
						tone="warn"
						message={t`Scheduled work is not available on this server. Ask the server owner to configure it.`}
					/>
				) : null}
				<Text color="ink3">{t`Times are shown in ${timezone}. Change timezone in Settings → Preferences.`}</Text>
				{draft.kind === "discovery" ? (
					<>
						<TextField
							label={t`Look for`}
							value={draft.query}
							maxLength={500}
							onChangeText={(query) => set({ query })}
						/>
						<SelectSheet
							label={t`How often`}
							value={draft.every}
							onChange={(every) => set({ every })}
							options={(EVERY_VALUES.includes(draft.every) ? EVERY_VALUES : [...EVERY_VALUES, draft.every]).map(
								(value) => ({
									value,
									label: everyLabel(value),
								}),
							)}
						/>
						<SelectSheet
							label={t`Results per source`}
							value={draft.budget}
							onChange={(budget) => set({ budget })}
							options={[...new Set([...RETRIEVAL_BUDGET_CHOICES.map(String), draft.budget])].map((value) => ({
								value,
								label: value,
							}))}
						/>
						<Text color="ink3">{t`Roughly the most each job-search source and web search return per run. Followed company boards are always read in full.`}</Text>
						<Text color="ink3">{t`Hourly runs keep a fixed gap. Daily and longer keep the same time of day in ${timezone}.`}</Text>
						<SourcesEditor
							sources={draft.sources}
							country={draft.filters.country}
							onChange={(sources) => set({ sources })}
						/>
						<FiltersEditor filters={draft.filters} locale={locale} onChange={(filters) => set({ filters })} />
						<SearchPreview query={draft.query} sources={draft.sources} filters={draft.filters} />
						<Text color="ink3">{t`New roles wait in Today. Applications and documents are never created for you.`}</Text>
						{!search && !draft.sources.apis.length && !draft.sources.companies.length ? (
							<Banner
								tone="warn"
								message={t`Choose a job source, follow a company, or set up web search in Settings.`}
							/>
						) : null}
					</>
				) : draft.kind === "prepare" ? (
					<>
						<SelectSheet
							label={t`Interview`}
							value={draft.interviewId}
							onChange={(interviewId) => set({ interviewId })}
							options={upcoming.map((row) => ({
								value: row.interview.id,
								label: `${row.application.company} · ${new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(row.start)}`,
							}))}
						/>
						{!interview ? <Banner tone="warn" message={t`Add an upcoming interview in Applications first.`} /> : null}
						<SelectSheet
							label={t`Prepare a briefing`}
							value={draft.lead}
							onChange={(lead) => set({ lead })}
							options={[
								{ value: "24h", label: t`24 hours before` },
								{ value: "2h", label: t`2 hours before` },
								{ value: "morning", label: t`Morning of · 08:00 local` },
							]}
						/>
						{runAt ? (
							<Text>
								{runAt <= now
									? t`The lead time has passed. Saving runs the briefing now.`
									: t`Runs at ${new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(runAt)}.`}
							</Text>
						) : null}
						<Text color="ink3">{t`Morning of runs at 08:00, or two hours before interviews starting before 10:00.`}</Text>
						{ai.isLoading ? (
							<Text>{t`Loading AI connections…`}</Text>
						) : ai.error ? (
							<Button
								variant="secondary"
								label={t`Retry AI connections`}
								onPress={() => {
									void ai.retry();
								}}
							/>
						) : null}
						<SelectSheet
							label={t`AI connection`}
							value={provider?.id ?? null}
							onChange={(aiProviderId) => set({ aiProviderId })}
							options={ai.usableProviders.map((row) => ({ value: row.id, label: row.label }))}
						/>
						<Button variant="secondary" label={t`Connect AI provider`} onPress={() => setSetup(true)} />
						<Text color="ink3">{t`Sends this application and enabled Knowledge to this connection. Your provider may charge. If it becomes unavailable, scheduled work can use your default usable connection.`}</Text>
					</>
				) : (
					<>
						<SelectSheet
							label={t`Application`}
							value={draft.applicationId}
							onChange={(applicationId) => set({ applicationId })}
							options={open.map((row) => ({ value: row.id, label: `${row.company} · ${row.role}` }))}
						/>
						{!open.length ? <Banner tone="warn" message={t`Add an application first.`} /> : null}
					</>
				)}
				{immediate ? <Text color="ink3">{t`Starts as soon as you save, then repeats on this gap.`}</Text> : null}
				{draft.kind !== "prepare" && !immediate ? (
					<>
						<TextField
							label={draft.kind === "follow-up" ? t`Remind me on (YYYY-MM-DD)` : t`First run (YYYY-MM-DD)`}
							value={draft.date}
							onChangeText={(date) => set({ date })}
							maxLength={10}
						/>
						<TextField
							label={t`Time (HH:mm)`}
							value={draft.time}
							onChangeText={(time) => set({ time })}
							maxLength={5}
						/>
						<Button variant="secondary" label={t`Choose date`} onPress={() => setPicker("date")} />
						<Button variant="secondary" label={t`Choose time`} onPress={() => setPicker("time")} />
						{picker ? (
							<DateTimePicker
								value={at ?? now}
								mode={picker}
								timeZoneName={timezone}
								onDismiss={() => setPicker(null)}
								onValueChange={(_event, date) => {
									const value = toZoned(date, timezone);
									set(picker === "date" ? { date: value.date } : { time: value.time });
									if (Platform.OS === "android") setPicker(null);
								}}
							/>
						) : null}
					</>
				) : null}
				<SwitchRow
					label={t`Turn this schedule on`}
					value={draft.enabled}
					onValueChange={(enabled) => set({ enabled })}
				/>
				<SwitchRow
					label={t`Also email a copy`}
					value={smtp && verified && draft.email}
					disabled={!smtp || !verified}
					onValueChange={(email) => set({ email })}
				/>
				<Text color="ink3">{t`Always appears in Today. Email requires a verified address and server mail setup. No push notifications are sent.`}</Text>
				{validation || action.error ? <Banner tone="danger" message={validation ?? action.error ?? ""} /> : null}
				<Button label={t`Save schedule`} loading={action.pending} disabled={blocked} onPress={save} />
				{schedule ? (
					<Button
						variant="danger"
						label={t`Delete schedule`}
						disabled={action.pending}
						onPress={() => {
							onDelete(schedule.id);
							onClose();
						}}
					/>
				) : null}
				<AIProviderSetupSheet open={setup} onClose={() => setSetup(false)} />
			</View>
		</EditorSheet>
	);
}
