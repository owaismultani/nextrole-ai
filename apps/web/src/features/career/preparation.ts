import type { PreparationError } from "@reactive-resume/schema/career";
import type { PreparationSummary } from "@reactive-resume/schema/career-run";
import { t } from "@lingui/core/macro";

/** Where a job's documents stand. This is about the documents only, never the application's own status. */
export const summaryLabel = (summary: PreparationSummary) =>
	({
		queued: t`Queued`,
		generating: t`Generating`,
		attention: t`Needs attention`,
		ready: t`Ready for review`,
		skipped: t`Skipped`,
		deferred: t`Waiting for the daily limit`,
	})[summary];

/** Why a document step stopped or is waiting, with what to do about it. */
export function stepMessage(code: PreparationError | null) {
	switch (code) {
		case "setting-off":
			return t`Canceled because this was turned off in Automation.`;
		case "daily-limit":
			return t`Waiting for the daily limit to reset.`;
		case "no-baseline":
			return t`Choose a baseline resume in Automation.`;
		case "no-description":
			return t`This job has no description to work from.`;
		case "no-ai":
			return t`Connect and test an AI provider in Settings → AI & developer.`;
		case "provider":
			return t`The AI provider did not respond. It tries again on its own.`;
		case "rate-limit":
			return t`The AI provider asked for a pause. It tries again on its own.`;
		case "invalid-output":
			return t`The AI reply could not be used.`;
		case "unknown":
			return t`Something went wrong.`;
		default:
			return null;
	}
}
