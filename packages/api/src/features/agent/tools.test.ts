import type { ReadPageOutput } from "@reactive-resume/ai/tools/agent-tool-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAgentInstructions, buildAgentTools, MAX_AGENT_WEB_CALLS } from "./tools";

const page: ReadPageOutput = {
	requestedUrl: "https://example.com/job",
	content: "Job description",
	format: "text",
	retrievedAt: "2026-09-30T12:00:00Z",
	method: "builtin",
	truncated: false,
	completeness: "unknown",
};
type ToolConfig = Parameters<typeof buildAgentTools>[0];

function build(externalSearch = false, signal = new AbortController().signal) {
	const handlers = {
		readDocument: vi.fn(async () => ({ text: "Resume" })),
		readAttachment: vi.fn(async () => ({})),
		proposeEdits: vi.fn(async () => ({})),
		searchWeb: vi.fn<ToolConfig["handlers"]["searchWeb"]>(async () => [
			{ url: "https://example.com/job", title: "Job" },
		]),
		readPage: vi.fn<ToolConfig["handlers"]["readPage"]>(async () => page),
	};
	return {
		handlers,
		tools: buildAgentTools({
			document: "resume",
			externalSearch,
			signal,
			handlers,
		}),
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});
const options = { toolCallId: "call", messages: [] };
function execute(tools: ReturnType<typeof buildAgentTools>, name: string, input: unknown) {
	const run = tools[name]?.execute;
	if (!run) throw new Error(`Missing executable tool ${name}`);
	return (run as unknown as (input: unknown, executionOptions: typeof options) => unknown)(input, options);
}

describe("assistant web tools", () => {
	it("respects an explicit connection while keeping reading available without search credentials", async () => {
		const fallback = build();
		expect(fallback.tools.web_search).toBeUndefined();
		expect(fallback.tools.google_search).toBeUndefined();
		expect(fallback.tools.search_web).toBeUndefined();
		expect(await execute(fallback.tools, "read_page", { url: page.requestedUrl })).toEqual(page);
		const external = build(true);
		expect(external.tools.web_search).toBeUndefined();
		expect(await execute(external.tools, "search_web", { query: "Example company" })).toEqual([
			{ url: "https://example.com/job", title: "Job" },
		]);
		expect(external.handlers.searchWeb).toHaveBeenCalledWith("Example company", expect.any(AbortSignal));
	});

	it("shares one allowance across reading and search", async () => {
		const calls = MAX_AGENT_WEB_CALLS;
		const { tools, handlers } = build(true);
		for (let i = 0; i < calls - 1; i++) await execute(tools, "read_page", { url: page.requestedUrl });
		await execute(tools, "search_web", { query: "Company" });
		await expect(async () => execute(tools, "read_page", { url: page.requestedUrl })).rejects.toThrow(
			"Web access limit",
		);
		await expect(async () => execute(tools, "search_web", { query: "Company follow-up" })).rejects.toThrow(
			"Web access limit",
		);
		expect(handlers.readPage).toHaveBeenCalledTimes(calls - 1);
		expect(handlers.searchWeb).toHaveBeenCalledTimes(1);
	});

	it("never starts an aborted request", async () => {
		const controller = new AbortController();
		const pending = build(true, controller.signal);
		controller.abort(new DOMException("Stopped", "AbortError"));
		await expect(async () => execute(pending.tools, "search_web", { query: "Company" })).rejects.toThrow("Stopped");
		expect(pending.handlers.searchWeb).not.toHaveBeenCalled();
	});

	it("describes reader-only capabilities truthfully and names the selected search tool", () => {
		const reader = buildAgentInstructions({
			document: null,
			posting: null,
			searchTool: null,
			canReadPage: true,
		});
		expect(reader).toContain("Web search is unavailable");
		expect(reader).toContain("Use `read_page`");
		expect(reader).not.toContain("can't browse");
		expect(
			buildAgentInstructions({
				document: null,
				posting: null,
				searchTool: "search_web",
				canReadPage: true,
			}),
		).toContain("Use `search_web`");
	});
});
