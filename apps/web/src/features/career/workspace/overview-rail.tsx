import type { Application } from "@/features/applications/types";
import type { InterviewTimelineEntry } from "@reactive-resume/schema/applications/data";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { getInitials } from "@reactive-resume/utils/string";
import { Eyebrow, useCareerTime } from "../shared";
import { ApplicationNotes } from "@/features/applications/components/application-notes";
import { KeyFacts, Tags } from "@/features/applications/components/detail/key-facts";
import { getNextStep } from "@/features/applications/next-step";
import { orpc } from "@/libs/orpc/client";

type OverviewRailProps = {
	application: Application;
	interview: InterviewTimelineEntry | undefined;
	now: Date;
};

/**
 * The rail beside Overview: who you'll meet and the interview notes while a round is coming, the job's details (salary,
 * source, tags) and your notes for it. Other tabs have the full width.
 */
export function OverviewRail({ application, interview, now }: OverviewRailProps) {
	const { date } = useCareerTime();
	const documents = useQuery(orpc.documents.list.queryOptions({ input: { trashed: false } }));
	const hasSentVersion = Boolean(application.sentResumeVersionId || application.sentCoverLetterVersionId);
	const trashed = useQuery({
		...orpc.documents.list.queryOptions({ input: { trashed: true } }),
		enabled: hasSentVersion,
	});
	const available = [...(documents.data ?? []), ...(trashed.data ?? [])];
	const resume = available.find((document) => document.type === "resume" && document.id === application.resumeId);
	const letter = available.find((document) => document.type === "letter" && document.id === application.coverLetterId);
	const missingDocument = Boolean((application.resumeId && !resume) || (application.coverLetterId && !letter));
	const documentsPending = missingDocument && (documents.isPending || (hasSentVersion && trashed.isPending));
	const documentsFailed = missingDocument && (documents.isError || (hasSentVersion && trashed.isError));
	const sent = application.status !== "saved";
	const step = getNextStep(application, now);
	const upcoming = step.kind === "interview" ? step.interview : interview;
	return (
		<>
			{upcoming && upcoming.participants.length > 0 && (
				<section className="grid gap-2.5">
					<Eyebrow>
						<Trans>Who you'll meet</Trans>
					</Eyebrow>
					{upcoming.participants.map((person) => (
						<div key={`${person.name}-${person.role}`} className="flex items-center gap-2.5">
							<span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink-2">
								{getInitials(person.name)}
							</span>
							<div className="grid min-w-0">
								<span className="truncate text-[13px] font-semibold">{person.name}</span>
								{person.role && <span className="truncate text-xs text-ink-3">{person.role}</span>}
							</div>
						</div>
					))}
				</section>
			)}
			{upcoming?.notes && (
				<section className="grid gap-2.5">
					<Eyebrow>
						<Trans>Interview notes</Trans>
					</Eyebrow>
					<p className="rounded-lg bg-sunken px-3 py-2.5 text-[13px] leading-[19px] whitespace-pre-wrap text-ink-2">
						{upcoming.notes}
					</p>
				</section>
			)}

			{(resume || letter || documentsPending || documentsFailed) && (
				<section className="grid gap-2">
					<Eyebrow>
						{sent ? (
							<Trans>What you sent · {date(application.appliedAt)}</Trans>
						) : (
							<Trans>Documents for this job</Trans>
						)}
					</Eyebrow>
					{documentsPending ? (
						<p role="status" className="text-xs text-ink-3">
							<Trans>Loading linked documents…</Trans>
						</p>
					) : documentsFailed ? (
						<div className="grid justify-items-start gap-1.5">
							<p role="alert" className="text-xs text-ink-3">
								<Trans>Linked documents couldn't be loaded.</Trans>
							</p>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									void documents.refetch();
									if (hasSentVersion) void trashed.refetch();
								}}
							>
								<Trans>Try again</Trans>
							</Button>
						</div>
					) : null}
					{resume && application.resumeId && (
						<Link
							to="/builder/$resumeId"
							params={{ resumeId: application.resumeId }}
							search={application.sentResumeVersionId ? { version: application.sentResumeVersionId } : {}}
							className="flex items-center gap-2.5 rounded-xl border border-line p-3 transition-colors duration-quick hover:bg-hover"
						>
							<Icon name="file-text" className="shrink-0 text-ink-2" />
							<span className="grid min-w-0">
								<span className="truncate text-[13px] font-semibold">{resume.name}</span>
								<span className="text-xs text-ink-3">
									{application.sentResumeVersionId ? (
										<Trans>Resume · version sent</Trans>
									) : (
										<Trans>Resume · not sent yet</Trans>
									)}
								</span>
							</span>
						</Link>
					)}
					{letter && application.coverLetterId && (
						<Link
							to="/builder/letter/$coverLetterId"
							params={{ coverLetterId: application.coverLetterId }}
							search={application.sentCoverLetterVersionId ? { version: application.sentCoverLetterVersionId } : {}}
							className="flex items-center gap-2.5 rounded-xl border border-line p-3 transition-colors duration-quick hover:bg-hover"
						>
							<Icon name="envelope-simple" className="shrink-0 text-ink-2" />
							<span className="grid min-w-0">
								<span className="truncate text-[13px] font-semibold">{letter.name}</span>
								<span className="text-xs text-ink-3">
									{application.sentCoverLetterVersionId ? (
										<Trans>Letter · version sent</Trans>
									) : (
										<Trans>Letter · not sent yet</Trans>
									)}
								</span>
							</span>
						</Link>
					)}
				</section>
			)}

			<section className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
				<Eyebrow>
					<Trans>Details</Trans>
				</Eyebrow>
				<KeyFacts application={application} />
				<Tags application={application} />
			</section>

			<section className="grid gap-1.5 rounded-2xl border border-line bg-surface p-4">
				<ApplicationNotes key={application.id} application={application} />
				<p className="text-xs text-ink-3">
					<Trans>The coach reads these for this application only.</Trans>
				</p>
			</section>
		</>
	);
}
