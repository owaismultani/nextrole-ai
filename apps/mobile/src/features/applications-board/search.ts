import { create } from "zustand";
import { subscribeIdentity } from "@/auth/session";

/** Shared across application views, cleared when the account changes. */
export const useApplicationSearch = create<{ search: string; setSearch: (search: string) => void }>((set) => ({
	search: "",
	setSearch: (search) => set({ search }),
}));
subscribeIdentity(() => useApplicationSearch.setState({ search: "" }));
