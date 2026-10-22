// Documents (web workspace/documents.tsx): the tailored resume and cover letter prepared for this application, with
// what to open, retry or regenerate, the gaps to fill, whether they are out of date and which baseline they came from.
// What you sent is kept apart from the current drafts. "Documents ready" means made, not approved.
import type { WorkspaceTabProps } from "../shell";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useApplicationJourney, useApplicationPreparation, workspaceError } from "../hooks";
import { Block, EmptyNotice } from "../parts";
import { WorkspaceScreen } from "../shell";
import { client, orpc } from "@/api/client";
import { useUserTime } from "@/features/application-detail/hooks";
import { PreparationCard } from "@/features/career/preparation-list";
import { useDocuments } from "@/features/documents/queries";
import { routes } from "@/routes";
import { Banner, Button, Skeleton, Text, showToast, useTheme } from "@/ui";

export function DocumentsTab() {
	return <WorkspaceScreen tab="documents">{(props) => <Documents {...props} />}</WorkspaceScreen>;
}

function Documents({ application }: WorkspaceTabProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const queryClient = useQueryClient();
	const preparation = useApplicationPreparation(application.id);
	const journey = useApplicationJourney(application.id);
	const prepare = useMutation({
		mutationFn: (opportunityId: string) =>
			client.career.prepareDocuments({ opportunityIds: [opportunityId], resume: true, letter: true }),
		onSuccess: async () => {
			showToast({ message: t`Preparing a resume and cover letter.` });
			await queryClient.invalidateQueries({ queryKey: orpc.career.key() });
		},
		onError: (error) => showToast({ message: workspaceError(error, t`Couldn't start that.`) }),
	});

	if (preparation.isError || journey.isError)
		return (
			<Banner
				tone="danger"
				message={t`Couldn't load the documents for this application.`}
				action={{
					label: t`Try again`,
					onPress: () => {
						void preparation.refetch();
						void journey.refetch();
					},
				}}
			/>
		);
	if (!preparation.data || journey.isPending) return <Skeleton height={space.s12 * 4} />;

	const job = preparation.data[0];
	const opportunityId = journey.data?.opportunityId;
	return (
		<View style={{ gap: space.s4 }}>
			<Block title={t`Prepared for this application`}>
				{job ? (
					<>
						<PreparationCard job={job} scope="application" />
						<Text variant="callout" color="ink3">
							{t`Documents ready means they were made, not that you approved them or applied. Your application status is separate.`}
						</Text>
					</>
				) : opportunityId ? (
					<EmptyNotice
						title={t`No documents yet`}
						message={t`Prepare a tailored resume and cover letter from your baseline.`}
					>
						<Button
							label={t`Prepare documents`}
							loading={prepare.isPending}
							onPress={() => prepare.mutate(opportunityId)}
						/>
					</EmptyNotice>
				) : (
					<Text color="ink2">
						{t`Tailored documents are prepared for roles found by discovery. This application was added by hand, so use the resume and cover letter linked below.`}
					</Text>
				)}
			</Block>
			<Linked application={application} />
		</View>
	);
}

/** The resume and cover letter linked to the application, and the versions that were sent, kept apart. */
function Linked({ application }: { application: WorkspaceTabProps["application"] }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const router = useRouter();
	const time = useUserTime();
	const documents = useDocuments();
	const sent = application.status !== "saved";
	const resume = documents.data?.find((document) => document.type === "resume" && document.id === application.resumeId);
	const letter = documents.data?.find(
		(document) => document.type === "letter" && document.id === application.coverLetterId,
	);
	return (
		<Block title={sent ? t`What you sent · ${time.date(application.appliedAt)}` : t`Linked documents`}>
			<View style={{ gap: space.s3 }}>
				{[
					{
						key: "resume",
						label: t`Resume`,
						linked: application.resumeId,
						name: resume?.name,
						sentVersion: application.sentResumeVersionId,
						file: application.resumeFileName,
						open: () => router.push(routes.builder(application.resumeId ?? "")),
						history: (version: string) => router.push(routes.history(application.resumeId ?? "", version)),
					},
					{
						key: "letter",
						label: t`Cover letter`,
						linked: application.coverLetterId,
						name: letter?.name,
						sentVersion: application.sentCoverLetterVersionId,
						file: application.coverLetterName,
						open: () => router.push(routes.letter(application.coverLetterId ?? "")),
						history: (version: string) => router.push(routes.letter(application.coverLetterId ?? "", "write", version)),
					},
				].map((row) => (
					<View key={row.key} style={{ gap: space.s1 }}>
						<Text variant="callout" color="ink3">
							{row.label}
						</Text>
						{row.linked ? (
							<>
								<Text weight={600}>{row.name ?? (documents.isPending ? t`Loading…` : t`Not found`)}</Text>
								<Text variant="callout" color="ink3">
									{row.sentVersion ? t`A version was kept when you applied` : t`Not sent yet`}
								</Text>
							</>
						) : (
							<Text color="ink3">{t`None linked`}</Text>
						)}
						{row.file ? <Text variant="callout" color="ink3">{t`Uploaded file: ${row.file}`}</Text> : null}
						{row.linked && row.name ? (
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
								<Button variant="secondary" label={t`Open`} onPress={row.open} />
								{row.sentVersion ? (
									<Button
										variant="ghost"
										label={t`See what you sent`}
										onPress={() => row.history(row.sentVersion ?? "")}
									/>
								) : null}
							</View>
						) : null}
					</View>
				))}
				<Button
					variant="ghost"
					label={t`Change linked documents`}
					onPress={() => router.replace(routes.applicationDetails(application.id))}
				/>
			</View>
		</Block>
	);
}
