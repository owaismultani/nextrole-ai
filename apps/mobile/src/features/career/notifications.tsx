import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { useState } from "react";
import Animated from "react-native-reanimated";
import { client, useCareerTime, useNow, useTodayQueries, useUndoRows } from "./hooks";
import { Actions, LoadState, Section } from "./shared";
import { getNextStep } from "@/features/applications/next-step";
import { useApplications } from "@/features/applications/queries";
import { routes } from "@/routes";
import { Button, Card, EmptyState, Text, listItemMotion, listLayout, useFirstAppearance, useTheme } from "@/ui";

/**
 * Notifications that need you: new roles to review, follow-up drafts, briefings, and anything that stopped working (a
 * failed schedule, failed email, a paused briefing), each with the action that recovers it. Mark as read, with Undo; read
 * ones can be shown again.
 */
export function Notifications() {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const now = useNow();
	const time = useCareerTime();
	const queries = useTodayQueries();
	const applications = useApplications();
	const undo = useUndoRows();
	const [showRead, setShowRead] = useState(false);
	const notes = (queries.notifications.data ?? []).filter(
		(row) => showRead || (!row.readAt && !undo.hidden.includes(row.id)),
	);
	const firstAppearance = useFirstAppearance(!queries.notifications.isPending);

	// Each notice type has its own recovery: the job it is about, the place that fixes it, or Discover for new roles.
	const recover = (row: (typeof notes)[number]) => {
		switch (row.notice.type) {
			case "opportunities":
				return { label: t`Review`, open: () => router.push(routes.discover()) };
			case "schedule-failed":
				return { label: t`Open schedule`, open: () => router.push(routes.automation()) };
			case "email-failed":
				return { label: t`Check settings`, open: () => router.push(routes.settings("account")) };
			case "briefing-paused":
				return row.applicationId
					? {
							label: t`Choose a new time`,
							open: () =>
								router.push(routes.application(row.applicationId ?? "", "interviews", { section: "prepare" })),
						}
					: { label: t`Open schedules`, open: () => router.push(routes.automation()) };
			case "briefing":
				return {
					label: t`Open briefing`,
					open: () => router.push(routes.application(row.applicationId ?? "", "interviews", { section: "prepare" })),
				};
			case "followup":
				return {
					label: t`Open workspace`,
					open: () => router.push(routes.application(row.applicationId ?? "", "messages")),
				};
		}
	};

	return (
		<Section title={t`Notifications`}>
			<LoadState query={queries.notifications} />
			{!queries.notifications.isPending && !queries.notifications.isError && notes.length === 0 ? (
				<EmptyState
					title={t`You're up to date`}
					message={t`New roles, reminders, finished briefings and anything that needs fixing appear here.`}
				/>
			) : null}
			{notes.map((row, index) => {
				const next = recover(row);
				return (
					<Animated.View key={row.id} {...listItemMotion(index, firstAppearance)} layout={listLayout}>
						<Card style={{ gap: space.s3 }}>
							<Text variant="title">{row.title}</Text>
							<Text>{row.body}</Text>
							<Text variant="caption" color="ink3">
								{time.when(row.createdAt)}
							</Text>
							<Actions>
								<Button label={next.label} variant="secondary" onPress={next.open} />
								{!row.readAt && !undo.hidden.includes(row.id) ? (
									<Button
										label={t`Mark as read`}
										variant="ghost"
										onPress={() =>
											undo.remove(row.id, t`Marked as read`, () => client.career.markNotificationRead({ id: row.id }))
										}
									/>
								) : null}
							</Actions>
						</Card>
					</Animated.View>
				);
			})}
			<Button variant="ghost" label={showRead ? t`Hide read` : t`Show read`} onPress={() => setShowRead(!showRead)} />
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
	);
}
