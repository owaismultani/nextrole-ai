import { createContext, useContext } from "react";

type DiscoverState = {
	/** Schedules deleted but still within their Undo window. */
	deleted: string[];
	/** Opens the saved search in the shared editor ("new:discovery" starts one), or closes it with undefined. */
	onScheduleChange: (schedule: string | undefined) => void;
};

const DiscoverContext = createContext<DiscoverState | null>(null);

export const DiscoverProvider = DiscoverContext.Provider;

export function useDiscover() {
	const value = useContext(DiscoverContext);
	if (!value) throw new Error("useDiscover must be used inside Discover.");
	return value;
}
