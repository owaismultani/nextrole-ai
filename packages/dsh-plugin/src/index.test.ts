import { expect, it, vi } from "vitest";
import { Config } from "./config";
import { apply } from "./index";

/** Minimal stand-in for the parts of the Cordis context `apply` touches. */
function fakeContext() {
	return {
		plugin: vi.fn(async (_plugin: unknown, _config: unknown) => undefined),
		systemPrompt: { section: vi.fn(() => () => undefined) },
		logger: { warn: vi.fn() },
	};
}

it("mounts the MCP bridge with streamable-http and the api key header", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({ apiKey: "test-key" }));

	expect(ctx.plugin).toHaveBeenCalledTimes(1);
	expect(ctx.plugin.mock.calls[0]?.[1]).toEqual({
		transport: "streamable-http",
		serverName: "resume",
		url: "https://rxresu.me/mcp",
		headers: { "x-api-key": "test-key" },
		toolCallTimeoutMs: 60_000,
		failOnStartupError: true,
	});
});

it("strips a trailing slash from the configured url", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({ apiKey: "test-key", url: "http://localhost:3000/" }));

	expect(ctx.plugin.mock.calls[0]?.[1]).toMatchObject({ url: "http://localhost:3000/mcp" });
});

it("mounts nothing when no apiKey is configured, so an unconfigured install still boots", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({}));

	expect(ctx.plugin).not.toHaveBeenCalled();
	expect(ctx.systemPrompt.section).not.toHaveBeenCalled();
	expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
});
