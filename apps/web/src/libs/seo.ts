import { t } from "@lingui/core/macro";

/**
 * The server writes every page's canonical link, hreflang alternates, social cards and site-wide structured data into
 * the HTML it sends (apps/server/src/static/web.ts), so crawlers that never run JavaScript see them. Routes only set
 * what changes as the visitor navigates: the title, the description and, where needed, `noindex`.
 */

const appName = "Reactive Resume";

export const createNoindexFollowMeta = () => ({ name: "robots", content: "noindex, follow" });

/** The homepage's title and description in the active locale. The prerendered page and the route share them. */
export const getHomepageMeta = () => ({
	title: `NextRole AI — ${t`A career team that works while you sleep`}`,
	description: t`Free, open-source AI job search crew: finds roles on your schedule, tailors resumes, letters and answers, coaches interviews and weighs offers. You decide every step.`,
});

/** The ATS checker's title and description in the active locale. The prerendered page and the route share them. */
export const getAtsCheckerMeta = () => ({
	title: `${t`Free ATS resume checker`} — ${appName}`,
	// Keep under ~120 characters so Google's mobile SERP snippet is not truncated at 3 lines.
	description: t`Check whether software can read your resume PDF. Runs entirely in your browser, so your file is never uploaded.`,
});
