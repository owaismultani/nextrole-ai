// Typed hrefs for every screen under app/. Navigate with these instead of writing paths by hand, so a route move
// is one change here. Ids and slugs are URL-encoded.
import type { InterviewSection, WorkspaceTab } from "@reactive-resume/schema/career";
import { resolveWorkspaceTab } from "@reactive-resume/schema/career";

export type BuilderPane = "write" | "page" | "design" | "check";
export type LetterPane = "write" | "page" | "design";
export type DiscoverView = "jobs" | "activity" | "dismissed";
export type KnowledgeSection = "facts" | "stories";
export type SettingsPane = "account" | "preferences" | "ai" | "security" | "developer";
export type ApplicationTab = WorkspaceTab;
/** A workspace tab, or a former tab name that now means a tab and an interview section. */
export type ApplicationTarget = WorkspaceTab | "fit" | "apply" | "prepare" | "practise" | "debrief";
export type ApplicationSearch = { section?: InterviewSection | undefined; round?: string | undefined };
/** The Applications tab's views; List is the tab's index. */
export type ApplicationsView = "list" | "board" | "calendar" | "insights";

const segment = (value: string) => encodeURIComponent(value);

export const routes = {
	// (auth)
	server: () => "/server" as const,
	signIn: () => "/sign-in" as const,

	// (tabs)
	documents: () => "/documents" as const,
	trash: () => "/documents/trash" as const,
	applications: (view: ApplicationsView = "list") =>
		view === "list" ? ("/applications" as const) : (`/applications/${view}` as const),
	overview: () => "/overview" as const,
	discover: (view: DiscoverView = "jobs") =>
		view === "jobs" ? ("/discover" as const) : (`/discover/${view}` as const),
	knowledge: (section: KnowledgeSection = "facts") => `/knowledge/${section}` as const,
	coach: () => "/coach" as const,
	automation: () => "/automation" as const,
	/** The phone's overflow tab: Profile, Coach, Automation, Settings and Trash. */
	more: () => "/more" as const,
	offers: () => "/applications/offers" as const,
	settings: (pane?: SettingsPane) => (pane ? (`/settings/${pane}` as const) : ("/settings" as const)),

	// Modals and full-screen flows
	new: () => "/new" as const,
	search: () => "/search" as const,
	setup: () => "/setup" as const,
	atsChecker: () => "/ats-checker" as const,
	application: (id: string, target: ApplicationTarget = "summary", search: ApplicationSearch = {}) => {
		const { tab, section } = resolveWorkspaceTab(target) ?? { tab: "summary" as const, section: undefined };
		const query = [
			(search.section ?? section) ? `section=${search.section ?? section}` : "",
			search.round ? `round=${encodeURIComponent(search.round)}` : "",
		].filter(Boolean);
		return `/applications/${segment(id)}/${tab}${query.length > 0 ? `?${query.join("&")}` : ""}` as const;
	},
	/** The application detail; it shares the dynamic `[tab]` route with the workspace tabs. */
	applicationDetails: (id: string) => `/applications/${segment(id)}/details` as const,
	publicResume: (username: string, slug: string) => `/r/${segment(username)}/${segment(slug)}` as const,

	// Resume builder
	builder: (id: string, pane: BuilderPane = "write") => `/builder/${segment(id)}/${pane}` as const,
	/** `section` is a built-in section key or a custom section id; `item` is the entry id. */
	entry: (id: string, section: string, item: string) =>
		`/builder/${segment(id)}/entry/${segment(section)}/${segment(item)}` as const,
	share: (id: string) => `/builder/${segment(id)}/share` as const,
	/** `version` opens History on that version, read-only (Applications' "What you sent"). */
	history: (id: string, version?: string) =>
		version
			? (`/builder/${segment(id)}/history?version=${segment(version)}` as const)
			: (`/builder/${segment(id)}/history` as const),
	assistant: (id: string) => `/builder/${segment(id)}/assistant` as const,

	letterAssistant: (id: string) => `/letter/${segment(id)}/assistant` as const,

	// Cover letter editor
	/** `version` opens Share & export's History on that version, read-only (Applications' "What you sent"). */
	letter: (id: string, pane: LetterPane = "write", version?: string) =>
		version
			? (`/letter/${segment(id)}/${pane}?version=${segment(version)}` as const)
			: (`/letter/${segment(id)}/${pane}` as const),
};

export type AppHref = ReturnType<(typeof routes)[keyof typeof routes]>;
