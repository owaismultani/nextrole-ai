// @vitest-environment happy-dom
import type { WorkspaceTabProps } from "./shell";
import type { Application } from "@/features/applications/types";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocumentsTab } from "./documents";
import { InterviewsTab } from "./interviews";

const api = vi.hoisted(() => ({
	data: {} as Record<string, unknown>,
	prepare: vi.fn(),
}));
vi.mock("@/libs/orpc/client", () => {
	const endpoint = (name: string, mutation = vi.fn()) => ({
		key: () => [name],
		queryKey: () => [name],
		queryOptions: () => ({ queryKey: [name], queryFn: async () => api.data[name], staleTime: Infinity }),
		mutationOptions: () => ({ mutationFn: mutation }),
	});
	return {
		orpc: {
			documents: { list: endpoint("documents") },
			career: {
				preparations: endpoint("preparations"),
				applicationJourney: endpoint("journey"),
				prepareDocuments: endpoint("prepareDocuments", api.prepare),
				savedItems: endpoint("savedItems"),
				schedules: endpoint("schedules"),
				retryPreparation: endpoint("retry"),
				regeneratePreparation: endpoint("regenerate"),
			},
		},
	};
});
vi.mock("@tanstack/react-router", () => ({
	useRouteContext: () => ({ session: { user: { id: "tabs-user", timezone: "UTC" } } }),
	Link: ({ children }: { children: ReactNode }) => <a href="#test-link">{children}</a>,
}));
vi.mock("@reactive-resume/ui/components/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("./prepare", () => ({ PrepareTab: () => <p>prepare tool</p> }));
vi.mock("./practise", () => ({ PractiseTab: () => <p>practise tool</p> }));
vi.mock("./debrief", () => ({ DebriefTab: () => <p>debrief tool</p> }));

const application = {
	id: "tabs-application",
	company: "Harbor",
	role: "Engineer",
	status: "saved",
	closedReason: null,
	coverLetterId: null,
	sentResumeVersionId: null,
	sentCoverLetterVersionId: null,
	sentCheckScore: null,
	requirements: [],
	location: null,
	salary: null,
	source: null,
	sourceUrl: null,
	notes: null,
	tags: [],
	contacts: [],
	activity: [],
	appliedAt: new Date("2026-10-08T12:00:00Z"),
	createdAt: new Date("2026-10-08T12:00:00Z"),
	updatedAt: new Date("2026-10-08T12:00:00Z"),
	resumeId: null,
	jobDescription: null,
	postingSource: null,
	matchScore: null,
	aiMetadata: null,
	resumeFileUrl: null,
	resumeFileName: null,
	coverLetterUrl: null,
	coverLetterName: null,
	followUpAt: null,
	followUpNote: null,
} as Application;

const round = {
	id: "round-1",
	type: "interview" as const,
	at: new Date("2030-10-08T10:00:00Z"),
	kind: "technical" as const,
	durationMinutes: 45,
	location: "Video",
	notes: "Reliability discussion",
	audience: "practitioner" as const,
	participants: [{ name: "Alex Example", role: "Technical lead" }],
	timezone: "UTC",
};

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

const tabProps = (patch: Partial<WorkspaceTabProps> = {}): WorkspaceTabProps => ({
	application,
	version: undefined,
	interview: undefined,
	speak: false,
	now: new Date("2026-10-22T12:00:00Z"),
	go: vi.fn(),
	...patch,
});

beforeEach(() => {
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
});

afterEach(() => {
	cleanup();
	for (const client of clients.splice(0)) client.clear();
	api.data = {};
	api.prepare.mockReset();
});

const step = (kind: "resume" | "letter", patch: Record<string, unknown> = {}) => ({
	id: `step-${kind}`,
	kind,
	status: "done",
	error: null,
	issues: [],
	manual: false,
	generation: 1,
	outputId: `${kind}-output`,
	replacedVersionId: null,
	eligibleAt: null,
	completedAt: new Date("2026-10-21T12:00:00Z"),
	baseline: { resumeId: "base", name: "My baseline" },
	stale: false,
	edited: false,
	...patch,
});

it("shows the documents prepared for this application with the baseline they came from", async () => {
	api.data.preparations = [
		{
			opportunityId: "job",
			applicationId: application.id,
			company: "Harbor",
			role: "Engineer",
			summary: "ready",
			steps: [step("resume"), step("letter", { issues: ["Add your notice period"], baseline: null })],
		},
	];
	api.data.journey = { opportunityId: "job", foundAt: new Date(), run: null, events: [] };
	api.data.documents = [];
	renderWith(<DocumentsTab {...tabProps()} />);
	expect(await screen.findByText("Tailored resume")).toBeTruthy();
	expect(screen.getAllByText("Cover letter").length).toBeGreaterThan(0);
	// "Ready" is about the documents; it says nothing about review or the application's stage.
	expect(screen.getByText(/not that you approved them/i)).toBeTruthy();
	expect(screen.getByText(/Made from your baseline/)).toBeTruthy();
	expect(screen.getByText("The baseline it was made from was not recorded.")).toBeTruthy();
	expect(screen.getByText("1 gaps to fill")).toBeTruthy();
});

it("offers to prepare documents only for a job that was found by discovery", async () => {
	api.data.preparations = [];
	api.data.journey = { opportunityId: "job", foundAt: new Date(), run: null, events: [] };
	api.data.documents = [];
	api.prepare.mockResolvedValue({ queued: 2 });
	renderWith(<DocumentsTab {...tabProps()} />);
	fireEvent.click(await screen.findByRole("button", { name: "Prepare documents" }));
	await waitFor(() =>
		expect(api.prepare).toHaveBeenCalledWith(
			{ opportunityIds: ["job"], resume: true, letter: true },
			expect.anything(),
		),
	);
});

it("says documents are not generated for an application added by hand", async () => {
	api.data.preparations = [];
	api.data.journey = null;
	api.data.documents = [];
	renderWith(<DocumentsTab {...tabProps()} />);
	expect(await screen.findByText(/This application was added by hand/)).toBeTruthy();
	expect(screen.queryByRole("button", { name: "Prepare documents" })).toBeNull();
});

it("opens Interviews on the part the round needs and keeps the existing tools in it", async () => {
	api.data.savedItems = [];
	api.data.schedules = [];
	const withRound = { ...application, activity: [{ ...round }] } as Application;
	const onSection = vi.fn();
	const props = {
		...tabProps({ application: withRound, interview: round }),
		section: undefined,
		round,
		onSection,
		onRound: vi.fn(),
		onEditRound: vi.fn(),
	};
	renderWith(<InterviewsTab {...props} />);
	// An upcoming round opens on its preparation.
	expect(await screen.findByText("prepare tool")).toBeTruthy();
	fireEvent.click(screen.getByRole("radio", { name: "Practice" }));
	expect(onSection).toHaveBeenCalledWith("practise");
});

it("keeps application-level preparation reachable when there is no round yet", async () => {
	api.data.savedItems = [];
	api.data.schedules = [];
	const props = {
		...tabProps(),
		section: "practise" as const,
		round: undefined,
		onSection: vi.fn(),
		onRound: vi.fn(),
		onEditRound: vi.fn(),
	};
	renderWith(<InterviewsTab {...props} />);
	expect(await screen.findByText("practise tool")).toBeTruthy();
	expect(screen.getByText(/preparation and practice work for the application as a whole/)).toBeTruthy();
});
