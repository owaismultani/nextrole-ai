import type { DocumentSummary } from "./filter";
import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { getStageLabel } from "@/features/applications/stages";
import { summaryLabel } from "@/features/career/preparation";
import { orpc } from "@/libs/orpc/client";

export type DocumentOrigin = RouterOutput["career"]["documentOrigins"][number];

/** Where each prepared document came from, by document id. Documents made by hand have no entry. */
export function useDocumentOrigins() {
	const query = useQuery(orpc.career.documentOrigins.queryOptions({ input: {} }));
	const byDocument = new Map((query.data ?? []).map((origin) => [origin.documentId, origin]));
	return { ...query, byDocument };
}

/** How a document came to be, in a few words: the baseline it was made from, or that you made it. */
function originLine(origin: DocumentOrigin | undefined) {
	if (!origin) return t`Made by you`;
	if (!origin.baseline) return t`Prepared for this job · baseline not recorded`;
	if (origin.baseline.name) return t`Prepared from “${origin.baseline.name}”`;
	return t`Prepared from a baseline that has since been removed`;
}

type GroupsProps = {
	documents: readonly DocumentSummary[];
	origins: ReadonlyMap<string, DocumentOrigin>;
};

/**
 * By application: each application's documents together under its full company and role, with the state of its
 * preparation and a way to open the application. Groups are by application, never by company name.
 */
export function ApplicationGroups({ documents, origins }: GroupsProps) {
	const applications = useQuery(applicationsListQueryOptions());
	const groups = new Map<
		string,
		{ application: NonNullable<DocumentSummary["application"]>; documents: DocumentSummary[] }
	>();
	for (const document of documents) {
		if (!document.application) continue;
		const group = groups.get(document.application.id) ?? { application: document.application, documents: [] };
		group.documents.push(document);
		groups.set(document.application.id, group);
	}
	const ordered = [...groups.values()].sort(
		(a, b) =>
			Math.max(...b.documents.map((item) => item.updatedAt.getTime())) -
			Math.max(...a.documents.map((item) => item.updatedAt.getTime())),
	);
	if (ordered.length === 0)
		return (
			<div className="grid justify-items-center gap-2 py-16 text-center">
				<Icon name="briefcase" size={28} className="text-ink-3" />
				<p className="font-semibold">
					<Trans>No documents are linked to an application yet</Trans>
				</p>
				<p className="max-w-prose text-sm text-ink-2">
					<Trans>
						Documents prepared for a job, and ones you link to an application, are grouped here under that job.
					</Trans>
				</p>
			</div>
		);
	return (
		<ul className="grid gap-4" aria-label={t`Documents by application`}>
			{ordered.map(({ application, documents: group }) => {
				const full = applications.data?.find((item) => item.id === application.id);
				const originsFor = group.map((document) => origins.get(document.id)).filter((origin) => origin !== undefined);
				const summary = originsFor[0]?.summary;
				const stale = originsFor.some((origin) => origin.stale);
				const resume = group.find((document) => document.type === "resume");
				const letter = group.find((document) => document.type === "letter");
				return (
					<li key={application.id} className="grid gap-3 rounded-xl border border-line bg-surface p-4">
						<div className="flex flex-wrap items-start gap-x-4 gap-y-2">
							<div className="grid min-w-0 flex-1 gap-0.5">
								<h2 className="truncate text-[15px] font-semibold">
									{[application.role, application.company].filter(Boolean).join(" · ")}
								</h2>
								<p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
									{full && <span>{getStageLabel(full.status)}</span>}
									{full?.location && <span>{full.location}</span>}
									{summary && (
										<span
											className={cn(
												summary === "attention"
													? "text-danger-text"
													: summary === "ready"
														? "text-ok-text"
														: "text-info-text",
											)}
										>
											{summary === "ready" ? t`Documents ready` : summaryLabel(summary)}
										</span>
									)}
									{stale && (
										<span className="text-warn-text">
											<Trans>Out of date</Trans>
										</span>
									)}
								</p>
							</div>
							<Button
								variant="secondary"
								size="sm"
								nativeButton={false}
								render={
									<Link
										to="/dashboard/applications/$applicationId/{-$tab}"
										params={{ applicationId: application.id, tab: "documents" }}
									/>
								}
							>
								<Trans>Open application</Trans>
							</Button>
						</div>
						<ul className="grid gap-2 sm:grid-cols-2 @xl:grid-cols-2">
							{[resume, letter].map((document, index) =>
								document ? (
									<li key={document.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
										<Icon
											name={document.type === "resume" ? "file-text" : "envelope-simple"}
											size={20}
											className="mt-0.5 shrink-0 text-ink-2"
										/>
										<div className="grid min-w-0 flex-1 gap-0.5">
											<span className="truncate text-sm font-semibold">{document.name}</span>
											<span className="text-xs text-ink-3">{originLine(origins.get(document.id))}</span>
											{origins.get(document.id)?.edited && (
												<span className="text-xs text-ink-3">
													<Trans>Edited since it was made</Trans>
												</span>
											)}
										</div>
										{document.type === "resume" ? (
											<Link
												to="/builder/$resumeId"
												params={{ resumeId: document.id }}
												search={{ from: application.id }}
												className="text-[13px] underline underline-offset-3"
											>
												<Trans>Edit</Trans>
											</Link>
										) : (
											<Link
												to="/builder/letter/$coverLetterId"
												params={{ coverLetterId: document.id }}
												search={{ from: application.id }}
												className="text-[13px] underline underline-offset-3"
											>
												<Trans>Edit</Trans>
											</Link>
										)}
									</li>
								) : (
									<li
										key={index === 0 ? "no-resume" : "no-letter"}
										className="rounded-lg border border-dashed border-line-2 p-3 text-xs text-ink-3"
									>
										{index === 0 ? t`No resume for this application` : t`No cover letter for this application`}
									</li>
								),
							)}
						</ul>
					</li>
				);
			})}
		</ul>
	);
}
