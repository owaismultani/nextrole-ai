import type { PromptSection } from "@deepseek-ai/dsh-system-prompt";
import { expect, it, vi } from "vitest";
import { Config } from "./config";
import { apply } from "./index";

function fakeContext() {
	return {
		plugin: vi.fn(async (_plugin: unknown, _config: unknown) => undefined),
		systemPrompt: { section: vi.fn((_section: PromptSection) => () => undefined) },
	};
}

it("names the tools it references with the configured namespace", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({ apiKey: "test-key", serverName: "rr" }));

	const section = ctx.systemPrompt.section.mock.calls[0]?.[0] as PromptSection;
	expect(section.name).toBe("reactive-resume:rr");
	expect(section.text).toContain("mcp__rr__read_resume");
	expect(section.text).not.toContain("mcp__resume__read_resume");
});
