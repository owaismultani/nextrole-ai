// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Notifications } from "./notifications";

const api = vi.hoisted(() => ({
	notifications: [] as unknown[],
	push: vi.fn(),
	navigate: vi.fn(),
	markRead: vi.fn(),
}));
vi.mock("@/libs/orpc/client", () => {
	const endpoint = (name: string, data?: () => unknown, mutation = vi.fn()) => ({
		key: () => [name],
		queryKey: () => [name],
		queryOptions: () => ({ queryKey: [name], queryFn: async () => data?.() ?? [], staleTime: Infinity }),
		mutationOptions: () => ({ mutationFn: mutation }),
	});
	return {
		orpc: {
			applications: { list: endpoint("applications") },
			career: {
				notifications: endpoint("notifications", () => api.notifications),
				markNotificationRead: endpoint("markRead", undefined, api.markRead),
				profile: endpoint("profile", () => ({ timezone: "UTC" })),
			},
		},
	};
});
vi.mock("@/features/applications/queries", () => ({
	applicationsListQueryOptions: () => ({ queryKey: ["applications"], queryFn: async () => [] }),
}));
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ navigate: api.navigate, history: { push: api.push } }),
	useRouteContext: () => ({ session: { user: { id: "notice-user", timezone: "UTC" } } }),
}));
vi.mock("@/features/career/shared", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/features/career/shared")>()),
	CollapseRow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	Swap: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	// The undo window is a toast; here the change is committed straight away.
	withUndo: ({ commit }: { commit: () => void }) => commit(),
}));
vi.mock("@reactive-resume/ui/components/toast", () => ({ toast: { add: vi.fn() } }));

const note = (id: string, notice: Record<string, unknown>, patch: Record<string, unknown> = {}) => ({
	id,
	title: `Title ${id}`,
	body: `Body ${id}`,
	notice,
	url: null,
	applicationId: null,
	readAt: null,
	createdAt: new Date("2026-10-22T12:00:00Z"),
	...patch,
});

const clients: QueryClient[] = [];
function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(client);
	return render(
		<QueryClientProvider client={client}>
			<I18nProvider i18n={i18n}>
				<Notifications />
			</I18nProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => i18n.loadAndActivate({ locale: "en-US", messages: {} }));
afterEach(() => {
	cleanup();
	for (const client of clients.splice(0)) client.clear();
	api.notifications = [];
	api.push.mockReset();
	api.navigate.mockReset();
	api.markRead.mockReset();
});

it("gives every kind of notification an action that recovers it", async () => {
	api.notifications = [
		note("roles", { type: "opportunities", count: 2, query: "q" }),
		note("failed", { type: "schedule-failed", reason: "failed" }, { url: "/dashboard/automation?schedule=s1" }),
		note("email", { type: "email-failed" }, { url: "/dashboard/settings/account" }),
		note("paused", { type: "briefing-paused" }, { url: "/dashboard/automation?schedule=s2", applicationId: "a1" }),
		note(
			"briefing",
			{ type: "briefing", company: "Harbor", role: "Engineer" },
			{ url: "/dashboard/applications/a1/interviews?section=prepare" },
		),
	];
	mount();

	fireEvent.click(await screen.findByRole("button", { name: "Review" }));
	expect(api.navigate).toHaveBeenCalledWith({ to: "/dashboard/discover" });

	fireEvent.click(screen.getByRole("button", { name: "Open schedule" }));
	expect(api.push).toHaveBeenCalledWith("/dashboard/automation?schedule=s1");
	fireEvent.click(screen.getByRole("button", { name: "Check settings" }));
	expect(api.push).toHaveBeenCalledWith("/dashboard/settings/account");
	fireEvent.click(screen.getByRole("button", { name: "Choose a new time" }));
	expect(api.push).toHaveBeenCalledWith("/dashboard/automation?schedule=s2");
	fireEvent.click(screen.getByRole("button", { name: "Open briefing" }));
	expect(api.push).toHaveBeenCalledWith("/dashboard/applications/a1/interviews?section=prepare");
});

it("never follows a link that leaves the app", async () => {
	api.notifications = [note("odd", { type: "email-failed" }, { url: "https://elsewhere.example/phish" })];
	mount();
	expect(await screen.findByText("Title odd")).toBeTruthy();
	expect(screen.queryByRole("button", { name: "Check settings" })).toBeNull();
});

it("marks one as read, and shows read ones again on request", async () => {
	api.markRead.mockResolvedValue(undefined);
	api.notifications = [
		note("one", { type: "email-failed" }, { url: "/dashboard/settings/account" }),
		note(
			"old",
			{ type: "email-failed" },
			{ url: "/dashboard/settings/account", readAt: new Date("2026-10-21T12:00:00Z") },
		),
	];
	mount();
	fireEvent.click(await screen.findByRole("button", { name: "Mark as read" }));
	await waitFor(() => expect(api.markRead).toHaveBeenCalledWith({ id: "one" }, expect.anything()));
	// Everything is read now; the read ones can be brought back.
	fireEvent.click(await screen.findByRole("button", { name: /Show 2 read/ }));
	expect(await screen.findByText("Title old")).toBeTruthy();
});
