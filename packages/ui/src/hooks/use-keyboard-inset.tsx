import { useSyncExternalStore } from "react";

/**
 * How far the on-screen keyboard (or anything else that shrinks the visual viewport) covers the bottom of the
 * layout viewport, in CSS pixels. A `position: fixed` bar with this as its `bottom` sits just above the keyboard.
 */
export function useKeyboardInset() {
	return useSyncExternalStore(subscribe, readInset, () => 0);
}

function readInset() {
	const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
	if (!viewport) return 0;
	return Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
}

function subscribe(onChange: () => void) {
	const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
	if (!viewport) return () => {};
	viewport.addEventListener("resize", onChange);
	viewport.addEventListener("scroll", onChange);
	return () => {
		viewport.removeEventListener("resize", onChange);
		viewport.removeEventListener("scroll", onChange);
	};
}
