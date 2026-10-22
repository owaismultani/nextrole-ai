import type { WorkspaceTabProps } from "./shell";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { toast } from "@reactive-resume/ui/components/toast";
import { latest, useSavedItems } from "../hooks";
import { Eyebrow, useCareerTime } from "../shared";
import { useEditDetails } from "./edit-details";
import { FitTab } from "./fit";
import { OverviewRail } from "./overview-rail";
import { Contacts } from "@/features/applications/components/detail/contacts";
import { useInvalidateApplications } from "@/features/applications/use-application-actions";
import { orpc } from "@/libs/orpc/client";

type SummaryProps = WorkspaceTabProps & { onAddOffer: () => void; onEditOffer: (id: string) => void };

/**
 * Summary: what the job is and what to do next. The next action, the posting and what it asks for, the fit assessment
 * with its evidence, follow-up and contacts, and any offer, in one place. The fit check keeps all of its own actions.
 */
export function SummaryTab(props: SummaryProps) {
	// A saved fit opened from Saved is shown as it was, without the live summary around it.
	return props.version ? <FitTab {...props} /> : <SummaryBody {...props} />;
}

function SummaryBody(props: SummaryProps) {
	const { application, interview, now } = props;
	return (
		<div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_320px]">
			<div className="grid min-w-0 gap-8">
				<Posting application={application} />
				<Offers application={application} onAddOffer={props.onAddOffer} onEditOffer={props.onEditOffer} />
				<section id="fit" aria-label={t`Fit`} className="grid scroll-mt-6 gap-3">
					<Eyebrow>
						<Trans>How you fit</Trans>
					</Eyebrow>
					<FitTab {...props} />
				</section>
			</div>
			<aside aria-label={t`Application details`} className="grid content-start gap-5">
				<FollowUpAndContacts application={application} />
				<OverviewRail application={application} interview={interview} now={now} />
			</aside>
		</div>
	);
}

function Posting({ application }: { application: SummaryProps["application"] }) {
	const saved = useSavedItems(application.id);
	const fit = latest(saved.data, "fit");
	const checked = fit?.data.kind === "fit" ? fit.data.requirements : [];
	const requirements = application.requirements;
	const statusOf = (requirement: string) =>
		checked.find((item) => item.text.trim().toLowerCase() === requirement.trim().toLowerCase())?.status;
	return (
		<section aria-label={t`The role`} className="grid gap-4">
			<div className="grid gap-2">
				<Eyebrow>
					<Trans>Requirements</Trans>
				</Eyebrow>
				{requirements.length === 0 ? (
					<p className="text-sm text-ink-3">
						<Trans>No requirements were read from this posting.</Trans>
					</p>
				) : (
					<ul className="grid gap-1.5 text-sm">
						{requirements.map((requirement) => {
							const status = statusOf(requirement);
							return (
								<li key={requirement} className="flex items-start gap-2">
									{status === "supported" ? (
										<Icon name="check-circle" size={18} className="mt-0.5 shrink-0 text-ok-text" />
									) : (
										<span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-line-2" />
									)}
									<span className="min-w-0 flex-1">{requirement}</span>
									{status ? (
										<a href="#fit" className="shrink-0 text-xs text-ink-3 underline">
											{status === "supported"
												? t`Evidence`
												: status === "partial"
													? t`Partly supported`
													: t`No evidence yet`}
										</a>
									) : (
										<span className="shrink-0 text-xs text-ink-3">{t`Not checked`}</span>
									)}
								</li>
							);
						})}
					</ul>
				)}
				{requirements.length > 0 && checked.length === 0 && (
					<p className="text-xs text-ink-3">
						<Trans>Evidence is unavailable until you check fit below.</Trans>
					</p>
				)}
			</div>
			<details className="group rounded-xl border border-line bg-surface">
				<summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm font-semibold">
					<Icon
						name="caret-right"
						size={18}
						className="transition-transform duration-standard ease-enter group-open:rotate-90"
					/>
					<Trans>Job description</Trans>
					{application.sourceUrl && (
						<a
							href={application.sourceUrl}
							target="_blank"
							rel="noreferrer"
							className="ms-auto text-xs font-normal underline underline-offset-3"
							onClick={(event) => event.stopPropagation()}
						>
							<Trans>Original posting</Trans>
						</a>
					)}
				</summary>
				<div className="border-t border-line px-4 py-3">
					{application.postingSource && (
						<p className="mb-2 text-xs text-ink-3">
							{application.postingSource.method === "paste" ? (
								<Trans>Pasted description</Trans>
							) : (
								<Trans>
									Retrieved {application.postingSource.retrievedAt} using {application.postingSource.method}. Retrieval
									time does not establish origin freshness.
								</Trans>
							)}
						</p>
					)}
					{(application.postingSource?.truncated || application.postingSource?.completeness === "incomplete") && (
						<p className="mb-2 text-xs text-warn-text" role="alert">
							<Trans>This saved description is clipped or incomplete. Review before preparing documents.</Trans>
						</p>
					)}
					{application.requirements.length > 0 && (
						<div className="mb-3 grid gap-1.5">
							<p className="text-xs font-semibold text-ink-3 uppercase">
								<Trans>What it asks for</Trans>
							</p>
							<ul className="flex flex-wrap gap-1.5">
								{application.requirements.map((requirement) => (
									<li key={requirement} className="rounded-md bg-sunken px-2 py-1 text-xs">
										{requirement}
									</li>
								))}
							</ul>
						</div>
					)}
					{application.jobDescription ? (
						<p className="max-h-96 overflow-y-auto text-sm leading-[21px] whitespace-pre-line text-ink-2">
							{application.jobDescription}
						</p>
					) : (
						<p className="text-sm text-ink-3">
							<Trans>No job description was saved with this application.</Trans>
						</p>
					)}
				</div>
			</details>
		</section>
	);
}

function FollowUpAndContacts({ application }: { application: SummaryProps["application"] }) {
	const { date } = useCareerTime();
	const editDetails = useEditDetails();
	const invalidate = useInvalidateApplications();
	const update = useMutation({
		...orpc.applications.update.mutationOptions(),
		onSuccess: () => invalidate(application.id),
		onError: () => toast.add({ type: "error", description: t`Couldn't save.` }),
	});
	const hasFollowUp = Boolean(application.followUpAt);
	const contacts = application.contacts;
	return (
		<section
			aria-label={t`Follow-up and contacts`}
			className="grid gap-4 rounded-2xl border border-line bg-surface p-4"
		>
			<div className="grid content-start gap-2">
				<Eyebrow>
					<Trans>Follow-up</Trans>
				</Eyebrow>
				{hasFollowUp ? (
					<p className="text-sm">
						{application.followUpAt ? date(application.followUpAt) : null}
						{application.followUpNote && <span className="text-ink-2"> · {application.followUpNote}</span>}
					</p>
				) : (
					<p className="text-sm text-ink-3">
						<Trans>No follow-up is set.</Trans>
					</p>
				)}
			</div>
			<div className="grid content-start gap-2">
				<Eyebrow>
					<Trans>Contacts</Trans>
				</Eyebrow>
				<Contacts
					contacts={contacts}
					disabled={update.isPending}
					onChange={(next) => update.mutate({ id: application.id, contacts: next })}
				/>
			</div>
			<p className="text-xs text-ink-3">
				<button type="button" onClick={editDetails} className="underline">
					<Trans>Edit follow-up and details</Trans>
				</button>
			</p>
		</section>
	);
}

type OffersProps = {
	application: SummaryProps["application"];
	onAddOffer: () => void;
	onEditOffer: (id: string) => void;
};

function Offers({ application, onAddOffer, onEditOffer }: OffersProps) {
	const saved = useSavedItems(application.id);
	const offers = (saved.data ?? []).filter((item) => item.data.kind === "offer");
	const show = application.status === "offer" || offers.length > 0;
	if (!show) return null;
	return (
		<section id="offers" aria-label={t`Offers`} className="grid scroll-mt-6 gap-2">
			<div className="flex items-center justify-between gap-3">
				<Eyebrow>
					<Trans>Offers</Trans>
				</Eyebrow>
				<Link to="/dashboard/applications/offers" className="text-[13px] underline underline-offset-3">
					<Trans>Compare offers</Trans>
				</Link>
			</div>
			{offers.length === 0 ? (
				<p className="text-sm text-ink-3">
					<Trans>No offer has been recorded for this application.</Trans>
				</p>
			) : (
				<ul className="grid gap-2">
					{offers.map((offer) => (
						<li
							key={offer.id}
							className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface p-3.5"
						>
							<Icon name="scales" size={20} className="shrink-0 text-ink-2" />
							<span className="min-w-0 flex-1 text-sm font-semibold">{offer.title}</span>
							<Button variant="ghost" size="sm" onClick={() => onEditOffer(offer.id)}>
								<Trans>Edit terms</Trans>
							</Button>
							<Link
								to="/dashboard/applications/offers"
								search={{ a: offer.id }}
								className="text-[13px] underline underline-offset-3"
							>
								<Trans>Compare</Trans>
							</Link>
						</li>
					))}
				</ul>
			)}
			<Button variant="secondary" className="w-fit" onClick={onAddOffer}>
				<Icon name="plus" size={18} />
				<Trans>Add offer</Trans>
			</Button>
		</section>
	);
}
