import type { SavedItem } from "./hooks";
import type { Application } from "@/features/applications/types";
import type { PreparationSummary, WorkspaceAction } from "@reactive-resume/schema/career-run";
import { t } from "@lingui/core/macro";
import { workspaceAction } from "@reactive-resume/schema/career-run";
import { useApplicationPreparation, useSavedItems } from "./hooks";
import { getNextStep } from "@/features/applications/next-step";

export type WorkspaceState = {
	/** Documents prepared for this application. `none`: nothing was ever prepared; `loading`: not known yet. */
	preparation: PreparationSummary | "none" | "loading";
	offers: SavedItem[];
	action: WorkspaceAction;
};

/**
 * What an application's documents, offers and schedule add up to, shared by the header and the Summary so both offer the
 * same primary action. Document preparation is about the documents only, never the application's stage.
 */
export function useWorkspaceState(application: Application, now: Date): WorkspaceState {
	const preparation = useApplicationPreparation(application.id);
	const saved = useSavedItems(application.id);
	const offers = (saved.data ?? []).filter((item) => item.data.kind === "offer");
	const step = getNextStep(application, now);
	const summary = preparation.data ? (preparation.data[0]?.summary ?? "none") : "loading";
	const action = workspaceAction({
		status: application.status,
		preparation: summary === "loading" || summary === "skipped" ? "none" : summary,
		interviewUpcoming: step.kind === "interview",
		followUpDue: step.kind === "follow-up" ? step.overdue : step.kind === "no-reply",
		hasOffer: offers.length > 0,
		hasFit: (saved.data ?? []).some((item) => item.data.kind === "fit"),
	});
	return { preparation: summary, offers, action };
}

/** The words for the primary action, or null when there is nothing to do. */
export function actionLabel(action: WorkspaceAction) {
	switch (action.kind) {
		case "resolve-missing":
			return t`Resolve missing information`;
		case "add-offer":
			return t`Add offer`;
		case "review-offer":
			return t`Review offer`;
		case "prepare-interview":
			return t`Prepare interview`;
		case "follow-up":
			return t`Follow up`;
		case "review-documents":
			return t`Review documents`;
		case "check-fit":
			return t`Check fit`;
		case "none":
			return null;
	}
}

/** Where documents stand, apart from the application's stage. */
export function preparationLabel(preparation: WorkspaceState["preparation"]) {
	if (preparation === "loading") return null;
	if (preparation === "none" || preparation === "skipped") return t`No documents prepared`;
	if (preparation === "ready") return t`Documents ready`;
	return {
		queued: t`Queued`,
		generating: t`Generating`,
		attention: t`Needs attention`,
		deferred: t`Waiting for the daily limit`,
	}[preparation];
}
