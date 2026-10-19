import { useSyncExternalStore } from "react";

/** Design-system breakpoints: mobile < 640, tablet 640–1023, desktop ≥ 1024, wide ≥ 1280. */
export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

const QUERIES = {
	tablet: "(min-width: 640px)",
	desktop: "(min-width: 1024px)",
	wide: "(min-width: 1280px)",
} as const;

function readBreakpoint(): Breakpoint {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
	if (window.matchMedia(QUERIES.wide).matches) return "wide";
	if (window.matchMedia(QUERIES.desktop).matches) return "desktop";
	if (window.matchMedia(QUERIES.tablet).matches) return "tablet";
	return "mobile";
}

function subscribe(onChange: () => void) {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};

	const lists = Object.values(QUERIES).map((query) => window.matchMedia(query));
	for (const list of lists) list.addEventListener("change", onChange);
	return () => {
		for (const list of lists) list.removeEventListener("change", onChange);
	};
}

export function useBreakpoint(): Breakpoint {
	return useSyncExternalStore(subscribe, readBreakpoint, () => "desktop");
}
