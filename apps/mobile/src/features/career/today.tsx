import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { client, useCareerAction, useCareerTime, useNow, useTodayQueries, useUndoRows } from "./hooks";
import { collectInterviews } from "./scheduling";
import { Actions, LoadState, Section } from "./shared";
import { getNextStep } from "@/features/applications/next-step";
import { useApplications } from "@/features/applications/queries";
import { getStageLabel } from "@/features/applications/stages";
import { routes } from "@/routes";
import {
	Banner,
	Button,
	Card,
	Chip,
	EmptyState,
	Screen,
	Text,
	listItemMotion,
	listLayout,
	useFirstAppearance,
	useTheme,
} from "@/ui";
import { usePullRefresh } from "@/ui/use-pull-refresh";

/** Reminders: what needs you, and your next interview, until Overview shows them in place. */
export function TodayScreen() {
	const { t } = useLingui();
	const { colors, space, size } = useTheme();
	const [width, setWidth] = useState(0);
	const tablet = width >= size.panel * 2 + space.s6;
	const router = useRouter();
	const now = useNow();
	const time = useCareerTime();
	const queries = useTodayQueries();
	const applications = useApplications();
	const action = useCareerAction();
	const pull = usePullRefresh(action.refresh, applications.refetch, time.profile.refetch);
	const undo = useUndoRows();
	const [showRead, setShowRead] = useState(false);
	const interviews = collectInterviews(applications.data ?? [], now);
	const next = interviews[0];
	const notes = (queries.notifications.data ?? []).filter(
		(row) => showRead || (!row.readAt && !undo.hidden.includes(row.id)),
	);
	const firstAppearance = useFirstAppearance(!queries.notifications.isPending);
	return (
		<Screen scroll={false} contentStyle={{ padding: 0 }}>
			<ScrollView
				alwaysBounceVertical
				refreshControl={<RefreshControl {...pull} tintColor={colors.accent} colors={[colors.accent]} />}
				contentContainerStyle={{ padding: space.s4, gap: space.s6 }}
			>
				<LoadState query={time.profile} />
				<Text variant="callout" color="ink3">
					{time.when(now)} · {time.timeZone}
				</Text>
				{action.error ? <Banner tone="danger" message={action.error} /> : null}
				<View
					onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
					style={{ flexDirection: tablet ? "row" : "column", gap: space.s6, alignItems: "stretch" }}
				>
					<View style={{ flex: tablet ? 1 : 0, gap: space.s6 }}>
						<Section title={t`Coming up`}>
							<LoadState query={applications} />
							<LoadState query={queries.briefings} />
							{next ? (
								<Card style={{ gap: space.s3 }}>
									<Text variant="title">
										{next.application.company} ·{" "}
										{next.interview.kind === "technical"
											? t`Technical interview`
											: next.interview.kind === "screening"
												? t`Screening interview`
												: next.interview.kind === "behavioral"
													? t`Behavioral interview`
													: next.interview.kind === "onsite"
														? t`On-site interview`
														: t`Interview`}
									</Text>
									<Text>{time.when(next.start)}</Text>
									<Text color="ink3">
										{getStageLabel(next.application.status)} ·{" "}
										{new Intl.NumberFormat(time.locale, { style: "unit", unit: "minute", unitDisplay: "short" }).format(
											next.interview.durationMinutes,
										)}
									</Text>
									{queries.briefings.data?.some((row) => row.interviewId === next.interview.id) ? (
										<Chip label={t`Briefing ready`} />
									) : null}
									<Button
										variant="secondary"
										label={t`Open workspace`}
										onPress={() => router.push(routes.application(next.application.id, "prepare"))}
									/>
								</Card>
							) : !applications.isPending && !applications.isError ? (
								<Text color="ink3">{t`No upcoming interviews.`}</Text>
							) : null}
						</Section>
						<Section title={t`Needs you`}>
							<LoadState query={queries.notifications} />
							{!queries.notifications.isPending && !queries.notifications.isError && notes.length === 0 ? (
								<EmptyState
									title={t`You're up to date`}
									message={t`New roles, reminders and finished briefings appear here.`}
								/>
							) : null}
							{notes.map((row, index) => (
								<Animated.View key={row.id} {...listItemMotion(index, firstAppearance)} layout={listLayout}>
									<Card style={{ gap: space.s3 }}>
										<Text variant="title">{row.title}</Text>
										<Text>{row.body}</Text>
										<Text variant="caption" color="ink3">
											{time.when(row.createdAt)}
										</Text>
										<Actions>
											{row.notice.type === "opportunities" ? (
												<Button label={t`Review`} variant="secondary" onPress={() => router.push(routes.discover())} />
											) : row.applicationId ? (
												<Button
													label={row.notice.type === "briefing" ? t`Open briefing` : t`Open workspace`}
													variant="secondary"
													onPress={() =>
														router.push(
															routes.application(
																row.applicationId ?? "",
																row.notice.type === "briefing" ? "prepare" : "messages",
															),
														)
													}
												/>
											) : (
												<Button
													label={t`Open settings`}
													variant="secondary"
													onPress={() => router.push(routes.settings("ai"))}
												/>
											)}
											{!row.readAt && !undo.hidden.includes(row.id) ? (
												<Button
													label={t`Mark as read`}
													variant="ghost"
													onPress={() =>
														undo.remove(row.id, t`Marked as read`, () =>
															client.career.markNotificationRead({ id: row.id }),
														)
													}
												/>
											) : null}
										</Actions>
									</Card>
								</Animated.View>
							))}
							<Button
								variant="ghost"
								label={showRead ? t`Hide read` : t`Show read`}
								onPress={() => setShowRead(!showRead)}
							/>
							{(applications.data ?? [])
								.filter((row) => getNextStep(row, now).kind === "no-reply")
								.map((row) => (
									<Card key={row.id} style={{ gap: space.s3 }}>
										<Text>
											{row.company} · {t`No reply yet`}
										</Text>
										<Button
											variant="secondary"
											label={t`Review draft`}
											onPress={() => router.push(routes.application(row.id, "messages"))}
										/>
									</Card>
								))}
						</Section>
					</View>
				</View>
			</ScrollView>
		</Screen>
	);
}
