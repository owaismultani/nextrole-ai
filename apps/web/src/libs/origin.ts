import { t } from "@lingui/core/macro";

/** An application's own address, whichever tab it is on. */
const WORKSPACE = /^\/dashboard\/applications\/(?!offers(?:\/|$))[^/]+/;

let origin: { href: string; pathname: string } | null = null;
let library: string | null = null;

type Location = { href: string; pathname: string };

/**
 * Remembers the page a person came from when they open an application, with its filters and view, so the workspace can
 * take them back to the same list. Moving between an application's own tabs does not change it.
 */
export function rememberOrigin(from: Location | undefined, to: Location) {
	// Opening an editor from the Documents library remembers the library view (scope, search, tags) it was opened from.
	if (from?.pathname === "/dashboard/documents" && to.pathname.startsWith("/builder/")) library = from.href;
	if (!from || WORKSPACE.test(from.pathname) || !WORKSPACE.test(to.pathname)) return;
	origin = { href: from.href, pathname: from.pathname };
}

/** Where "back to documents" goes from an editor: the library view it was opened from, or the library. */
export const libraryTarget = () => library ?? "/dashboard/documents";

/** Where "back" goes from an application: the page it was opened from, or the applications list. */
export function returnTarget(): { href: string; label: string } {
	const fallback = { href: "/dashboard/applications", label: t`Applications` };
	if (!origin) return fallback;
	const { href, pathname } = origin;
	if (pathname.startsWith("/dashboard/overview")) return { href, label: t`Overview` };
	if (pathname.startsWith("/dashboard/discover")) return { href, label: t`Discover` };
	if (pathname.startsWith("/dashboard/applications")) return { href, label: t`Applications` };
	if (pathname.startsWith("/dashboard/automation")) return { href, label: t`Automation` };
	return fallback;
}
