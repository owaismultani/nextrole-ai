import { createContext, use } from "react";

type AutomationState = {
	/** Opens a schedule (or "new:discovery") in the shared schedule editor. */
	onEditSearch: (schedule: string) => void;
	/** Schedules deleted but still within their Undo window. */
	deleted: string[];
};

const AutomationContext = createContext<AutomationState | null>(null);

export const AutomationProvider = AutomationContext.Provider;

export function useAutomation() {
	const value = use(AutomationContext);
	if (!value) throw new Error("useAutomation must be used inside Automation.");
	return value;
}
