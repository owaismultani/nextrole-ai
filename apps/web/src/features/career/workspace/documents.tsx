import type { WorkspaceTabProps } from "./shell";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { toast } from "@reactive-resume/ui/components/toast";
import { useApplicationJourney, useApplicationPreparation } from "../hooks";
import { CareerLoadError } from "../load-state";
import { PreparationRow } from "../preparation-list";
import { Eyebrow, useCareerTime } from "../shared";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

/**
 * Documents: the tailored resume and cover letter prepared for this application, side by side, with what to open, retry
 * or regenerate, the gaps to fill, whether they are out of date and which baseline they came from. What you sent is
 * kept apart from the current drafts. "Documents ready" means made, not approved, and is separate from the stage.
 */
export function DocumentsTab({ application }: WorkspaceTabProps) {
	const preparation = useApplicationPreparation(application.id);
	const journey = useApplicationJourney(application.id);
	const queryClient = useQueryClient();
	const prepare = useMutation(orpc.career.prepareDocuments.mutationOptions());
	const opportunityId = journey.data?.opportunityId;

	if (preparation.isError || journey.isError)
		return (
			<CareerLoadError
				onRetry={() => {
					void preparation.refetch();
					void journey.refetch();
				}}
			/>
		);
	if (!preparation.data || journey.isPending) return <Skeleton className="h-64 rounded-xl" />;

	const job = preparation.data[0];
	const startPreparing = () =>
		opportunityId &&
		prepare.mutate(
			{ opportunityIds: [opportunityId], resume: true, letter: true },
			{
				onSuccess: () => {
					toast.add({ description: t`Preparing a resume and cover letter.` });
					void queryClient.invalidateQueries({ queryKey: orpc.career.preparations.key() });
				},
				onError: (error) =>
					toast.add({
						type: "error",
						description: getOrpcErrorMessage(error, { fallback: t`Couldn't start that.`, allowServerMessage: true }),
					}),
			},
		);

	return (
		<div className="grid gap-8">
			<section aria-label={t`Prepared for this application`} className="grid gap-3">
				<Eyebrow>
					<Trans>Prepared for this application</Trans>
				</Eyebrow>
				{job ? (
					<>
						<PreparationRow job={job} scope="application" />
						<p className="text-xs text-ink-3">
							<Trans>
								Documents ready means they were made, not that you approved them or applied. Your application status is
								separate.
							</Trans>{" "}
							<Link to="/dashboard/automation" className="underline">
								<Trans>Automation</Trans>
							</Link>
						</p>
					</>
				) : opportunityId ? (
					<div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line-2 p-5">
						<p className="max-w-prose text-sm text-ink-2">
							<Trans>
								No documents have been prepared for this job yet. Prepare a tailored resume and cover letter from your
								baseline.
							</Trans>
						</p>
						<Button loading={prepare.isPending} onClick={startPreparing}>
							<Trans>Prepare documents</Trans>
						</Button>
					</div>
				) : (
					<p className="max-w-prose rounded-xl border border-dashed border-line-2 p-5 text-sm text-ink-2">
						<Trans>
							Tailored documents are prepared for roles found by discovery. This application was added by hand, so use
							the resume and cover letter linked below.
						</Trans>
					</p>
				)}
			</section>
			<Linked application={application} />
		</div>
	);
}

/** The resume and cover letter linked to the application, and the versions that were sent, kept apart. */
function Linked({ application }: { application: WorkspaceTabProps["application"] }) {
	const { date } = useCareerTime();
	const hasSent = Boolean(application.sentResumeVersionId || application.sentCoverLetterVersionId);
	const documents = useQuery(orpc.documents.list.queryOptions({ input: { trashed: false } }));
	const trashed = useQuery({
		...orpc.documents.list.queryOptions({ input: { trashed: true } }),
		enabled: hasSent,
	});
	const available = [...(documents.data ?? []), ...(trashed.data ?? [])];
	const resume = available.find((document) => document.type === "resume" && document.id === application.resumeId);
	const letter = available.find((document) => document.type === "letter" && document.id === application.coverLetterId);
	const sent = application.status !== "saved";
	const rows = [
		{
			key: "resume",
			icon: "file-text" as const,
			name: resume?.name,
			missing: Boolean(application.resumeId && !resume),
			linked: Boolean(application.resumeId),
			sentVersion: application.sentResumeVersionId,
			label: t`Resume`,
			file: application.resumeFileName,
		},
		{
			key: "letter",
			icon: "envelope-simple" as const,
			name: letter?.name,
			missing: Boolean(application.coverLetterId && !letter),
			linked: Boolean(application.coverLetterId),
			sentVersion: application.sentCoverLetterVersionId,
			label: t`Cover letter`,
			file: application.coverLetterName,
		},
	];
	const open = (kind: "resume" | "letter", version?: string | null) =>
		kind === "resume" ? (
			<Link
				to="/builder/$resumeId"
				params={{ resumeId: application.resumeId ?? "" }}
				search={version ? { version } : {}}
				className="text-[13px] underline underline-offset-3"
			>
				{version ? <Trans>See what you sent</Trans> : <Trans>Open</Trans>}
			</Link>
		) : (
			<Link
				to="/builder/letter/$coverLetterId"
				params={{ coverLetterId: application.coverLetterId ?? "" }}
				search={version ? { version } : {}}
				className="text-[13px] underline underline-offset-3"
			>
				{version ? <Trans>See what you sent</Trans> : <Trans>Open</Trans>}
			</Link>
		);

	return (
		<section aria-label={t`Linked documents`} className="grid gap-3">
			<Eyebrow>
				{sent ? <Trans>What you sent · {date(application.appliedAt)}</Trans> : <Trans>Linked documents</Trans>}
			</Eyebrow>
			{documents.isError && (
				<CareerLoadError
					onRetry={() => {
						void documents.refetch();
						void trashed.refetch();
					}}
				/>
			)}
			<ul className="grid gap-2 @xl:grid-cols-2">
				{rows.map((row) => (
					<li key={row.key} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
						<Icon name={row.icon} size={22} className="mt-0.5 shrink-0 text-ink-2" />
						<div className="grid min-w-0 flex-1 gap-0.5">
							<span className="text-xs text-ink-3">{row.label}</span>
							{row.linked ? (
								<span className="truncate text-sm font-semibold">
									{row.name ?? (row.missing && !documents.isPending ? t`Not found` : t`Loading…`)}
								</span>
							) : (
								<span className="text-sm text-ink-3">{t`None linked`}</span>
							)}
							{row.linked && row.name && (
								<span className="text-xs text-ink-3">
									{row.sentVersion ? t`A version was kept when you applied` : t`Not sent yet`}
								</span>
							)}
							{row.file && <span className="text-xs text-ink-3">{t`Uploaded file: ${row.file}`}</span>}
						</div>
						<div className="flex shrink-0 flex-col items-end gap-1">
							{row.linked && row.name && open(row.key as "resume" | "letter")}
							{row.linked && row.name && row.sentVersion && open(row.key as "resume" | "letter", row.sentVersion)}
						</div>
					</li>
				))}
			</ul>
			<p className="text-xs text-ink-3">
				<Link to="/dashboard/applications" search={{ applicationId: application.id }} className="underline">
					<Trans>Change linked documents</Trans>
				</Link>
			</p>
		</section>
	);
}
