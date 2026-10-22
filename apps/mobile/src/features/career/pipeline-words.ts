import type { RouterOutput } from "@/api/client";
import type { PreparationError } from "@reactive-resume/schema/career";
import { t } from "@lingui/core/macro";
import { stepMessage } from "./preparation";

type Overview = RouterOutput["career"]["overview"];
export type Stage = Overview["stages"][number];
export type Check = Overview["checks"][number];
export type ActivityEvent = RouterOutput["career"]["activity"]["items"][number];

type When = (value: Date | string) => string;

export const stageLabel = (key: Stage["key"]) =>
	({
		schedule: t`Schedule`,
		search: t`Search`,
		read: t`Read pages`,
		filter: t`Filter`,
		save: t`Save jobs`,
		prepare: t`Prepare documents`,
		review: t`You review`,
		apply: t`You apply`,
	})[key];

/** One plain sentence on what the step is, so nobody has to guess what happens behind the scenes. */
export const stageExplain = (key: Stage["key"]) =>
	({
		schedule: t`Runs your search on its own, even with the browser closed.`,
		search: t`Asks your search service for postings that match what you look for.`,
		read: t`Opens each result to check it is a real, open job posting.`,
		filter: t`Drops jobs you already have, closed roles and pages that are not postings.`,
		save: t`Adds the new jobs to your applications as Saved.`,
		prepare: t`Writes a tailored resume and cover letter for each new job, within your daily limit.`,
		review: t`Your turn: read and edit the drafts. Nothing is final until you say so.`,
		apply: t`Your turn: you send applications yourself. Nothing is ever sent for you.`,
	})[key];

/** What the step is doing right now, in a few words. */
export function stageText(stage: Stage, when: When) {
	const count = stage.count ?? 0;
	switch (`${stage.key}:${stage.code}`) {
		case "schedule:none":
			return t`No schedule yet`;
		case "schedule:paused":
			return t`Paused`;
		case "schedule:queued":
			return t`Starting within a minute`;
		case "schedule:running":
			return t`Running now`;
		case "schedule:overdue":
			return stage.at ? t`Overdue since ${when(stage.at)}` : t`Overdue`;
		case "schedule:next":
			return stage.at ? t`Next run ${when(stage.at)}` : t`Scheduled`;
		case "search:search-failed":
			return t`The last search failed`;
		case "search:searched":
			return t`${count} results`;
		case "read:none-readable":
			return t`No pages could be read`;
		case "read:some-unreadable":
			return t`${count} could not be read`;
		case "read:read":
			return t`All pages read`;
		case "filter:filtered":
			return t`${count} filtered out`;
		case "save:saved":
			return t`${count} new jobs`;
		case "prepare:off":
			return t`Off`;
		case "prepare:generating":
			return t`Writing ${count}`;
		case "prepare:attention":
			return t`${count} need attention`;
		case "prepare:limit":
			return stage.at
				? t`${count} waiting for the daily limit · from ${when(stage.at)}`
				: t`${count} waiting for the daily limit`;
		case "prepare:queued":
			return t`${count} queued`;
		case "prepare:done":
			return t`${count} ready`;
		case "review:ready":
			return t`${count} ready for you`;
		case "review:none":
			return t`Nothing to review`;
		case "apply:applied":
			return t`${count} applied in this window`;
		default:
			return t`Waiting for the first run`;
	}
}

/** One line for each checklist item, saying what is true and, when it is not fine, what to do. */
export function checkText(check: Check, when: When) {
	const value = check.value ?? 0;
	switch (`${check.key}:${check.status}`) {
		case "schedule:ok":
			return t`Discovery is on`;
		case "schedule:info":
			return t`Discovery is paused. Resume it to keep finding jobs.`;
		case "schedule:warn":
			return t`There is no discovery schedule yet.`;
		case "next-run:ok":
			return check.at ? t`Next search ${when(check.at)}` : t`A search is scheduled`;
		case "next-run:warn":
			return check.at
				? t`The next search was due ${when(check.at)} and has not started. The server's scheduler may be behind.`
				: t`The next search is overdue.`;
		case "search:ok":
			return t`Web search is connected`;
		case "search:fail":
			return t`No working web search connection. Discovery cannot search without one.`;
		case "ai:ok":
			return t`AI provider is connected`;
		case "ai:fail":
			return t`No AI provider has passed its test. Documents cannot be written without one.`;
		case "baseline:ok":
			return t`Baseline resume is set`;
		case "baseline:fail":
			return t`No baseline resume. Documents need one to start from.`;
		case "limit:ok":
			return t`${value} documents left today`;
		case "limit:warn":
			return t`Today's document limit is used up. More start after midnight.`;
		case "last-run:ok":
			return t`The last search succeeded`;
		case "last-run:warn":
			return t`The last search partly succeeded: some pages could not be read.`;
		case "last-run:fail":
			return t`The last search failed. Open the run to see why.`;
		case "repeating:warn":
			return t`Recent searches only found jobs you already have. Try changing what you look for.`;
		default:
			return "";
	}
}

/** Where a failing or warning check is fixed. */
export const checkFix = (check: Check) =>
	check.status === "ok" || check.status === "info"
		? null
		: check.key === "search" || check.key === "ai"
			? ("ai" as const)
			: check.key === "baseline" || check.key === "limit"
				? ("automation" as const)
				: check.key === "schedule"
					? ("today" as const)
					: ("pipeline" as const);

const kindName = (kind: unknown) => (kind === "letter" ? t`cover letter` : t`tailored resume`);
const jobName = (event: ActivityEvent) =>
	[event.data.company, event.data.role].filter((part) => typeof part === "string" && part).join(" · ") || t`a job`;

/** A sentence for each logged event. Facts only; nothing here is guessed. */
export function describeEvent(event: ActivityEvent, when: When) {
	const { data } = event;
	const job = jobName(event);
	const kind = kindName(data.kind);
	const reason = typeof data.code === "string" ? stepMessage(data.code as PreparationError) : null;
	switch (event.kind) {
		case "run.finished":
			if (data.outcome === "failed")
				return data.failure === "search"
					? t`Discovery run failed: the search did not run`
					: data.failure === "extraction"
						? t`Discovery run failed: none of the pages could be read`
						: t`Discovery run failed`;
			return t`Discovery run: ${Number(data.matches ?? 0)} new of ${Number(data.found ?? 0)} found · ${Number(data.duplicates ?? 0)} already known · ${Number(data.rejected ?? 0)} rejected${Number(data.readFailures ?? 0) > 0 ? ` · ${Number(data.readFailures)} unreadable` : ""}`;
		case "job.saved":
			return t`Saved ${job}`;
		case "prep.queued":
			return t`Queued the ${kind} for ${job}`;
		case "prep.started":
			return Number(data.attempt ?? 1) > 1
				? t`Writing the ${kind} for ${job} (attempt ${Number(data.attempt)})`
				: t`Writing the ${kind} for ${job}`;
		case "prep.done":
			return Number(data.gaps ?? 0) > 0
				? t`The ${kind} for ${job} is ready, with ${Number(data.gaps)} gaps for you to fill`
				: t`The ${kind} for ${job} is ready for review`;
		case "prep.retry":
			return t`The ${kind} for ${job} hit a problem. ${reason ?? ""} Trying again ${typeof data.retryAt === "string" ? when(data.retryAt) : t`soon`}.`;
		case "prep.deferred":
			return t`The ${kind} for ${job} is waiting for the daily limit until ${typeof data.until === "string" ? when(data.until) : t`tomorrow`}`;
		case "prep.failed":
			return t`Could not make the ${kind} for ${job}. ${reason ?? ""}`;
		case "prep.canceled":
			return t`The ${kind} for ${job} was canceled. ${reason ?? ""}`;
		case "setting.changed": {
			const what =
				data.what === "discovery" ? t`discovery` : data.what === "resumes" ? t`tailored resumes` : t`cover letters`;
			return data.on ? t`You turned on ${what}` : t`You turned off ${what}`;
		}
		default:
			return event.kind;
	}
}

export const decisionLabel = (decision: "new" | "known" | "rejected" | "unreadable" | "invalid") =>
	({
		new: t`New job`,
		known: t`Already known`,
		rejected: t`Not an open posting`,
		unreadable: t`Could not be read`,
		invalid: t`Unusable address`,
	})[decision];
