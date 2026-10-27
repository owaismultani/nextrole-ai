// @vitest-environment happy-dom
import type { Application } from "@/features/applications/types";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OverviewRail } from "./overview-rail";

const api = vi.hoisted(() => ({ documents: vi.fn() }));
vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		documents: {
			list: { queryOptions: () => ({ queryKey: ["documents"], queryFn: () => api.documents(), staleTime: Infinity }) },
		},
	},
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="#test-link">{children}</a>,
}));
vi.mock("../shared", () => ({
	Eyebrow: ({ children }: { children: ReactNode }) => <p>{children}</p>,
	useCareerTime: () => ({ date: (value: Date | string) => String(value) }),
}));
vi.mock("@/features/applications/components/detail/key-facts", () => ({ KeyFacts: () => null, Tags: () => null }));
vi.mock("@/features/applications/components/application-notes", () => ({ ApplicationNotes: () => null }));

const application = {
	id: "rail-application",
	company: "Harbor",
	role: "Engineer",
	status: "saved",
	activity: [],
	contacts: [],
	tags: [],
	followUpAt: null,
	appliedAt: new Date("2026-10-01T00:00:00Z"),
	resumeId: "linked-resume",
	coverLetterId: null,
	sentResumeVersionId: null,
	sentCoverLetterVersionId: null,
} as unknown as Application;

const clients: QueryClient[] = [];
function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(client);
	return render(
		<QueryClientProvider client={client}>
			<I18nProvider i18n={i18n}>
				<OverviewRail application={application} interview={undefined} now={new Date("2026-10-22T12:00:00Z")} />
			</I18nProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => i18n.loadAndActivate({ locale: "en-US", messages: {} }));
afterEach(() => {
	cleanup();
	for (const client of clients.splice(0)) client.clear();
	api.documents.mockReset();
});

it("explains a missing linked document during loading and offers retry after failure", async () => {
	let reject = (_error: Error) => {};
	api.documents.mockReturnValueOnce(
		new Promise((_resolve, fail) => {
			reject = fail;
		}),
	);
	mount();
	expect(screen.getByText("Loading linked documents…")).toHaveAttribute("role", "status");
	await act(async () => reject(new Error("Offline")));
	expect(await screen.findByRole("alert")).toHaveTextContent("Linked documents couldn't be loaded");
	api.documents.mockResolvedValue([{ id: "linked-resume", type: "resume", name: "Harbor resume" }]);
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	await waitFor(() => expect(screen.getByRole("link", { name: /Harbor resume/ })).toBeTruthy());
});
