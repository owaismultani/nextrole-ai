import type { Schedule } from "../career/hooks";
import { createContext, use } from "react";

type DiscoverState = {
	/** Opens the saved search in the shared editor, or a new discovery schedule when there is none. */
	edit: (schedule: Schedule | null) => void;
	/** Schedules deleted but still within their Undo window. */
	hidden: string[];
};

const DiscoverContext = createContext<DiscoverState | null>(null);

export const DiscoverProvider = DiscoverContext.Provider;

export function useDiscover() {
	const value = use(DiscoverContext);
	if (!value) throw new Error("useDiscover must be used inside Discover.");
	return value;
}
