import { describe, expect, it } from "vitest";
import { buildMcpServerCard } from "./mcp-server-card";

describe("buildMcpServerCard", () => {
	const card = buildMcpServerCard("1.2.3");

	it("declares a JSON Schema input for every tool", () => {
		for (const tool of card.tools) {
			expect(tool.inputSchema, tool.name).toBeDefined();
			expect(tool.annotations, tool.name).toBeDefined();
			expect(tool.title.length, tool.name).toBeGreaterThan(0);
			// Connector directories reject tools without annotations.title.
			expect(tool.annotations.title, tool.name).toBe(tool.title);
			expect(tool.description.length, tool.name).toBeGreaterThan(0);
		}
	});
});
