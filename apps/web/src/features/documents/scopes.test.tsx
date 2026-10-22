import type { DocumentSummary } from "./filter";
// @vitest-environment happy-dom
import type { DocumentOrigin } from "./scopes";
import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApplicationGroups } from "./scopes";

const api = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock("@/libs/orpc/client", () => {
	const endpoint = (name: string) => ({
		key: () => [name],
		queryKey: () => [name],
		queryOptions: () => ({ queryKey: [name], queryFn: async () => api.data[name], staleTime: Infinity }),
	});
	return {
		orpc: {
			applications: { list: endpoint("applications") },
			career: { setup: endpoint("setup"), automation: endpoint("automation"), documentOrigins: endpoint("origins") },
		},
	};
});
vi.mock("@/features/applications/queries", () => ({
	applicationsListQueryOptions: () => ({ queryKey: ["applications"], queryFn: async () => api.data.applications }),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="#test-link">{children}</a>,
}));

const document = (patch: Partial<DocumentSummary> & Pick<DocumentSummary, "id" | "type" | "name">): DocumentSummary =>
	({
		tags: [],
		isLocked: false,
		isPublic: false,
		slug: null,
		trashedAt: null,
		createdAt: new Date("2026-10-01T00:00:00Z"),
		updatedAt: new Date("2026-10-02T00:00:00Z"),
		application: null,
		...patch,
	}) as DocumentSummary;
const origin = (patch: Partial<DocumentOrigin> & Pick<DocumentOrigin, "documentId" | "kind">): DocumentOrigin => ({
	applicationId: null,
	summary: "ready",
	baseline: { resumeId: "base", name: "My baseline" },
	stale: false,
	edited: false,
	madeAt: null,
	...patch,
});

const clients: QueryClient[] = [];
function renderWith(node: ReactNode) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(client);
	return render(
		<QueryClientProvider client={client}>
			<I18nProvider i18n={i18n}>{node}</I18nProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => i18n.loadAndActivate({ locale: "en-US", messages: {} }));
afterEach(() => {
	cleanup();
	for (const client of clients.splice(0)) client.clear();
	api.data = {};
});

it("groups by application, not by company name, and says where each document came from", async () => {
	api.data.applications = [];
	const harborA = { id: "app-a", company: "Harbor", role: "Engineer" };
	const harborB = { id: "app-b", company: "Harbor", role: "Designer" };
	const documents = [
		document({ id: "r1", type: "resume", name: "Engineer resume", application: harborA }),
		document({ id: "l1", type: "letter", name: "Engineer letter", application: harborA }),
		document({ id: "r2", type: "resume", name: "Designer resume", application: harborB }),
	];
	const origins = new Map([
		["r1", origin({ documentId: "r1", kind: "resume", applicationId: "app-a" })],
		["l1", origin({ documentId: "l1", kind: "letter", applicationId: "app-a", baseline: null, stale: true })],
	]);
	renderWith(<ApplicationGroups documents={documents} origins={origins} />);

	// Two applications at the same company stay two groups, each with its full role.
	const groups = await screen
		.findAllByRole("listitem", {}, { timeout: 2000 })
		.then((items) => items.filter((item) => item.querySelector("h2")));
	expect(groups.map((group) => within(group).getByRole("heading").textContent)).toEqual([
		"Engineer · Harbor",
		"Designer · Harbor",
	]);
	const first = groups[0];
	if (!first) throw new Error("Expected a group.");
	expect(within(first).getByText("Prepared from “My baseline”")).toBeTruthy();
	// A document without a recorded baseline is unknown, not guessed.
	expect(within(first).getByText("Prepared for this job · baseline not recorded")).toBeTruthy();
	expect(within(first).getByText("Out of date")).toBeTruthy();
	// A document you made yourself says so, and has no letter to show.
	const second = groups[1];
	if (!second) throw new Error("Expected a second group.");
	expect(within(second).getByText("Made by you")).toBeTruthy();
	expect(within(second).getByText("No cover letter for this application")).toBeTruthy();
});
