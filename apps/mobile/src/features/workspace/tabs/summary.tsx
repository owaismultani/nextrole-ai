// Summary (web workspace/summary.tsx): what the job is and what to do next. The next action, the posting and what it
// asks for, the fit assessment with its evidence, follow-up and contacts, and any offer. The fit check keeps all of its
// own actions.
import type { WorkspaceTabProps } from "../shell";
import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { actionLabel, preparationLabel, useWorkspaceState } from "../action";
import { latest, useSavedItems } from "../hooks";
import { Actions, Block } from "../parts";
import { WorkspaceScreen } from "../shell";
import { Fit } from "./fit";
import { useUserTime } from "@/features/application-detail/hooks";
import { describeNextStep, getNextStep } from "@/features/applications/next-step";
import { routes } from "@/routes";
import { Button, Icon, Text, useTheme } from "@/ui";

export function SummaryTab() {
	return <WorkspaceScreen tab="summary">{(props) => <Summary {...props} />}</WorkspaceScreen>;
}

function Summary(props: WorkspaceTabProps) {
	const { space } = useTheme();
	// A saved fit opened from Saved work is shown as it was, without the live summary around it.
	if (props.version) return <Fit {...props} />;
	return (
		<View style={{ gap: space.s4 }}>
			<NextAction {...props} />
			<Posting {...props} />
			<FollowUpAndContacts {...props} />
			<Offers {...props} />
			<Fit {...props} />
		</View>
	);
}

function NextAction({ application, now, go, addOffer }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const time = useUserTime();
	const state = useWorkspaceState(application, now);
	const text = describeNextStep(getNextStep(application, now), application, time.locale, time.timeZone);
	const label = actionLabel(state.action);
	const documents = preparationLabel(state.preparation);
	return (
		<Block title={t`Next action`}>
			<View style={{ flexDirection: "row", gap: space.s3 }}>
				<Icon name={text.icon} />
				<View style={{ flex: 1, gap: space.s0 }}>
					<Text weight={600}>{text.title}</Text>
					{text.sub ? <Text color="ink2">{text.sub}</Text> : null}
					{documents ? (
						<Text variant="callout" color="ink3">
							{documents}
						</Text>
					) : null}
				</View>
			</View>
			<Actions>
				{label ? (
					<Button
						label={label}
						onPress={() =>
							state.action.kind === "add-offer"
								? addOffer()
								: go(state.action.tab, state.action.section ? { section: state.action.section } : {})
						}
					/>
				) : null}
				<Button variant="ghost" label={t`Open documents`} onPress={() => go("documents")} />
			</Actions>
		</Block>
	);
}

function Posting({ application }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const saved = useSavedItems(application.id);
	const [open, setOpen] = useState(false);
	const fit = latest(saved.data, "fit");
	const checked = fit?.data.kind === "fit" ? fit.data.requirements : [];
	const statusOf = (requirement: string) =>
		checked.find((item) => item.text.trim().toLowerCase() === requirement.trim().toLowerCase())?.status;
	return (
		<Block title={t`Requirements`}>
			{application.requirements.length === 0 ? (
				<Text color="ink3">{t`No requirements were read from this posting.`}</Text>
			) : (
				<View style={{ gap: space.s2 }}>
					{application.requirements.map((requirement) => {
						const status = statusOf(requirement);
						return (
							<View key={requirement} style={{ flexDirection: "row", gap: space.s2 }}>
								<Text color={status === "supported" ? "accentText" : "ink3"}>{status === "supported" ? "✓" : "•"}</Text>
								<View style={{ flex: 1 }}>
									<Text>{requirement}</Text>
									<Text variant="callout" color="ink3">
										{status === "supported"
											? t`Supported by your evidence`
											: status === "partial"
												? t`Partly supported`
												: status === "missing"
													? t`No evidence yet`
													: t`Not checked`}
									</Text>
								</View>
							</View>
						);
					})}
					{checked.length === 0 ? (
						<Text variant="callout" color="ink3">{t`Evidence is unavailable until you check fit below.`}</Text>
					) : null}
				</View>
			)}
			<Actions>
				<Button
					variant="ghost"
					label={open ? t`Hide job description` : t`Job description`}
					onPress={() => setOpen(!open)}
				/>
				{application.sourceUrl ? (
					<Button
						variant="ghost"
						label={t`Original posting`}
						onPress={() => {
							if (/^https?:\/\//i.test(application.sourceUrl ?? ""))
								void openBrowserAsync(application.sourceUrl ?? "").catch(() => undefined);
						}}
					/>
				) : null}
			</Actions>
			{open ? (
				<Text color="ink2">{application.jobDescription || t`No job description was saved with this application.`}</Text>
			) : null}
		</Block>
	);
}

function FollowUpAndContacts({ application }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useUserTime();
	return (
		<Block title={t`Follow-up and contacts`}>
			<View style={{ gap: space.s1 }}>
				<Text variant="callout" color="ink3">
					{t`Follow-up`}
				</Text>
				<Text color={application.followUpAt ? "ink" : "ink3"}>
					{application.followUpAt
						? [time.date(application.followUpAt), application.followUpNote].filter(Boolean).join(" · ")
						: t`No follow-up is set.`}
				</Text>
			</View>
			<View style={{ gap: space.s1 }}>
				<Text variant="callout" color="ink3">
					{t`Contacts`}
				</Text>
				{application.contacts.length === 0 ? <Text color="ink3">{t`No contacts yet.`}</Text> : null}
				{application.contacts.map((contact) => (
					<Text key={`${contact.name}-${contact.email}`}>
						{[contact.name, contact.role, contact.email].filter(Boolean).join(" · ")}
					</Text>
				))}
			</View>
			<Button
				variant="ghost"
				label={t`Edit follow-up, contacts and details`}
				onPress={() => router.replace(routes.applicationDetails(application.id))}
			/>
		</Block>
	);
}

function Offers({ application, addOffer, editOffer }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const saved = useSavedItems(application.id);
	const offers = (saved.data ?? []).filter((item) => item.data.kind === "offer");
	if (application.status !== "offer" && offers.length === 0) return null;
	return (
		<Block title={t`Offers`}>
			{offers.length === 0 ? <Text color="ink3">{t`No offer has been recorded for this application.`}</Text> : null}
			{offers.map((offer) => (
				<View key={offer.id} style={{ gap: space.s1 }}>
					<Text weight={600}>{offer.title}</Text>
					<Actions>
						<Button variant="ghost" label={t`Edit terms`} onPress={() => editOffer(offer.id)} />
						<Button variant="ghost" label={t`Compare`} onPress={() => router.push(routes.offers())} />
					</Actions>
				</View>
			))}
			<Button variant="secondary" label={t`Add offer`} onPress={addOffer} />
		</Block>
	);
}
