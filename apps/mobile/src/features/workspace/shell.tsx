// The frame around every workspace tab, ported from apps/web/src/features/career/workspace/shell.tsx: header, tab
// strip with badges, the read-only banner for a saved version, loading and failure states, the Coach sheet and the
// interview editor. The context column (next step, what you sent, notes) is the Details screen on mobile.
import type { SavedItem } from "./hooks";
import type { Application } from "@/features/applications/types";
import type { ApplicationTarget } from "@/routes";
import type { InterviewTimelineEntry } from "@reactive-resume/schema/applications/data";
import type { InterviewSection, WorkspaceTab } from "@reactive-resume/schema/career";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { resolveWorkspaceTab, WORKSPACE_TABS } from "@reactive-resume/schema/career";
import { actionLabel, preparationLabel, useWorkspaceState } from "./action";
import { CoachSheet } from "./coach-sheet";
import { useApplicationJourney, useSavedItems, useWorkspace } from "./hooks";
import { currentInterview, minutesUntil } from "./logic";
import { OfferSheet } from "./offer-sheet";
import { useNow, useUserTime } from "@/features/application-detail/hooks";
import { InterviewSheet } from "@/features/application-detail/interview-sheet";
import { applicationError } from "@/features/applications/error";
import { useApplication } from "@/features/applications/queries";
import { getStageColor, getStageLabel } from "@/features/applications/stages";
import { routes } from "@/routes";
import { useWorkspaceChrome } from "@/shell/workspace-chrome";
import { Banner, Button, EmptyState, Screen, Text, useTheme } from "@/ui";

export type WorkspaceSearch = {
	version?: string | undefined;
	speak?: boolean | undefined;
	story?: string | undefined;
	/** Interviews: which part of the round is open. */
	section?: InterviewSection | undefined;
	/** Interviews: the round being worked on. */
	round?: string | undefined;
};

/** What every tab receives: the application, and a saved version to show read-only ("Open in Prepare"). */
export type WorkspaceTabProps = {
	application: Application;
	/** A saved item opened from Saved: the tab shows it read-only with "Back to current". */
	version: SavedItem | undefined;
	/** The next interview still to come, or the most recent one if it just ended. */
	interview: InterviewTimelineEntry | undefined;
	/** Practise: open with Speak selected. */
	speak: boolean;
	/** Practise: a story from Knowledge to practise. */
	story: string | undefined;
	now: Date;
	/** Interviews: the part of the round that is open, and the round the tools work on. */
	section: InterviewSection | undefined;
	round: InterviewTimelineEntry | undefined;
	go: (tab: ApplicationTarget, search?: WorkspaceSearch) => void;
	/** Opens the interview editor for a new round. */
	addInterview: () => void;
	/** Opens the interview editor on a round, or on a new one for null. */
	editInterview: (id: string | null) => void;
	/** Opens the offer editor for a new offer, or on an offer whose terms are corrected. */
	addOffer: () => void;
	editOffer: (id: string) => void;
};

/** The kind of saved item each tab (and interview section) shows read-only when one is opened from Saved work. */
function archiveKind(tab: WorkspaceTab, section: InterviewSection | undefined): SavedItem["data"]["kind"] | null {
	switch (tab) {
		case "summary":
			return "fit";
		case "answers":
			return "answers";
		case "messages":
			return "reply";
		case "interviews":
			return section === "practise" ? "practice" : section === "debrief" ? "debrief" : "briefing";
		default:
			return null;
	}
}

/** `/applications/<id>/<tab>?section=…&round=…&version=…&speak=1&story=…`; a former tab name opens its part of Interviews. */
export function workspaceHref(id: string, target: ApplicationTarget, search: WorkspaceSearch = {}) {
	const base = routes.application(id, target, { section: search.section, round: search.round });
	const query = [
		search.version ? `version=${encodeURIComponent(search.version)}` : "",
		search.speak ? "speak=1" : "",
		search.story ? `story=${encodeURIComponent(search.story)}` : "",
	].filter(Boolean);
	return `${base}${query.length > 0 ? `${base.includes("?") ? "&" : "?"}${query.join("&")}` : ""}` as const;
}

type WorkspaceScreenProps = { tab: WorkspaceTab; children: (props: WorkspaceTabProps) => ReactNode };

export function WorkspaceScreen({ tab, children }: WorkspaceScreenProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const params = useLocalSearchParams<{
		id: string;
		version?: string;
		speak?: string;
		story?: string;
		section?: string;
		round?: string;
	}>();
	const id = params.id;
	const now = useNow();
	const query = useApplication(id);
	const saved = useSavedItems(id);
	const workspace = useWorkspace(id);
	const [coach, setCoach] = useState(false);
	// The round being edited is fixed when the editor opens; null is a new round.
	const [editingRound, setEditingRound] = useState<{ id: string | null } | null>(null);
	// The offer editor: `new`, or the offer being corrected.
	const [offerEditor, setOfferEditor] = useState<{ id: string | null } | null>(null);
	const application = query.data;

	if (query.isPending)
		return (
			<Screen>
				<ActivityIndicator />
			</Screen>
		);
	if (!application)
		return (
			<Screen>
				<EmptyState
					icon="warning-circle"
					title={t`This application couldn't be opened.`}
					message={query.error ? applicationError(query.error) : undefined}
					action={{ label: t`Try again`, onPress: () => void query.refetch() }}
				/>
				<Button
					variant="secondary"
					label={t`Back to applications`}
					onPress={() => router.replace(routes.applications())}
				/>
			</Screen>
		);

	const rounds = application.activity.filter((entry): entry is InterviewTimelineEntry => entry.type === "interview");
	const chosen = rounds.find((entry) => entry.id === params.round);
	// The round the Interviews tab works on: the one chosen, else the next or latest.
	const interview = chosen ?? currentInterview(application.activity, now);
	const parsedSection = resolveWorkspaceTab(params.section ?? "");
	const section: InterviewSection | undefined =
		tab === "interviews" && params.section && ["overview", "prepare", "practise", "debrief"].includes(params.section)
			? (params.section as InterviewSection)
			: parsedSection?.section;
	const version = params.version ? saved.data?.find((item) => item.id === params.version) : undefined;
	const archived = params.version !== undefined;
	const archiveUnavailable = archived && (!version || version.data.kind !== archiveKind(tab, section));
	const needsWorkspace = tab === "answers" || tab === "interviews" || tab === "messages" || tab === "summary";
	const waiting = saved.isPending || (!archived && needsWorkspace && workspace.isPending);
	const failed =
		(saved.isError && saved.data === undefined) ||
		(!archived && needsWorkspace && workspace.query.isError && workspace.query.data === undefined);
	const blocked = waiting || failed || archiveUnavailable;
	const go = (next: ApplicationTarget, search: WorkspaceSearch = {}) =>
		router.push(workspaceHref(id, next, { round: params.round, ...search }));
	const backToCurrent = () => router.replace(workspaceHref(id, tab, { section, round: params.round }));
	const props: WorkspaceTabProps = {
		application,
		version,
		interview,
		now,
		go,
		speak: params.speak === "1",
		story: params.story,
		section,
		round: tab === "interviews" ? interview : undefined,
		addInterview: () => setEditingRound({ id: null }),
		editInterview: (roundId) => setEditingRound({ id: roundId }),
		addOffer: () => setOfferEditor({ id: null }),
		editOffer: (offerId) => setOfferEditor({ id: offerId }),
	};
	const editingInterview = editingRound?.id ? (rounds.find((entry) => entry.id === editingRound.id) ?? null) : null;
	const editingOffer = offerEditor?.id
		? (saved.data?.find((item) => item.id === offerEditor.id && item.data.kind === "offer") ?? null)
		: null;

	return (
		<View style={{ flex: 1 }}>
			<Stack.Screen options={{ title: application.company }} />
			<KeyboardAwareScrollView
				bottomOffset={space.s6}
				keyboardShouldPersistTaps="handled"
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={{ padding: space.s4, gap: space.s4, paddingBottom: space.s12 }}
			>
				<Header
					application={application}
					now={now}
					go={go}
					onAddOffer={props.addOffer}
					onAskCoach={() => setCoach(true)}
				/>
				<TabBadges saved={saved.data} interview={interview} now={now} />
				{blocked ? (
					<View style={{ gap: space.s3 }}>
						{waiting ? (
							<View accessibilityRole="progressbar" style={{ flexDirection: "row", gap: space.s2 }}>
								<ActivityIndicator />
								<Text color="ink2">{archived ? t`Loading saved version…` : t`Loading workspace…`}</Text>
							</View>
						) : (
							<Banner
								tone="danger"
								message={
									failed
										? archived
											? t`This saved version couldn't be loaded.`
											: t`This workspace couldn't be loaded.`
										: version
											? t`This saved version belongs to a different tab. Open it from Saved.`
											: t`This saved version is no longer available.`
								}
							/>
						)}
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
							{failed ? (
								<Button
									variant="secondary"
									label={t`Try again`}
									onPress={() => {
										void saved.refetch();
										if (!archived) void workspace.query.refetch();
									}}
								/>
							) : null}
							{archived ? <Button variant="secondary" label={t`Back to current`} onPress={backToCurrent} /> : null}
						</View>
					</View>
				) : (
					<>
						{version ? (
							<Banner
								tone="info"
								icon="clock-counter-clockwise"
								message={t`You're looking at a saved version. It can't be edited.`}
								action={{ label: t`Back to current`, onPress: backToCurrent }}
							/>
						) : null}
						{children(props)}
					</>
				)}
			</KeyboardAwareScrollView>
			<CoachSheet
				application={application}
				tab={tab}
				hint={tab === "interviews" && section && section !== "overview" ? section : tab}
				open={coach}
				onClose={() => setCoach(false)}
			/>
			{editingRound ? (
				<InterviewSheet
					application={application}
					interview={editingInterview}
					open
					onClose={() => setEditingRound(null)}
				/>
			) : null}
			{offerEditor ? (
				<OfferSheet application={application} offer={editingOffer} onClose={() => setOfferEditor(null)} />
			) : null}
		</View>
	);
}

type HeaderProps = {
	application: Application;
	now: Date;
	go: WorkspaceTabProps["go"];
	onAddOffer: () => void;
	onAskCoach: () => void;
};

/**
 * The persistent header: who and where, the stage, the state of the documents (apart from the stage), where the job came
 * from, and the one thing to do next.
 */
function Header({ application, now, go, onAddOffer, onAskCoach }: HeaderProps) {
	const { t } = useLingui();
	const { colors, space } = useTheme();
	const router = useRouter();
	const { day } = useUserTime();
	const state = useWorkspaceState(application, now);
	const journey = useApplicationJourney(application.id);
	useWorkspaceChrome({ title: application.company, subtitle: application.role });
	const role = application.role;
	const company = application.company;
	const label = actionLabel(state.action);
	const documents = preparationLabel(state.preparation);
	const meta = [
		application.location,
		application.status !== "saved" && application.appliedAt ? t`Applied ${day(application.appliedAt)}` : "",
		documents,
		journey.data ? t`Found by discovery` : application.source ? t`Source: ${application.source}` : "",
	].filter(Boolean);

	return (
		<View style={{ gap: space.s3 }}>
			<View style={{ gap: space.s1 }}>
				<Text variant="heading" accessibilityRole="header">
					{t`${role} · ${company}`}
				</Text>
				<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s2 }}>
					<View
						style={{
							width: 8,
							height: 8,
							borderRadius: 4,
							backgroundColor: getStageColor(application.status, colors),
						}}
					/>
					<Text variant="callout">{getStageLabel(application.status)}</Text>
					{meta.map((item) => (
						<Text key={item} variant="callout" color="ink2">
							· {item}
						</Text>
					))}
				</View>
			</View>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
				{label ? (
					<Button
						label={label}
						onPress={() =>
							state.action.kind === "add-offer"
								? onAddOffer()
								: go(state.action.tab, state.action.section ? { section: state.action.section } : {})
						}
					/>
				) : null}
				<Button
					{...(label ? { variant: "secondary" as const } : {})}
					icon="sparkle"
					label={t`Ask the coach`}
					onPress={onAskCoach}
				/>
				{application.status === "offer" ? (
					<Button
						variant="secondary"
						icon="scales"
						label={t`Compare offers`}
						onPress={() => router.push(routes.offers())}
					/>
				) : null}
			</View>
		</View>
	);
}

type TabBadgesProps = {
	saved: SavedItem[] | undefined;
	interview: InterviewTimelineEntry | undefined;
	now: Date;
};

/** WorkspaceChrome owns the one visible tab strip; keep its countdown, unread and saved-count badges. */
function TabBadges({ saved, interview, now }: TabBadgesProps) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const minutes = interview ? minutesUntil(new Date(interview.at), now) : null;
	// Messages shows the newest read message: it waits for a decision while its changes aren't applied.
	const newestReply = saved?.find((item) => item.data.kind === "reply");
	const unread =
		newestReply?.data.kind === "reply" && newestReply.data.changes.length > 0 && !newestReply.data.applied ? 1 : 0;
	const badge = (tab: WorkspaceTab) => {
		if (tab === "interviews" && minutes !== null && minutes > 0 && minutes < 7 * 24 * 60) {
			const hours = Math.round(minutes / 60);
			return { tone: minutes <= 60 ? "warn" : "accent", text: minutes <= 60 ? t`${minutes} min` : t`${hours} h` };
		}
		if (tab === "messages" && unread > 0) return { tone: "info", text: String(unread) };
		if (tab === "saved" && (saved?.length ?? 0) > 0) return { tone: "plain", text: String(saved?.length) };
		return null;
	};
	const badgeColors = {
		warn: { background: colors.warnSoft, text: "warnText" },
		accent: { background: colors.accentSoft, text: "accentText" },
		info: { background: colors.infoSoft, text: "infoText" },
		plain: { background: "transparent", text: "ink2" },
	} as const;

	useWorkspaceChrome({
		badges: Object.fromEntries(
			WORKSPACE_TABS.map((tab) => {
				const extra = badge(tab);
				const palette = extra ? badgeColors[extra.tone as keyof typeof badgeColors] : null;
				return [
					tab,
					extra && palette ? (
						<View
							key={tab}
							style={{ paddingHorizontal: space.s1, borderRadius: radius.rPill, backgroundColor: palette.background }}
						>
							<Text variant="micro" color={palette.text}>
								{extra.text}
							</Text>
						</View>
					) : null,
				];
			}),
		),
	});
	return null;
}
