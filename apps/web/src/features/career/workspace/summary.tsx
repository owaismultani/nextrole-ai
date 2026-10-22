import type { WorkspaceTabProps } from "./shell";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { latest, useSavedItems } from "../hooks";
import { Eyebrow, useCareerTime } from "../shared";
import { FitTab } from "./fit";
import { actionLabel, preparationLabel, useWorkspaceState } from "./state";
import { describeNextStep, getNextStep } from "@/features/applications/next-step";

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
	const { application, now, go } = props;
	return (
		<div className="grid gap-8">
			<NextAction application={application} now={now} go={go} onAddOffer={props.onAddOffer} />
			<Posting application={application} />
			<FollowUpAndContacts application={application} />
			<Offers application={application} onAddOffer={props.onAddOffer} onEditOffer={props.onEditOffer} />
			<section id="fit" aria-label={t`Fit`} className="grid scroll-mt-6 gap-3">
				<Eyebrow>
					<Trans>How you fit</Trans>
				</Eyebrow>
				<FitTab {...props} />
			</section>
		</div>
	);
}

type NextActionProps = {
	application: SummaryProps["application"];
	now: Date;
	go: SummaryProps["go"];
	onAddOffer: () => void;
};

function NextAction({ application, now, go, onAddOffer }: NextActionProps) {
	const { i18n } = useLingui();
	const state = useWorkspaceState(application, now);
	const text = describeNextStep(getNextStep(application, now), application, i18n.locale);
	const label = actionLabel(state.action);
	const documents = preparationLabel(state.preparation);
	return (
		<section aria-label={t`Next action`} className="grid gap-2">
			<Eyebrow>
				<Trans>Next action</Trans>
			</Eyebrow>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface p-4">
				<Icon name={text.icon} size={22} className="shrink-0 text-ink-2" />
				<div className="grid min-w-0 flex-1 gap-0.5">
					<p className="text-sm font-semibold">{text.title}</p>
					{text.sub && <p className="text-[13px] text-ink-2">{text.sub}</p>}
					{documents && (
						<p className="text-xs text-ink-3">
							{documents}
							{" · "}
							<button type="button" className="underline" onClick={() => go("documents")}>
								<Trans>Open documents</Trans>
							</button>
						</p>
					)}
				</div>
				{label && (
					<Button
						onClick={() =>
							state.action.kind === "add-offer"
								? onAddOffer()
								: go(state.action.tab, state.action.section ? { section: state.action.section } : {})
						}
					>
						{label}
					</Button>
				)}
			</div>
		</section>
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
										<Icon name="check-circle" size={18} className="mt-0.5 shrink-0 text-accent-text" />
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
	const hasFollowUp = Boolean(application.followUpAt);
	const contacts = application.contacts;
	return (
		<section aria-label={t`Follow-up and contacts`} className="grid gap-3 @xl:grid-cols-2">
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
				{contacts.length === 0 ? (
					<p className="text-sm text-ink-3">
						<Trans>No contacts yet.</Trans>
					</p>
				) : (
					<ul className="grid gap-1.5 text-sm">
						{contacts.map((contact) => (
							<li key={`${contact.name}-${contact.email}`} className="flex flex-wrap gap-x-2">
								<span className="font-medium">{contact.name}</span>
								{contact.role && <span className="text-ink-3">{contact.role}</span>}
								{contact.email && (
									<a href={`mailto:${contact.email}`} className="text-ink-2 underline underline-offset-3">
										{contact.email}
									</a>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
			<p className="text-xs text-ink-3 @xl:col-span-2">
				<Link to="/dashboard/applications" search={{ applicationId: application.id }} className="underline">
					<Trans>Edit follow-up, contacts and details</Trans>
				</Link>
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
			<Eyebrow>
				<Trans>Offers</Trans>
			</Eyebrow>
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
