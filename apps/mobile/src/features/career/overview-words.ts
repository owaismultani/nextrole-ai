import type { RouterOutput } from "@/api/client";
import { t } from "@lingui/core/macro";

type Overview = RouterOutput["career"]["overview"];
export type Action = Overview["actions"]["items"][number];

export const documentName = (kind: "resume" | "letter") => (kind === "resume" ? t`Resume` : t`Cover letter`);

export const interviewKindLabel = (kind: string) =>
	kind === "technical"
		? t`Technical interview`
		: kind === "behavioral"
			? t`Behavioral interview`
			: kind === "onsite"
				? t`Onsite interview`
				: kind === "screening"
					? t`Screening call`
					: t`Interview`;

export type ActionInfo = {
	chip: string;
	tone: "accentText" | "warnText" | "infoText";
	line: string;
	button: string;
	/** Where the button goes: document preparation in Automation, or the application. */
	to: "automation" | "application";
};

/** The chip, the line under it and the button for one action. */
export function describeAction(action: Action): ActionInfo {
	const done = action.done.map(documentName).join(" · ");
	if (action.kind === "issue") {
		const failed = action.failed.map(documentName).join(" · ");
		const failure = t`${failed} generation failed`;
		return {
			chip: t`${failed} needs attention`,
			tone: "warnText",
			line: done ? `${t`${done} ready`} · ${failure}` : failure,
			button: t`Resolve`,
			to: "automation",
		};
	}
	if (action.kind === "followup") {
		const days = action.followUpInDays ?? 0;
		const absolute = Math.abs(days);
		const due =
			days === 0
				? t`Follow-up due today`
				: days === -1
					? t`Follow-up due yesterday`
					: days < 0
						? t`Follow-up due ${absolute} days ago`
						: days === 1
							? t`Follow-up due tomorrow`
							: t`Follow-up due in ${days} days`;
		const applied = action.appliedDaysAgo;
		return {
			chip: action.code === "overdue" ? t`Follow-up overdue` : t`Follow-up due`,
			tone: "warnText",
			line: applied === null ? due : `${t`Applied ${applied} days ago`} · ${due}`,
			button: t`Follow up`,
			to: "application",
		};
	}
	if (action.kind === "stale")
		return {
			chip: t`Drafts need updating`,
			tone: "infoText",
			line: t`Your resume or the posting changed since generation`,
			button: t`Review changes`,
			to: "application",
		};
	return {
		chip: t`Documents ready`,
		tone: "accentText",
		line: action.done.length === 2 ? t`Resume and cover letter prepared` : t`${done} prepared`,
		button: t`Review`,
		to: "application",
	};
}

export type Recent = {
	key: string;
	title: string;
	sub: string;
	at: Date;
	label: string;
	open: "discover" | "activity" | "automation";
};

/** Turns the raw log into a few readable lines: searches, documents prepared per job, failures, and pauses. */
export function summarizeRecent(events: RouterOutput["career"]["activity"]["items"]): Recent[] {
	const out: Recent[] = [];
	const documents = new Map<string, { item: Recent; kinds: string[] }>();
	for (const event of events) {
		const company = typeof event.data.company === "string" && event.data.company ? event.data.company : t`a job`;
		const kind = event.data.kind === "letter" ? t`Cover letter` : t`Resume`;
		if (event.kind === "run.finished") {
			const matches = Number(event.data.matches ?? 0);
			if (event.data.outcome === "failed")
				out.push({
					key: event.id,
					title: t`Discovery run failed`,
					sub: t`Needs attention`,
					at: event.at,
					label: t`Resolve`,
					open: "activity",
				});
			else if (matches > 0)
				out.push({
					key: event.id,
					title: matches === 1 ? t`1 new job saved` : t`${matches} new jobs saved`,
					sub: t`Latest search`,
					at: event.at,
					label: t`View jobs`,
					open: "discover",
				});
		} else if (event.kind === "prep.done" && event.opportunityId) {
			const existing = documents.get(event.opportunityId);
			if (existing) existing.kinds.push(kind);
			else {
				const item: Recent = {
					key: event.id,
					title: t`Documents prepared for ${company}`,
					sub: "",
					at: event.at,
					label: t`Review`,
					open: "automation",
				};
				documents.set(event.opportunityId, { item, kinds: [kind] });
				out.push(item);
			}
		} else if (event.kind === "prep.failed")
			out.push({
				key: event.id,
				title: t`${kind} generation failed for ${company}`,
				sub: t`Needs attention`,
				at: event.at,
				label: t`Resolve`,
				open: "automation",
			});
		else if (event.kind === "setting.changed" && event.data.what === "discovery")
			out.push({
				key: event.id,
				title: event.data.on ? t`Discovery resumed` : t`Discovery paused`,
				sub: event.data.on ? t`Searching again` : t`Resume anytime`,
				at: event.at,
				label: t`Activity`,
				open: "activity",
			});
	}
	for (const { item, kinds } of documents.values()) item.sub = [...new Set(kinds)].toReversed().join(` ${t`and`} `);
	return out.slice(0, 4);
}
